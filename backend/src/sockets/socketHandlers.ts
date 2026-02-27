import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import User from '../models/User';
import { Loan } from '../models/Loan';
import { ComplianceLog } from '../models/ComplianceLog';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Initialize all socket event handlers
export const initializeSocketHandlers = (io: Server, redis: Redis) => {
  // Authentication middleware for sockets
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Get user from database
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }
      
      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      
      // Log socket connection for compliance
      await logSocketEvent({
        userId: user._id.toString(),
        eventType: 'connection',
        description: 'Socket connection established',
        socketId: socket.id,
        ipAddress: socket.handshake.address
      });
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
  
  // Handle new connections
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User ${socket.userId} connected via Socket.io (${socket.id})`);
    
    // Join user-specific room for personal notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      
      // Join admin room if user is admin
      if (socket.userRole === 'admin') {
        socket.join('admin');
      }
    }
    
    // Set up event handlers
    setupLoanEventHandlers(socket, io, redis);
    setupAdminEventHandlers(socket, io, redis);
    setupNotificationHandlers(socket, io, redis);
    setupComplianceEventHandlers(socket, io, redis);
    
    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`❌ User ${socket.userId} disconnected: ${reason}`);
      
      // Log disconnection for compliance
      if (socket.userId) {
        await logSocketEvent({
          userId: socket.userId,
          eventType: 'disconnection',
          description: `Socket disconnection: ${reason}`,
          socketId: socket.id,
          ipAddress: socket.handshake.address
        });
      }
    });
    
    // Handle errors
    socket.on('error', async (error) => {
      console.error('Socket error:', error);
      
      if (socket.userId) {
        await logSocketEvent({
          userId: socket.userId,
          eventType: 'error',
          description: `Socket error: ${error.message}`,
          socketId: socket.id,
          ipAddress: socket.handshake.address
        });
      }
    });
  });
  
  console.log('🔥 Socket.io handlers initialized');
};

// Loan-related event handlers
const setupLoanEventHandlers = (socket: AuthenticatedSocket, io: Server, redis: Redis) => {
  // User requests loan status update
  socket.on('loan:getStatus', async (data) => {
    try {
      if (!socket.userId) return;
      
      const loans = await Loan.find({ 
        user: socket.userId,
        status: { $in: ['pending', 'under_review', 'approved'] }
      }).select('_id status amount term interestRate monthlyPayment createdAt updatedAt');
      
      socket.emit('loan:statusUpdate', {
        success: true,
        loans
      });
    } catch (error) {
      socket.emit('loan:error', {
        success: false,
        message: 'Failed to get loan status'
      });
    }
  });
  
  // User subscribes to specific loan updates
  socket.on('loan:subscribe', async (loanId) => {
    try {
      if (!socket.userId) return;
      
      // Verify user owns this loan
      const loan = await Loan.findOne({ _id: loanId, user: socket.userId });
      
      if (loan) {
        socket.join(`loan:${loanId}`);
        
        socket.emit('loan:subscribed', {
          success: true,
          loanId,
          message: 'Subscribed to loan updates'
        });
      } else {
        socket.emit('loan:error', {
          success: false,
          message: 'Loan not found or access denied'
        });
      }
    } catch (error) {
      socket.emit('loan:error', {
        success: false,
        message: 'Subscription failed'
      });
    }
  });
  
  // User unsubscribes from loan updates
  socket.on('loan:unsubscribe', (loanId) => {
    socket.leave(`loan:${loanId}`);
    
    socket.emit('loan:unsubscribed', {
      success: true,
      loanId,
      message: 'Unsubscribed from loan updates'
    });
  });
};

// Admin-specific event handlers
const setupAdminEventHandlers = (socket: AuthenticatedSocket, io: Server, redis: Redis) => {
  // Only allow admin users
  if (socket.userRole !== 'admin') return;
  
  // Admin approves a loan
  socket.on('admin:approveLoan', async (data) => {
    try {
      const { loanId, interestRate, term, notes } = data;
      
      const loan = await Loan.findById(loanId).populate('user');
      
      if (!loan) {
        return socket.emit('admin:error', {
          success: false,
          message: 'Loan not found'
        });
      }
      
      // Update loan status
      loan.status = 'approved';
      loan.interestRate = interestRate;
      loan.term = term;
      loan.decision.approvedBy = socket.userId as any;
      loan.decision.approvedAt = new Date();
      
      // Calculate payment details
      loan.monthlyPayment = loan.calculateMonthlyPayment();
      loan.totalPayment = loan.calculateTotalPayment();
      
      await loan.save();
      
      // Real-time notification to user
      io.to(`user:${loan.user._id}`).emit('loan:approved', {
        loanId: loan._id,
        amount: loan.amount,
        interestRate: loan.interestRate,
        term: loan.term,
        monthlyPayment: loan.monthlyPayment,
        approvedAt: loan.decision.approvedAt,
        message: 'Congratulations! Your loan has been approved.'
      });
      
      // Notify admin clients
      io.to('admin').emit('admin:loanApproved', {
        loanId: loan._id,
        userId: loan.user._id,
        amount: loan.amount,
        approvedBy: socket.userId,
        approvedAt: loan.decision.approvedAt
      });
      
      // Log compliance event
      await logLoanDecisionEvent({
        loan: loan._id.toString(),
        user: (loan.user as any)._id?.toString() || loan.user.toString(),
        admin: socket.userId!,
        decision: 'approved',
        interestRate,
        term,
        notes
      });
      
      socket.emit('admin:success', {
        success: true,
        message: 'Loan approved successfully',
        loanId: loan._id
      });
      
    } catch (error) {
      socket.emit('admin:error', {
        success: false,
        message: 'Failed to approve loan'
      });
    }
  });
  
  // Admin rejects a loan
  socket.on('admin:rejectLoan', async (data) => {
    try {
      const { loanId, reasonCodes, notes } = data;
      
      const loan = await Loan.findById(loanId).populate('user');
      
      if (!loan) {
        return socket.emit('admin:error', {
          success: false,
          message: 'Loan not found'
        });
      }
      
      // Update loan status
      loan.status = 'rejected';
      loan.decision.rejectedBy = socket.userId as any;
      loan.decision.rejectedAt = new Date();
      loan.decision.rejectionReason = notes;
      loan.decision.rejectionCode = reasonCodes.join(', ');
      loan.decision.adverseActionRequired = true;
      
      await loan.save();
      
      // Real-time notification to user
      io.to(`user:${loan.user._id}`).emit('loan:rejected', {
        loanId: loan._id,
        amount: loan.amount,
        rejectedAt: loan.decision.rejectedAt,
        reason: 'We were unable to approve your loan application at this time.',
        nextSteps: 'You may reapply in 30 days or contact customer service.'
      });
      
      // Notify admin clients
      io.to('admin').emit('admin:loanRejected', {
        loanId: loan._id,
        userId: loan.user._id,
        amount: loan.amount,
        rejectedBy: socket.userId,
        rejectedAt: loan.decision.rejectedAt,
        reasonCodes
      });
      
      // Log compliance event (ECOA adverse action)
      await logLoanDecisionEvent({
        loan: loan._id.toString(),
        user: (loan.user as any)._id?.toString() || loan.user.toString(),
        admin: socket.userId!,
        decision: 'rejected',
        reasonCodes,
        notes
      });
      
      socket.emit('admin:success', {
        success: true,
        message: 'Loan rejected - adverse action notice will be sent',
        loanId: loan._id
      });
      
    } catch (error) {
      socket.emit('admin:error', {
        success: false,
        message: 'Failed to reject loan'
      });
    }
  });
  
  // Admin gets pending loans for review
  socket.on('admin:getPendingLoans', async () => {
    try {
      const pendingLoans = await Loan.find({
        status: { $in: ['pending', 'under_review'] }
      }).populate('user', 'firstName lastName email phone creditInfo')
        .sort({ createdAt: 1 })
        .limit(50);
      
      socket.emit('admin:pendingLoans', {
        success: true,
        loans: pendingLoans,
        count: pendingLoans.length
      });
      
    } catch (error) {
      socket.emit('admin:error', {
        success: false,
        message: 'Failed to get pending loans'
      });
    }
  });
  
  // Admin subscribes to loan queue updates
  socket.on('admin:subscribeLoanQueue', () => {
    socket.join('admin:loanQueue');
    
    socket.emit('admin:subscribed', {
      success: true,
      queue: 'loanQueue',
      message: 'Subscribed to loan queue updates'
    });
  });
};

// Notification event handlers
const setupNotificationHandlers = (socket: AuthenticatedSocket, io: Server, redis: Redis) => {
  // User marks notification as read
  socket.on('notification:markRead', async (notificationId) => {
    try {
      // Update notification status in Redis
      await redis.hset(
        `user:${socket.userId}:notifications`,
        notificationId,
        JSON.stringify({ read: true, readAt: new Date() })
      );
      
      socket.emit('notification:marked', {
        success: true,
        notificationId
      });
      
    } catch (error) {
      socket.emit('notification:error', {
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  });
  
  // User requests notification history
  socket.on('notification:getHistory', async () => {
    try {
      const notifications = await redis.hgetall(`user:${socket.userId}:notifications`);
      
      const formattedNotifications = Object.entries(notifications).map(([id, data]) => {
        return { id, ...JSON.parse(data) };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      socket.emit('notification:history', {
        success: true,
        notifications: formattedNotifications
      });
      
    } catch (error) {
      socket.emit('notification:error', {
        success: false,
        message: 'Failed to get notification history'
      });
    }
  });
};

// Compliance event handlers
const setupComplianceEventHandlers = (socket: AuthenticatedSocket, io: Server, redis: Redis) => {
  // Track user activity for compliance
  socket.on('user:activity', async (activityData) => {
    try {
      if (!socket.userId) return;
      
      await logSocketEvent({
        userId: socket.userId,
        eventType: 'user_activity',
        description: `User activity: ${activityData.type}`,
        socketId: socket.id,
        ipAddress: socket.handshake.address,
        details: activityData
      });
      
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  });
};

// Helper functions

// Send real-time notification to user
export const sendUserNotification = (io: Server, userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date(),
    id: generateNotificationId()
  });
};

// Send notification to all admin users
export const sendAdminNotification = (io: Server, notification: any) => {
  io.to('admin').emit('admin:notification', {
    ...notification,
    timestamp: new Date(),
    id: generateNotificationId()
  });
};

// Broadcast loan status change
export const broadcastLoanStatusChange = (io: Server, loan: any) => {
  // Notify user
  io.to(`user:${loan.user}`).emit('loan:statusChanged', {
    loanId: loan._id,
    status: loan.status,
    updatedAt: loan.updatedAt,
    statusDetails: getLoanStatusMessage(loan.status)
  });
  
  // Notify admins
  io.to('admin').emit('admin:loanStatusChanged', {
    loanId: loan._id,
    userId: loan.user,
    status: loan.status,
    updatedAt: loan.updatedAt
  });
  
  // Notify subscribers to specific loan
  io.to(`loan:${loan._id}`).emit('loan:update', {
    loan: {
      _id: loan._id,
      status: loan.status,
      updatedAt: loan.updatedAt
    }
  });
};

// Get user-friendly status message
const getLoanStatusMessage = (status: string): string => {
  const messages = {
    'pending': 'Your application is being reviewed.',
    'under_review': 'Your application is currently under review by our underwriting team.',
    'approved': 'Congratulations! Your loan has been approved.',
    'funded': 'Your loan has been funded and deposited to your account.',
    'rejected': 'Your loan application was not approved at this time.',
    'cancelled': 'Your loan application has been cancelled.'
  };
  
  return messages[status as keyof typeof messages] || 'Status updated.';
};

// Generate unique notification ID
const generateNotificationId = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Log socket events for compliance
const logSocketEvent = async (params: {
  userId: string;
  eventType: string;
  description: string;
  socketId: string;
  ipAddress: string;
  details?: any;
}) => {
  try {
    await ComplianceLog.create({
      user: params.userId,
      complianceType: 'privacy',
      event: {
        type: 'data_access',
        description: params.description,
        outcome: 'success',
        details: {
          eventType: params.eventType,
          socketId: params.socketId,
          ...params.details
        }
      },
      systemInfo: {
        ipAddress: params.ipAddress,
        source: 'websocket'
      },
      regulatory: {
        jurisdiction: ['federal'],
        retentionRequired: true,
        retentionPeriodYears: 3,
        subjectToAudit: true,
        sensitivityLevel: 'internal'
      }
    });
  } catch (error) {
    console.error('Error logging socket event:', error);
  }
};

// Log loan decision events for ECOA compliance
const logLoanDecisionEvent = async (params: {
  loan: string;
  user: string;
  admin: string;
  decision: 'approved' | 'rejected';
  reasonCodes?: string[];
  interestRate?: number;
  term?: number;
  notes?: string;
}) => {
  try {
    await ComplianceLog.create({
      user: params.user,
      loan: params.loan,
      admin: params.admin,
      complianceType: 'ecoa',
      event: {
        type: params.decision === 'approved' ? 'credit_approved' : 'adverse_action',
        description: `Loan ${params.decision} by admin`,
        outcome: 'success',
        details: {
          decision: params.decision,
          reasonCodes: params.reasonCodes,
          interestRate: params.interestRate,
          term: params.term,
          notes: params.notes
        }
      },
      ecoa: {
        actionTaken: params.decision === 'approved' ? 'approved' : 'denied',
        reasonCodes: params.reasonCodes || [],
        noticeProvided: params.decision === 'rejected',
        noticeProvidedDate: params.decision === 'rejected' ? new Date() : undefined
      },
      systemInfo: {
        source: 'websocket'
      },
      regulatory: {
        jurisdiction: ['federal'],
        retentionRequired: true,
        retentionPeriodYears: 25, // ECOA requires 25-month retention
        subjectToAudit: true,
        sensitivityLevel: 'confidential'
      }
    });
  } catch (error) {
    console.error('Error logging loan decision:', error);
  }
};