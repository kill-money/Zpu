import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  submitLoanApplication, 
  getApplicationStatus, 
  getUserApplications,
  acceptLoanTerms,
  uploadDocuments,
  calculateLoanOptions,
  getCurrentRates,
  verifyBankAccount,
  verifyMicroDeposits,
  initiateFunding,
  getPaymentSchedule,
  makePayment,
  getCreditReport,
  updateIncomeVerification,
  checkUnderwritingStatus,
  requestCreditIncrease,
  getApplicationDocuments,
  scheduleAutoPay,
  updateBankAccount,
  getLoanBalance,
  getPaymentHistory
} from '../controllers/loanController';
import { 
  authenticateToken, 
  requireIdentityVerification, 
  requireFCRAConsent,
  requireMFA,
  requireTrustedDevice,
  sensitiveOperationRateLimit,
  logAPIAccess
} from '../middleware/auth';

const router = express.Router();

// Apply API access logging to all loan routes
router.use(logAPIAccess);

// Rate limiting for loan applications (prevent spam applications)
const loanApplicationRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Maximum 3 applications per day per user
  message: {
    error: 'Too many loan applications submitted. Please try again tomorrow.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip || 'unknown' // Rate limit by user if authenticated
});

// Rate limiting for credit report pulls  
const creditReportRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Maximum 5 credit pulls per day
  message: {
    error: 'Daily credit report limit reached. Please try again tomorrow.',
    code: 'CREDIT_REPORT_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => req.userId || req.ip || 'unknown'
});

// PUBLIC ROUTES (no authentication required)

// Get current interest rates
router.get('/rates', getCurrentRates);

// Loan calculator (pre-qualification estimate)
router.post('/calculate', calculateLoanOptions);

// LOAN APPLICATION ROUTES (require authentication and identity verification)

// Submit new loan application (triggers real credit pull and bank verification)
router.post('/applications', 
  authenticateToken, 
  requireIdentityVerification,
  requireFCRAConsent,
  loanApplicationRateLimit, 
  submitLoanApplication
);

// Get specific application status
router.get('/applications/:applicationNumber', 
  authenticateToken, 
  getApplicationStatus
);

// Get all user's loan applications
router.get('/applications', 
  authenticateToken, 
  getUserApplications
);

// Get application documents
router.get('/applications/:applicationNumber/documents',
  authenticateToken,
  getApplicationDocuments
);

// Upload additional documentation (for conditional approvals)
router.post('/applications/:applicationNumber/documents', 
  authenticateToken, 
  uploadDocuments
);

// CREDIT AND VERIFICATION ROUTES

// Get full credit report (requires FCRA consent)
router.get('/credit-report',
  authenticateToken,
  requireIdentityVerification,
  requireFCRAConsent,
  creditReportRateLimit,
  getCreditReport
);

// Update income verification
router.post('/income-verification',
  authenticateToken,
  requireIdentityVerification,
  updateIncomeVerification
);

// Check underwriting status
router.get('/applications/:applicationNumber/underwriting',
  authenticateToken,
  checkUnderwritingStatus
);

// BANK VERIFICATION ROUTES

// Initiate bank account verification (via Plaid)
router.post('/verify-bank-account', 
  authenticateToken,
  requireIdentityVerification,
  verifyBankAccount
);

// Verify micro-deposit amounts (alternative to Plaid)
router.post('/verify-micro-deposits', 
  authenticateToken,
  verifyMicroDeposits
);

// LOAN ACCEPTANCE AND FUNDING (high-security operations)

// Accept loan terms after approval
router.post('/applications/:applicationNumber/accept', 
  authenticateToken,
  requireIdentityVerification,
  requireMFA,
  requireTrustedDevice,
  acceptLoanTerms
);

// Initiate loan funding
router.post('/applications/:applicationNumber/fund', 
  authenticateToken,
  requireMFA,
  requireTrustedDevice,
  initiateFunding
);

// LOAN SERVICING ROUTES (for active loans)

// Get payment schedule
router.get('/applications/:applicationNumber/payment-schedule', 
  authenticateToken, 
  getPaymentSchedule
);

// Get current loan balance
router.get('/applications/:applicationNumber/balance',
  authenticateToken,
  getLoanBalance
);

// Get payment history
router.get('/applications/:applicationNumber/payment-history',
  authenticateToken,
  getPaymentHistory
);

// Make a loan payment
router.post('/applications/:applicationNumber/make-payment', 
  authenticateToken,
  requireTrustedDevice,
  sensitiveOperationRateLimit(10, 60), // 10 payments per hour max
  makePayment
);

// Set up automatic payments
router.post('/applications/:applicationNumber/auto-pay',
  authenticateToken,
  requireMFA,
  requireTrustedDevice,
  scheduleAutoPay
);

// Update bank account for payments
router.put('/applications/:applicationNumber/bank-account',
  authenticateToken,
  requireMFA,
  requireTrustedDevice,
  updateBankAccount
);

// ACCOUNT MANAGEMENT ROUTES

// Request credit limit increase
router.post('/applications/:applicationNumber/credit-increase',
  authenticateToken,
  requireIdentityVerification,
  requireFCRAConsent,
  sensitiveOperationRateLimit(1, 1440), // 1 request per day
  requestCreditIncrease
);

export default router;