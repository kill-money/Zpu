import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

// Default rate limiter configuration
const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  keyGenerator: (req: Request) => {
    // Use IP + User ID (if authenticated) as key
    const userId = req.userId || 'anonymous';
    return `rate_limit:${req.ip}:${userId}`;
  }
};

// Create rate limiter middleware
export const rateLimiter = (redis: Redis, options: Partial<RateLimitOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator!(req);
      const window = Math.floor(Date.now() / config.windowMs);
      const windowKey = `${key}:${window}`;
      
      // Get current request count for this window
      const currentCount = await redis.incr(windowKey);
      
      // Set expiration for the key (only on first request)
      if (currentCount === 1) {
        await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
      }
      
      // Check if limit exceeded
      if (currentCount > config.maxRequests) {
        if (config.onLimitReached) {
          config.onLimitReached(req, res);
        }
        
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (config.maxRequests - currentCount).toString());
      res.setHeader('X-RateLimit-Reset', (window + 1).toString());
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block requests if Redis is down
      next();
    }
  };
};

// Specific rate limiters for different endpoints

// Authentication endpoints (stricter limits)
export const authRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req: Request) => `auth_limit:${req.ip}`,
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`Authentication rate limit exceeded for IP: ${req.ip}`);
  }
});

// Password reset endpoints
export const passwordResetRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset attempts per hour
  keyGenerator: (req: Request) => `pwd_reset:${req.ip}:${req.body.email || 'unknown'}`
});

// Loan application endpoints
export const applicationRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 3, // 3 applications per day per user
  keyGenerator: (req: Request) => `app_limit:${req.userId || req.ip}`
});

// Credit check endpoints (very strict)
export const creditCheckRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 1, // 1 credit check per day per user
  keyGenerator: (req: Request) => `credit_limit:${req.userId}`
});

// File upload endpoints
export const fileUploadRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 file uploads per hour
  keyGenerator: (req: Request) => `upload_limit:${req.userId || req.ip}`
});

// SMS/Email sending endpoints
export const communicationRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 messages per hour
  keyGenerator: (req: Request) => `comm_limit:${req.userId || req.ip}`
});

// Admin endpoints (more generous for legitimate admin work)
export const adminRateLimiter = (redis: Redis) => rateLimiter(redis, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per 15 minutes for admins
  keyGenerator: (req: Request) => `admin_limit:${req.userId}`
});

// IP-based rate limiting for suspicious activity
export const suspiciousActivityLimiter = (redis: Redis) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ipKey = `suspicious:${req.ip}`;
      const userAgentKey = `ua_suspicious:${req.get('User-Agent') || 'unknown'}`;
      
      // Check for suspicious patterns
      const ipCount = await redis.get(ipKey);
      const uaCount = await redis.get(userAgentKey);
      
      // Block if too many requests from same IP
      if (ipCount && parseInt(ipCount) > 1000) {
        return res.status(429).json({
          success: false,
          message: 'IP temporarily blocked due to suspicious activity',
          code: 'IP_BLOCKED'
        });
      }
      
      // Block if too many requests from same User-Agent
      if (uaCount && parseInt(uaCount) > 500) {
        return res.status(429).json({
          success: false,
          message: 'User-Agent temporarily blocked due to suspicious activity',
          code: 'UA_BLOCKED'
        });
      }
      
      next();
    } catch (error) {
      console.error('Suspicious activity limiter error:', error);
      next();
    }
  };
};

// Track suspicious activity
export const trackSuspiciousActivity = async (redis: Redis, req: Request, activityType: string): Promise<void> => {
  try {
    const ipKey = `suspicious:${req.ip}`;
    const uaKey = `ua_suspicious:${req.get('User-Agent') || 'unknown'}`;
    const activityKey = `activity:${req.ip}:${activityType}`;
    
    // Increment counters
    await Promise.all([
      redis.incr(ipKey),
      redis.incr(uaKey),
      redis.incr(activityKey)
    ]);
    
    // Set expiration (24 hours)
    await Promise.all([
      redis.expire(ipKey, 24 * 60 * 60),
      redis.expire(uaKey, 24 * 60 * 60),
      redis.expire(activityKey, 24 * 60 * 60)
    ]);
    
    // Log if threshold exceeded
    const count = await redis.get(activityKey);
    if (count && parseInt(count) > 10) {
      console.warn(`Suspicious activity detected: ${activityType} from ${req.ip} - ${count} attempts`);
    }
  } catch (error) {
    console.error('Error tracking suspicious activity:', error);
  }
};

// Compliance-aware rate limiting (log when limits are hit)
export const complianceRateLimiter = (redis: Redis, options: Partial<RateLimitOptions> = {}) => {
  const limiter = rateLimiter(redis, {
    ...options,
    onLimitReached: async (req: Request, res: Response) => {
      // Log compliance event for rate limiting
      try {
        const { ComplianceLog } = await import('../models/ComplianceLog');
        
        await ComplianceLog.create({
          complianceType: 'privacy',
          event: {
            type: 'suspicious_activity',
            description: 'Rate limit exceeded - potential automated access',
            outcome: 'success',
            details: {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              endpoint: req.path,
              method: req.method
            }
          },
          systemInfo: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            source: 'api'
          },
          riskAssessment: {
            riskScore: 75,
            riskFactors: ['rate_limit_exceeded', 'potential_automation'],
            fraudIndicators: ['high_request_volume'],
            identityVerificationStatus: 'manual_review',
            ipAddress: req.ip,
            ofacCheck: {
              performed: false,
              result: 'clear'
            }
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
        console.error('Error logging rate limit compliance event:', error);
      }
      
      if (options.onLimitReached) {
        options.onLimitReached(req, res);
      }
    }
  });
  
  return limiter;
};

// Distributed rate limiting (for multiple server instances)
export const distributedRateLimiter = (redis: Redis, options: Partial<RateLimitOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator!(req);
      const now = Date.now();
      const window = Math.floor(now / config.windowMs);
      
      // Use Redis sorted sets for sliding window
      const windowKey = `${key}:sliding`;
      const cutoff = now - config.windowMs;
      
      // Remove old entries
      await redis.zremrangebyscore(windowKey, '-inf', cutoff);
      
      // Count current requests
      const currentCount = await redis.zcount(windowKey, cutoff, '+inf');
      
      if (currentCount >= config.maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((config.windowMs - (now % config.windowMs)) / 1000)
        });
      }
      
      // Add current request
      await redis.zadd(windowKey, now, `${now}-${Math.random()}`);
      
      // Set expiration
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
      
      // Add headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (config.maxRequests - currentCount - 1).toString());
      
      next();
    } catch (error) {
      console.error('Distributed rate limiter error:', error);
      next();
    }
  };
};