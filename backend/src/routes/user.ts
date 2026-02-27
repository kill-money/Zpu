import { Router, Request, Response } from 'express';
import User from '../models/User';
import { Loan } from '../models/Loan';
import { Application } from '../models/Application';
import { Rate } from '../models/Rate';
import { authenticateToken } from '../middleware/auth';
import { applicationRateLimiter, creditCheckRateLimiter } from '../middleware/rateLimiter';
import { fcraCompliance, tilaCompliance, ssnCompliance, bankAccountCompliance, adverseActionCompliance } from '../middleware/compliance';
import { asyncErrorHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { ValidationHelpers, createValidationSchema } from '../validation/schemas';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// GET /api/user/dashboard - 用户仪表板
router.get('/dashboard',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    
    // 获取用户基本信息
    const user = await User.findById(userId)
      .select('-password -ssn');
    
    if (!user) {
      throw new NotFoundError('User');
    }

    // 获取用户的贷款统计
    const [activeLoans, totalLoans, pendingApplications] = await Promise.all([
      Loan.countDocuments({ userId, status: { $in: ['approved', 'funded', 'active'] } }),
      Loan.countDocuments({ userId }),
      Application.countDocuments({ userId, status: 'pending' })
    ]);

    // 获取最新的3个贷款
    const recentLoans = await Loan.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('amount status interestRate term createdAt');

    // 获取当前利率
    const currentRates = await Rate.findOne({ isActive: true })
      .select('personalLoan autoLoan homeLoan');

    const t = req.t || ((key: string) => key);

    res.json({
      success: true,
      data: {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          creditScore: user.creditScore || 'N/A',
          memberSince: user.createdAt
        },
        statistics: {
          activeLoans,
          totalLoans,
          pendingApplications,
          totalBorrowed: recentLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0)
        },
        recentLoans,
        currentRates: currentRates || {
          personalLoan: { min: 5.99, max: 35.99 },
          autoLoan: { min: 2.49, max: 22.99 },
          homeLoan: { min: 3.25, max: 12.25 }
        }
      },
      message: t('dashboard.loaded_successfully')
    });
  })
);

// POST /api/user/apply - 提交贷款申请  
router.post('/apply',
  applicationRateLimiter,
  fcraCompliance,
  tilaCompliance,
  asyncErrorHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    const applicationData = req.body;

    // 验证申请数据
    const schemas = createValidationSchema(req);
    const validatedData = schemas.loanApplication().parse(applicationData);

    // 检查是否有pending的申请
    const existingApplication = await Application.findOne({
      userId,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingApplication) {
      throw new ValidationError('You already have a pending application');
    }

    // 创建新申请
    const application = new Application({
      ...validatedData,
      userId,
      submittedAt: new Date(),
      status: 'pending'
    });

    await application.save();

    // Socket实时通知管理端 (动态导入避免循环依赖)
    const { io } = await import('../server');
    io.to('admin-room').emit('loan:submitted', {
      applicationId: application._id,
      userId,
      amount: validatedData.amount,
      purpose: validatedData.purpose,
      submittedAt: application.submittedAt
    });

    const t = req.t || ((key: string) => key);

    res.status(201).json({
      success: true,
      data: {
        applicationId: application._id,
        status: application.status,
        submittedAt: application.submittedAt
      },
      message: t('application.submitted_successfully')
    });
  })
);

// GET /api/user/loans - 获取用户所有贷款
router.get('/loans',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // 构建查询条件
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    // 构建排序
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // 分页查询
    const skip = (Number(page) - 1) * Number(limit);
    
    const [loans, totalCount] = await Promise.all([
      Loan.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('applicationId', 'purpose')
        .select('-userId'),
      Loan.countDocuments(query)
    ]);

    const t = req.t || ((key: string) => key);

    res.json({
      success: true,
      data: {
        loans,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalCount,
          hasNextPage: skip + loans.length < totalCount,
          hasPrevPage: Number(page) > 1
        }
      },
      message: t('loans.fetched_successfully')
    });
  })
);

// GET /api/user/rates - 获取当前利率
router.get('/rates',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { loanType, creditScore, amount } = req.query;
    
    // 获取基础利率
    const baseRates = await Rate.findOne({ isActive: true });
    
    if (!baseRates) {
      // 返回默认利率
      const defaultRates = {
        personalLoan: { min: 5.99, max: 35.99 },
        autoLoan: { min: 2.49, max: 22.99 },
        homeLoan: { min: 3.25, max: 12.25 }
      };
      
      return res.json({
        success: true,
        data: { rates: defaultRates },
        message: 'Using default rates'
      });
    }

    // 如果提供了信用分数，计算个性化利率
    let personalizedRates = baseRates.toObject();
    
    if (creditScore && loanType) {
      const score = Number(creditScore);
      const loanAmount = Number(amount) || 50000;
      
      // 基于信用分数调整利率
      personalizedRates = calculatePersonalizedRate(
        baseRates,
        loanType as string,
        score,
        loanAmount
      );
    }

    const t = req.t || ((key: string) => key);

    res.json({
      success: true,
      data: {
        rates: personalizedRates,
        lastUpdated: baseRates.updatedAt
      },
      message: t('rates.fetched_successfully')
    });
  })
);

// 计算个性化利率的辅助方法
function calculatePersonalizedRate(baseRates: any, loanType: string, creditScore: number, amount: number) {
  const rates = baseRates[loanType];
  if (!rates) return baseRates;

  let adjustedRate;
  
  // 基于信用分数分层
  if (creditScore >= 750) {
    adjustedRate = rates.min + (rates.max - rates.min) * 0.1; // 最低10%范围
  } else if (creditScore >= 700) {
    adjustedRate = rates.min + (rates.max - rates.min) * 0.3; // 低30%范围
  } else if (creditScore >= 650) {
    adjustedRate = rates.min + (rates.max - rates.min) * 0.5; // 中等范围
  } else if (creditScore >= 600) {
    adjustedRate = rates.min + (rates.max - rates.min) * 0.7; // 较高范围
  } else {
    adjustedRate = rates.min + (rates.max - rates.min) * 0.9; // 最高90%范围
  }

  return {
    ...baseRates,
    [loanType]: {
      ...rates,
      personalizedRate: Math.round(adjustedRate * 100) / 100
    }
  };
}

// Get user profile
router.get('/profile',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.userId)
      .select('-password -ssn -bankAccount.accountNumber -bankAccount.routingNumber')
      .populate({
        path: 'applications',
        select: 'status amount purpose createdAt'
      });
    
    if (!user) {
      throw new NotFoundError('User');
    }

    // Mask sensitive data for response
    const userResponse = {
      ...user.toObject(),
      ssn: user.ssn ? `***-**-${user.ssn.slice(-4)}` : undefined,
      bankAccount: user.bankAccount ? {
        ...user.bankAccount,
        accountNumber: user.bankAccount.accountNumber ? `****${user.bankAccount.accountNumber.slice(-4)}` : undefined,
        routingNumber: user.bankAccount.routingNumber ? `****${user.bankAccount.routingNumber.slice(-4)}` : undefined
      } : undefined
    };

    res.json({
      success: true,
      user: userResponse
    });
  })
);

// Update user profile
router.put('/profile',
  ssnCompliance,
  asyncErrorHandler(async (req: Request, res: Response) => {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'address', 
      'employment', 'income', 'expenses'
    ];
    
    const updates: any = {};
    
    // Filter allowed updates
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -ssn -bankAccount.accountNumber -bankAccount.routingNumber');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  })
);

// Update bank account information
router.put('/bank-account',
  bankAccountCompliance,
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { bankName, accountType, accountNumber, routingNumber } = req.body;

    if (!bankName || !accountType || !accountNumber || !routingNumber) {
      throw new ValidationError('All bank account fields are required');
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new NotFoundError('User');
    }

    // Update bank account (will be encrypted by model middleware)
    user.bankAccount = {
      bankName,
      accountType,
      accountNumber,
      routingNumber,
      verified: false,
      addedDate: new Date()
    };

    await user.save();

    // Return masked account info
    res.json({
      success: true,
      message: 'Bank account information updated',
      bankAccount: {
        bankName: user.bankAccount.bankName,
        accountType: user.bankAccount.accountType,
        accountNumber: `****${accountNumber.slice(-4)}`,
        routingNumber: `****${routingNumber.slice(-4)}`,
        verified: user.bankAccount.verified
      }
    });
  })
);

// Get user's loan applications
router.get('/applications',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const applications = await Application.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('loan', 'status amount interestRate term monthlyPayment');

    const total = await Application.countDocuments({ user: req.userId });

    res.json({
      success: true,
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Create new loan application
router.post('/applications',
  applicationRateLimiter,
  fcraCompliance('pre_adverse'),
  tilaCompliance('initial'),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const {
      amount,
      purpose,
      employment,
      income,
      expenses,
      assets,
      debts,
      preferredTerm
    } = req.body;

    // Validate loan amount
    if (!amount || amount < 1000 || amount > 50000) {
      throw new ValidationError('Loan amount must be between $1,000 and $50,000');
    }

    // Check if user has an existing pending application
    const existingApplication = await Application.findOne({
      user: req.userId,
      status: { $in: ['pending', 'under_review', 'approved'] }
    });

    if (existingApplication) {
      throw new ValidationError('You already have a pending loan application');
    }

    // Get user info
    const user = await User.findById(req.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Create application
    const application = new Application({
      user: req.userId,
      amount,
      purpose,
      loanDetails: {
        requestedAmount: amount,
        purpose,
        preferredTerm: preferredTerm || 24
      },
      applicantInfo: {
        employment,
        income,
        expenses,
        assets,
        debts,
        creditScore: user.creditInfo?.score
      },
      status: 'pending',
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await application.save();

    // Create associated loan record
    const loan = new Loan({
      user: req.userId,
      application: application._id,
      amount,
      purpose,
      term: preferredTerm || 24,
      status: 'pending',
      applicationDate: new Date()
    });

    await loan.save();

    // Link loan to application
    application.loan = loan._id;
    await application.save();

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      application: {
        id: application._id,
        amount: application.amount,
        purpose: application.purpose,
        status: application.status,
        submittedAt: application.submittedAt
      },
      loan: {
        id: loan._id,
        status: loan.status
      },
      nextSteps: [
        'Your application is being reviewed',
        'You will receive updates via email and SMS',
        'Review typically takes 1-2 business days'
      ]
    });
  })
);

// Get specific application
router.get('/applications/:applicationId',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const application = await Application.findOne({
      _id: req.params.applicationId,
      user: req.userId
    }).populate('loan', 'status amount interestRate term monthlyPayment decision');

    if (!application) {
      throw new NotFoundError('Application');
    }

    res.json({
      success: true,
      application
    });
  })
);

// Get user's loans
router.get('/loans',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const query: any = { user: req.userId };
    if (status) {
      query.status = status;
    }

    const loans = await Loan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('application', 'purpose submittedAt')
      .populate('payments', 'amount dueDate status paidDate');

    const total = await Loan.countDocuments(query);

    res.json({
      success: true,
      loans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get specific loan details
router.get('/loans/:loanId',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const loan = await Loan.findOne({
      _id: req.params.loanId,
      user: req.userId
    }).populate('application', 'purpose submittedAt applicantInfo')
     .populate('payments', 'amount dueDate status paidDate paymentMethod');

    if (!loan) {
      throw new NotFoundError('Loan');
    }

    res.json({
      success: true,
      loan
    });
  })
);

// Accept loan terms (for approved loans)
router.post('/loans/:loanId/accept',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const loan = await Loan.findOne({
      _id: req.params.loanId,
      user: req.userId,
      status: 'approved'
    });

    if (!loan) {
      throw new NotFoundError('Approved loan');
    }

    // Update loan status
    loan.status = 'accepted';
    loan.acceptedAt = new Date();
    loan.fundingRequested = true;

    await loan.save();

    // Generate payment schedule
    await loan.generatePaymentSchedule();

    res.json({
      success: true,
      message: 'Loan terms accepted successfully',
      loan: {
        id: loan._id,
        status: loan.status,
        acceptedAt: loan.acceptedAt,
        firstPaymentDate: loan.firstPaymentDate
      },
      nextSteps: [
        'Funds will be deposited within 1-2 business days',
        'First payment due date has been scheduled',
        'You will receive payment reminders via email and SMS'
      ]
    });
  })
);

// Request credit check (with FCRA compliance)
router.post('/credit-check',
  creditCheckRateLimiter,
  fcraCompliance('investigative_consumer'),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if user has given FCRA consent
    if (!user.consents?.fcraAuthorization) {
      throw new ValidationError('FCRA authorization required for credit check', {
        complianceType: 'FCRA',
        required: 'fcraAuthorization'
      });
    }

    // Simulate credit check (in real app would call credit bureau API)
    const creditScore = Math.floor(Math.random() * (850 - 300 + 1)) + 300;
    const creditReportDate = new Date();

    // Update user credit info
    user.creditInfo = {
      score: creditScore,
      reportDate: creditReportDate,
      bureau: 'Experian',
      history: user.creditInfo?.history || []
    };

    user.creditInfo.history!.push({
      date: creditReportDate,
      score: creditScore,
      bureau: 'Experian',
      reason: 'loan_application'
    });

    await user.save();

    res.json({
      success: true,
      message: 'Credit check completed',
      creditInfo: {
        score: creditScore,
        reportDate: creditReportDate,
        bureau: 'Experian',
        scoreRange: {
          excellent: '750-850',
          good: '670-749',
          fair: '580-669', 
          poor: '300-579'
        },
        scoreCategory: getCreditScoreCategory(creditScore)
      },
      fcraNotice: 'This credit check was performed with your authorization under the Fair Credit Reporting Act.'
    });
  })
);

// Update notification preferences
router.put('/notifications',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { email, sms, push } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'preferences.notifications.email': email !== undefined ? email : true,
          'preferences.notifications.sms': sms !== undefined ? sms : true,
          'preferences.notifications.push': push !== undefined ? push : true
        }
      },
      { new: true }
    ).select('preferences.notifications');

    res.json({
      success: true,
      message: 'Notification preferences updated',
      notifications: user?.preferences?.notifications
    });
  })
);

// Deactivate account
router.delete('/account',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { reason, feedback } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check for active loans
    const activeLoans = await Loan.find({
      user: req.userId,
      status: { $in: ['approved', 'funded', 'active'] }
    });

    if (activeLoans.length > 0) {
      throw new ValidationError('Cannot deactivate account with active loans', {
        activeLoans: activeLoans.length
      });
    }

    // Deactivate user
    user.isActive = false;
    user.status = 'deactivated';
    user.deactivatedAt = new Date();
    user.deactivationReason = reason;

    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  })
);

// Helper function to categorize credit scores
function getCreditScoreCategory(score: number): string {
  if (score >= 750) return 'excellent';
  if (score >= 670) return 'good';
  if (score >= 580) return 'fair';
  return 'poor';
}

export default router;