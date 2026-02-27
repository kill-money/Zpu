import { Request, Response } from 'express';
import User from '../models/User';
import { IUser } from '../models/User';
import LoanApplication from '../models/LoanApplication';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';

// Socket.IO instance for real-time updates
let io: SocketIOServer;

export const setSocketIO = (socketInstance: SocketIOServer) => {
  io = socketInstance;
};

// Broadcast events to admin clients
const broadcastToAdmins = (event: string, data: any) => {
  if (io) {
    io.to('admin-room').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

// Dashboard Statistics
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get key metrics in parallel
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalApplications,
      pendingApplications,
      approvedApplications,
      totalFundedAmount,
      recentActivity
    ] = await Promise.all([
      User.countDocuments({ audit: { accountStatus: { $ne: 'closed' } } }),
      User.countDocuments({ audit: { accountStatus: 'active' } }),
      User.countDocuments({
        audit: { 
          createdAt: { 
            $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) 
          }
        }
      }),
      LoanApplication.countDocuments(),
      LoanApplication.countDocuments({ status: { $in: ['submitted', 'processing', 'underwriting'] } }),
      LoanApplication.countDocuments({ status: 'approved' }),
      LoanApplication.aggregate([
        { $match: { status: 'funded' } },
        { $group: { _id: null, total: { $sum: '$loanAmount' } } }
      ]),
      getRecentActivity(30)
    ]);

    // User status breakdown
    const userStatusBreakdown = await User.aggregate([
      {
        $group: {
          _id: '$audit.accountStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Application status breakdown
    const applicationStatusBreakdown = await LoanApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$loanAmount' }
        }
      }
    ]);

    // Registration trends (last 30 days)
    const registrationTrends = await User.aggregate([
      {
        $match: {
          'audit.createdAt': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$audit.createdAt' },
            month: { $month: '$audit.createdAt' },
            day: { $dayOfMonth: '$audit.createdAt' }
          },
          registrations: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          newUsersToday,
          totalApplications,
          pendingApplications,
          approvedApplications,
          totalFundedAmount: totalFundedAmount[0]?.total || 0
        },
        breakdowns: {
          userStatus: userStatusBreakdown,
          applicationStatus: applicationStatusBreakdown
        },
        trends: {
          registrations: registrationTrends
        },
        recentActivity
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
};

// Get all users with filtering, pagination, and search
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'audit.createdAt',
      sortOrder = 'desc',
      identityVerified = '',
      riskLevel = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    const searchQuery: any = {};

    if (search) {
      searchQuery.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      searchQuery['audit.accountStatus'] = status;
    }

    if (identityVerified !== '') {
      searchQuery['identityVerification.status'] = identityVerified === 'true' ? 'verified' : { $ne: 'verified' };
    }

    if (riskLevel) {
      searchQuery['audit.riskLevel'] = riskLevel;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      User.find(searchQuery)
        .select('-ssn -bankAccounts.accountNumber') // Exclude sensitive data
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(searchQuery)
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((user: any) => ({
          ...user,
          maskedSSN: 'XXX-XX-' + (user.ssn ? user.ssn.slice(-4) : 'XXXX'),
          maskedPhone: user.phone ? `***-***-${user.phone.slice(-4)}` : '',
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      code: 'FETCH_USERS_ERROR'
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    const user = await User.findById(userId)
      .select('-ssn -bankAccounts.accountNumber') // Exclude sensitive data
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get user's applications
    const applications = await LoanApplication.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          maskedSSN: 'XXX-XX-' + (user.ssn ? String(user.ssn).slice(-4) : 'XXXX')
        },
        applications
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      code: 'FETCH_USER_ERROR'
    });
  }
};

// Create new user (admin only)
export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      dateOfBirth,
      address,
      role = 'customer'
    } = req.body;

    // Validation
    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing',
        code: 'MISSING_FIELDS',
        required: ['email', 'password', 'fullName', 'phone']
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Phone format validation (US phone numbers)
    const phoneRegex = /^[\+]?[1]?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        code: 'INVALID_PHONE'
      });
    }

    // Check uniqueness: email + phone
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone.replace(/\D/g, '') }
      ]
    });

    if (existingUser) {
      const conflictField = existingUser.email === email.toLowerCase() ? 'email' : 'phone';
      return res.status(409).json({
        success: false,
        error: `${conflictField} already exists`,
        code: 'DUPLICATE_USER',
        field: conflictField
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      phone: phone.replace(/\D/g, ''), // Store only digits
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      role,
      audit: {
        createdAt: new Date(),
        accountStatus: 'active',
        riskLevel: 'low',
        sanctionsScreening: {
          status: 'clear',
          checkedAt: new Date(),
          nextCheckDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      },
      security: {
        mfaEnabled: false,
        failedLoginAttempts: 0,
        accountLocked: false,
        activeSessions: [],
        trustedDevices: []
      },
      identityVerification: {
        status: 'pending'
      },
      financialProfile: {},
      compliance: {
        fcraConsent: false,
        tcpaConsent: false,
        creditMonitoringConsent: false,
        marketingConsent: false,
        privacyPolicyAccepted: true,
        termsOfServiceAccepted: true,
        lastComplianceUpdate: new Date()
      }
    });

    await newUser.save();

    // Remove sensitive data from response
    const userResponse = newUser.toObject();
    delete (userResponse as any).password;
    delete (userResponse as any).ssn;

    // Real-time broadcast to admin clients
    broadcastToAdmins('user:created', {
      user: {
        ...userResponse,
        maskedSSN: 'XXX-XX-XXXX'
      }
    });

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        message: 'User created successfully'
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      code: 'CREATE_USER_ERROR'
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const adminUser = req.user as IUser;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Validate unique constraints if updating email/phone
    if (updates.email || updates.phone) {
      const duplicateQuery: any = { _id: { $ne: userId } };
      
      if (updates.email) {
        duplicateQuery.email = updates.email.toLowerCase();
      }
      
      if (updates.phone) {
        duplicateQuery.phone = updates.phone.replace(/\D/g, '');
      }

      const orConditions: any[] = [];
      if (updates.email) orConditions.push({ email: updates.email.toLowerCase() });
      if (updates.phone) orConditions.push({ phone: updates.phone.replace(/\D/g, '') });

      const existingUser = orConditions.length > 0 ? await User.findOne({
        $or: orConditions,
        _id: { $ne: userId }
      }) : null;

      if (existingUser) {
        const conflictField = existingUser.email === updates.email?.toLowerCase() ? 'email' : 'phone';
        return res.status(409).json({
          success: false,
          error: `${conflictField} already exists`,
          code: 'DUPLICATE_USER',
          field: conflictField
        });
      }
    }

    // Handle password update
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 12);
    }

    // Clean phone number
    if (updates.phone) {
      updates.phone = updates.phone.replace(/\D/g, '');
    }

    // Clean email
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
    }

    // Add audit trail
    const auditEntry = {
      timestamp: new Date(),
      action: 'USER_UPDATED_BY_ADMIN',
      performedBy: adminUser.email,
      notes: `User updated by admin: ${Object.keys(updates).join(', ')}`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    user.auditTrail.push(auditEntry);
    user.audit.lastActivityAt = new Date();

    // Update user
    Object.assign(user, updates);
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete (userResponse as any).password;
    delete (userResponse as any).ssn;

    // Real-time broadcast to admin clients
    broadcastToAdmins('user:updated', {
      user: {
        ...userResponse,
        maskedSSN: 'XXX-XX-' + (user.ssn ? String(user.ssn).slice(-4) : 'XXXX')
      }
    });

    res.json({
      success: true,
      data: {
        user: userResponse,
        message: 'User updated successfully'
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'UPDATE_USER_ERROR'
    });
  }
};

// Update user status
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const adminUser = req.user as IUser;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    const validStatuses = ['active', 'pending', 'suspended', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
        code: 'INVALID_STATUS',
        validStatuses
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const oldStatus = user.audit.accountStatus;

    // Update status
    user.audit.accountStatus = status;
    user.audit.lastActivityAt = new Date();

    // Add audit trail
    user.auditTrail.push({
      timestamp: new Date(),
      action: 'STATUS_CHANGED_BY_ADMIN',
      performedBy: adminUser.email,
      notes: `Status changed from ${oldStatus} to ${status}${reason ? `: ${reason}` : ''}`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    await user.save();

    // Real-time broadcast to admin clients
    broadcastToAdmins('user:status_changed', {
      userId,
      oldStatus,
      newStatus: status,
      reason,
      changedBy: adminUser.email
    });

    res.json({
      success: true,
      data: {
        userId,
        oldStatus,
        newStatus: status,
        message: 'User status updated successfully'
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      code: 'UPDATE_STATUS_ERROR'
    });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminUser = req.user as IUser;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check for active loans
    const activeApplications = await LoanApplication.countDocuments({
      userId,
      status: { $in: ['submitted', 'processing', 'underwriting', 'approved', 'funded'] }
    });

    if (activeApplications > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete user with active loan applications',
        code: 'ACTIVE_LOANS_EXIST',
        activeApplications
      });
    }

    // Soft delete - change status to closed
    user.audit.accountStatus = 'closed';
    user.audit.lastActivityAt = new Date();

    // Add audit trail
    user.auditTrail.push({
      timestamp: new Date(),
      action: 'ACCOUNT_CLOSED_BY_ADMIN',
      performedBy: adminUser.email,
      notes: `Account closed by admin${reason ? `: ${reason}` : ''}`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    await user.save();

    // Real-time broadcast to admin clients
    broadcastToAdmins('user:deleted', {
      userId,
      reason,
      deletedBy: adminUser.email
    });

    res.json({
      success: true,
      data: {
        userId,
        message: 'User account closed successfully'
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      code: 'DELETE_USER_ERROR'
    });
  }
};

// Reset user password
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const adminUser = req.user as IUser;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.security.lastPasswordChange = new Date();
    user.audit.lastActivityAt = new Date();

    // Clear all active sessions for security
    user.security.activeSessions = [];

    // Add audit trail
    user.auditTrail.push({
      timestamp: new Date(),
      action: 'PASSWORD_RESET_BY_ADMIN',
      performedBy: adminUser.email,
      notes: 'Password reset by admin',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    await user.save();

    res.json({
      success: true,
      data: {
        userId,
        message: 'Password reset successfully'
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
};

// Get recent activity for dashboard
const getRecentActivity = async (days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [recentRegistrations, recentApplications, statusChanges] = await Promise.all([
      User.find({
        'audit.createdAt': { $gte: startDate }
      })
        .select('fullName email audit.createdAt')
        .sort({ 'audit.createdAt': -1 })
        .limit(10)
        .lean(),

      LoanApplication.find({
        createdAt: { $gte: startDate }
      })
        .populate('userId', 'fullName email')
        .select('userId loanAmount status createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Get recent status changes from audit trails
      User.aggregate([
        { $unwind: '$auditTrail' },
        { $match: { 'auditTrail.timestamp': { $gte: startDate } } },
        { $match: { 'auditTrail.action': { $regex: /STATUS|ADMIN/ } } },
        { $sort: { 'auditTrail.timestamp': -1 } },
        { $limit: 10 },
        {
          $project: {
            fullName: 1,
            email: 1,
            action: '$auditTrail.action',
            timestamp: '$auditTrail.timestamp',
            performedBy: '$auditTrail.performedBy',
            notes: '$auditTrail.notes'
          }
        }
      ])
    ]);

    return {
      registrations: recentRegistrations,
      applications: recentApplications,
      statusChanges
    };

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      registrations: [],
      applications: [],
      statusChanges: []
    };
  }
};