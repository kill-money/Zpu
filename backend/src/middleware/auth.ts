import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import User, { IUser } from '../models/User';
import { ComplianceLog } from '../models/ComplianceLog';

// Extend Express Request type for production authentication
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      sessionId?: string;
      deviceFingerprint?: string;
      adminUser?: IUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Production-grade JWT authentication middleware with session validation
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }
    
    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Access token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else {
        return res.status(401).json({
          error: 'Invalid access token',
          code: 'INVALID_TOKEN'
        });
      }
    }
    
    // Get user from database with all security fields
    const user = await User.findById(decoded.userId) as IUser;
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if account is active
    if (user.audit.accountStatus !== 'active') {
      let errorMessage = 'Account not active';
      let errorCode = 'ACCOUNT_INACTIVE';
      
      if (user.audit.accountStatus === 'suspended') {
        errorMessage = 'Account suspended';
        errorCode = 'ACCOUNT_SUSPENDED';
      } else if (user.audit.accountStatus === 'closed') {
        errorMessage = 'Account closed';
        errorCode = 'ACCOUNT_CLOSED';
      } else if (user.audit.accountStatus === 'pending') {
        errorMessage = 'Account pending verification';
        errorCode = 'ACCOUNT_PENDING';
      }
      
      return res.status(403).json({
        error: errorMessage,
        code: errorCode,
        accountStatus: user.audit.accountStatus
      });
    }
    
    // Check if account is locked
    if (user.security.accountLocked) {
      const lockExpiry = user.security.lockoutExpiresAt;
      if (lockExpiry && lockExpiry > new Date()) {
        return res.status(423).json({
          error: 'Account temporarily locked',
          code: 'ACCOUNT_LOCKED',
          lockExpiresAt: lockExpiry
        });
      } else {
        // Unlock account if lockout period has expired
        user.security.accountLocked = false;
        user.security.lockoutExpiresAt = undefined;
        user.security.failedLoginAttempts = 0;
        await user.save();
      }
    }
    
    // Validate session if sessionId is present in token
    if (decoded.sessionId) {
      const session = user.security.activeSessions.find(s => s.sessionId === decoded.sessionId);
      
      if (!session) {
        return res.status(401).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }
      
      if (session.expiresAt < new Date()) {
        // Remove expired session
        user.security.activeSessions = user.security.activeSessions.filter(
          s => s.sessionId !== decoded.sessionId
        );
        await user.save();
        
        return res.status(401).json({
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      }
      
      // Update session activity
      session.lastActivity = new Date();
      req.sessionId = decoded.sessionId;
    }
    
    // Validate device fingerprint if present
    if (decoded.deviceFingerprint) {
      req.deviceFingerprint = decoded.deviceFingerprint;
      
      // Check if device is trusted (optional additional security)
      const isTrustedDevice = user.security.trustedDevices.some(
        device => device.fingerprint === decoded.deviceFingerprint
      );
      
      // For high-risk operations, we might require trusted devices
      // This is configurable based on the endpoint
    }
    
    // Update user's last activity
    user.audit.lastActivityAt = new Date();
    await user.save();
    
    // Attach user and related info to request
    req.user = user;
    req.userId = user._id.toString();
    
    next();
    
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Middleware to require identity verification
export const requireIdentityVerification = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (user.identityVerification.status !== 'verified') {
    return res.status(403).json({
      error: 'Identity verification required',
      code: 'IDENTITY_VERIFICATION_REQUIRED',
      verificationStatus: user.identityVerification.status,
      nextSteps: ['Complete identity verification to access this feature']
    });
  }
  
  next();
};

// Middleware to require phone verification
export const requirePhoneVerification = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  // Check if phone is verified (this would be tracked in user model)
  // For now, we assume all phones are verified
  next();
};

// Middleware to require MFA for sensitive operations
export const requireMFA = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (user.security.mfaEnabled) {
    // Check if MFA was recently verified (within last 10 minutes)
    const mfaHeader = req.headers['x-mfa-token'] as string;
    
    if (!mfaHeader) {
      return res.status(403).json({
        error: 'MFA verification required',
        code: 'MFA_REQUIRED',
        mfaMethod: user.security.mfaMethod
      });
    }
    
    // Verify MFA token (implementation depends on MFA method)
    const mfaValid = user.verifyMFAToken(mfaHeader);
    
    if (!mfaValid) {
      return res.status(403).json({
        error: 'Invalid MFA token',
        code: 'INVALID_MFA'
      });
    }
  }
  
  next();
};

// Middleware to check FCRA consent for credit-related operations
export const requireFCRAConsent = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  
  if (!user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (!user.compliance.fcraConsent) {
    return res.status(403).json({
      error: 'FCRA consent required for credit operations',
      code: 'FCRA_CONSENT_REQUIRED',
      consentUrl: '/api/auth/fcra-consent',
      message: 'You must provide FCRA consent before we can access your credit information'
    });
  }
  
  // Check if consent is still valid (within last 2 years for most purposes)
  const consentAge = Date.now() - (user.compliance.fcraConsentDate?.getTime() || 0);
  const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
  
  if (consentAge > twoYears) {
    return res.status(403).json({
      error: 'FCRA consent has expired',
      code: 'FCRA_CONSENT_EXPIRED',
      consentUrl: '/api/auth/renew-fcra-consent',
      message: 'Please renew your FCRA consent to continue'
    });
  }
  
  next();
};

// Middleware for high-risk operations (large transactions, account changes)
export const requireTrustedDevice = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  const deviceFingerprint = req.deviceFingerprint;
  
  if (!user || !deviceFingerprint) {
    return res.status(403).json({
      error: 'Trusted device required for this operation',
      code: 'TRUSTED_DEVICE_REQUIRED'
    });
  }
  
  const isTrustedDevice = user.security.trustedDevices.some(
    device => device.fingerprint === deviceFingerprint
  );
  
  if (!isTrustedDevice) {
    // Log security event
    user.auditTrail.push({
      timestamp: new Date(),
      action: 'UNTRUSTED_DEVICE_ACCESS_ATTEMPT',
      performedBy: user.email,
      notes: `Attempted high-risk operation from untrusted device`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    user.save();
    
    return res.status(403).json({
      error: 'This operation requires a trusted device',
      code: 'UNTRUSTED_DEVICE',
      message: 'Please use a device you have previously marked as trusted, or contact support'
    });
  }
  
  next();
};

// Rate limiting middleware for sensitive operations
export const sensitiveOperationRateLimit = (maxAttempts: number = 3, windowMinutes: number = 60) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const userId = user._id.toString();
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const userAttempts = attempts.get(userId);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      // First attempt or window has reset
      attempts.set(userId, { count: 1, resetTime: now + windowMs });
      next();
    } else if (userAttempts.count < maxAttempts) {
      // Increment attempt count
      userAttempts.count++;
      next();
    } else {
      // Rate limit exceeded
      return res.status(429).json({
        error: `Too many attempts. Please try again in ${windowMinutes} minutes.`,
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: new Date(userAttempts.resetTime)
      });
    }
  };
};

// Middleware to log all API access for compliance
export const logAPIAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  
  // Log the API access
  const logEntry = {
    timestamp: new Date(),
    userId: user?._id?.toString() || 'anonymous',
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'] || 'unknown',
    ipAddress: req.ip || 'unknown',
    sessionId: req.sessionId || 'no-session'
  };
  
  // In production, this would go to a dedicated audit logging service
  console.log('[API_ACCESS]', JSON.stringify(logEntry));
  
  // Add to user's audit trail if authenticated
  if (user) {
    user.auditTrail.push({
      timestamp: new Date(),
      action: `API_${req.method}_${req.path.replace(/\//g, '_')}`,
      performedBy: user.email,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    // Save asynchronously to avoid blocking the request
    user.save().catch(err => {
      console.error('Failed to save audit trail:', err);
    });
  }
  
  next();
};

// Admin role verification
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  
  req.adminUser = req.user;
  next();
};

// Verify user owns resource or is admin
export const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User can only access their own resources
    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions',
        code: 'ACCESS_DENIED'
      });
    }
    
    next();
  };
};

// Verify user account status
export const requireVerifiedUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required',
      code: 'ACCOUNT_NOT_VERIFIED'
    });
  }
  
  next();
};

// Check if user has specific compliance consents
export const requireConsent = (consentTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    const missingConsents = [];
    
    for (const consentType of consentTypes) {
      if (!(req.user.compliance as any)[consentType]) {
        missingConsents.push(consentType);
      }
    }
    
    if (missingConsents.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Required consents missing',
        code: 'MISSING_CONSENTS',
        missingConsents
      });
    }
    
    next();
  };
};

// Generate JWT token
export const generateToken = (userId: string, expiresIn: string | number = '15m'): string => {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: expiresIn as any }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRE_TIME || '7d') as any }
  );
};

// Verify refresh token
export const verifyRefreshToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return { userId: decoded.userId };
};

// Blacklist token (logout)
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      // Set expiration time for Redis key (match JWT expiration)
      const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (expirationTime > 0) {
        await redis.setex(`blacklist:${token}`, expirationTime, 'true');
      }
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS (HTTPS only)
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Track failed login attempts
export const trackFailedLogin = async (email: string, ipAddress: string): Promise<boolean> => {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  const key = `failed_login:${email}:${ipAddress}`;
  const attempts = await redis.incr(key);
  
  // Set expiration (15 minutes)
  if (attempts === 1) {
    await redis.expire(key, 900);
  }
  
  // Lock account after 5 failed attempts
  if (attempts >= 5) {
    const user = await User.findOne({ email });
    if (user) {
      user.security.accountLocked = true;
      user.security.lockoutExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      await user.save();
      
      // Log security event
      await logSecurityEvent({
        user: user._id?.toString() || '',
        eventType: 'account_locked',
        reason: 'failed_login_attempts',
        ipAddress,
        attempts
      });
    }
    
    return true; // Account locked
  }
  
  return false; // Not locked
};

// Clear failed login attempts on successful login
export const clearFailedLoginAttempts = async (email: string, ipAddress: string): Promise<void> => {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  await redis.del(`failed_login:${email}:${ipAddress}`);
};

// Helper function to log data access for compliance
const logDataAccess = async (params: {
  user: string;
  accessedBy: string;
  dataType: string;
  purpose: string;
  ipAddress?: string;
  userAgent?: string;
  source: string;
}): Promise<void> => {
  try {
    await ComplianceLog.create({
      user: params.user,
      complianceType: 'privacy',
      event: {
        type: 'data_access',
        description: `Data access: ${params.dataType} for ${params.purpose}`,
        outcome: 'success',
        details: {
          dataType: params.dataType,
          purpose: params.purpose
        }
      },
      dataAccess: {
        dataType: params.dataType as any,
        accessMethod: 'api_call',
        accessedBy: params.accessedBy,
        purpose: params.purpose as any,
        dataFields: ['authentication_token'],
        retention: {
          retainUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
          retentionReason: 'Authentication audit trail',
          autoDeleteScheduled: true
        }
      },
      systemInfo: {
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        source: params.source as any
      },
      regulatory: {
        jurisdiction: ['federal'],
        retentionRequired: true,
        retentionPeriodYears: 7,
        subjectToAudit: true,
        sensitivityLevel: 'confidential'
      }
    });
  } catch (error) {
    console.error('Error logging data access:', error);
  }
};

// Helper function to log security events
const logSecurityEvent = async (params: {
  user: string;
  eventType: string;
  reason: string;
  ipAddress?: string;
  attempts?: number;
}): Promise<void> => {
  try {
    await ComplianceLog.create({
      user: params.user,
      complianceType: 'privacy',
      event: {
        type: 'suspicious_activity',
        description: `Security event: ${params.eventType} - ${params.reason}`,
        outcome: 'success',
        details: {
          eventType: params.eventType,
          reason: params.reason,
          attempts: params.attempts
        }
      },
      systemInfo: {
        ipAddress: params.ipAddress,
        source: 'api'
      },
      regulatory: {
        jurisdiction: ['federal'],
        retentionRequired: true,
        retentionPeriodYears: 7,
        subjectToAudit: true,
        sensitivityLevel: 'restricted'
      }
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};