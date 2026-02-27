import express from 'express';
import { 
  register, 
  login, 
  logout, 
  refreshToken, 
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  initiateMFA,
  verifyMFA,
  disableMFA,
  updateProfile,
  changePassword,
  provideFCRAConsent,
  renewFCRAConsent,
  initiateIdentityVerification,
  completeIdentityVerification,
  getOFACStatus,
  trustDevice,
  revokeSession,
  getActiveSessions,
  getUserProfile,
  loginRateLimit,
  registrationRateLimit
} from '../controllers/authController';
import { 
  authenticateToken, 
  requireIdentityVerification,
  requireMFA,  
  requireFCRAConsent,
  sensitiveOperationRateLimit,
  logAPIAccess
} from '../middleware/auth';

const router = express.Router();

// Apply API access logging to all auth routes
router.use(logAPIAccess);

// Public routes (no authentication required)
router.post('/register', registrationRateLimit, register);
router.post('/login', loginRateLimit, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/refresh-token', refreshToken);

// Semi-public routes (minimal authentication)
router.post('/resend-verification-email', authenticateToken, resendVerificationEmail);

// FCRA Compliance routes
router.post('/fcra-consent', authenticateToken, provideFCRAConsent);
router.post('/renew-fcra-consent', authenticateToken, renewFCRAConsent);

// Multi-Factor Authentication routes
router.post('/mfa/initiate', authenticateToken, initiateMFA);
router.post('/mfa/verify', authenticateToken, verifyMFA);
router.post('/mfa/disable', authenticateToken, requireMFA, disableMFA);

// Identity Verification routes (required for loan applications)
router.post('/identity-verification/initiate', authenticateToken, initiateIdentityVerification);
router.post('/identity-verification/complete', authenticateToken, completeIdentityVerification);

// OFAC and Sanctions Screening
router.get('/ofac-status', authenticateToken, getOFACStatus);

// Device and Session Management
router.post('/trust-device', authenticateToken, trustDevice);
router.post('/revoke-session/:sessionId', authenticateToken, revokeSession);
router.get('/sessions', authenticateToken, getActiveSessions);

// Protected Profile routes
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateProfile);

// Sensitive operations with rate limiting
router.put('/change-password', 
  authenticateToken, 
  sensitiveOperationRateLimit(3, 60), // 3 attempts per hour
  changePassword
);

// High-security logout (invalidates all sessions)
router.post('/logout', authenticateToken, logout);

export default router;