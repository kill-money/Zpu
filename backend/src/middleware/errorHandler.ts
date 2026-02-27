import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

// Main error handling middleware
export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  // Log error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.userId,
    timestamp: new Date().toISOString()
  });
  
  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;
  
  // Handle specific error types
  
  // Mongoose validation errors
  if (err instanceof MongooseError.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    
    details = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
  }
  
  // Mongoose duplicate key error
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
    
    const field = Object.keys((err as any).keyValue)[0];
    details = {
      field,
      message: `${field} already exists`
    };
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err instanceof MongooseError.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid resource ID';
    
    details = {
      field: err.path,
      value: err.value,
      expectedType: err.kind
    };
  }
  
  // JWT errors (handled in auth middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  
  // Rate limiting errors
  if (code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
  }
  
  // File upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds limit';
    } else if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    } else {
      message = 'File upload failed';
    }
  }
  
  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database temporarily unavailable';
  }
  
  // Payment processing errors
  if (code?.startsWith('PAYMENT_')) {
    statusCode = 402;
  }
  
  // Compliance errors
  if (code?.startsWith('FCRA_') || code?.startsWith('TCPA_') || code?.startsWith('TILA_')) {
    statusCode = 403;
  }
  
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal server error';
    details = null;
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || generateRequestId()
  });
  
  // Log critical errors for monitoring (would integrate with logging service)
  if (statusCode >= 500) {
    logCriticalError(err, req);
  }
};

// Handle async errors that aren't caught
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;
  
  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class ComplianceError extends AppError {
  constructor(message: string, complianceType: string, details?: any) {
    super(message, 403, `${complianceType.toUpperCase()}_ERROR`, details);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, paymentCode: string, details?: any) {
    super(message, 402, `PAYMENT_${paymentCode}`, details);
  }
}

// Error handler for unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log to external service in production
  if (process.env.NODE_ENV === 'production') {
    logCriticalError(reason, null);
  }
  
  // Gracefully shut down
  process.exit(1);
});

// Error handler for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  
  // Log to external service in production
  if (process.env.NODE_ENV === 'production') {
    logCriticalError(error, null);
  }
  
  // Gracefully shut down
  process.exit(1);
});

// Helper functions

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function logCriticalError(error: any, req: Request | null): void {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...(req && {
      url: req.url,
      method: req.method,
      headers: req.headers,
      userId: req.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
  };
  
  // In production, this would send to monitoring service (e.g., Sentry, DataDog)
  console.error('CRITICAL ERROR:', JSON.stringify(errorLog, null, 2));
  
  // TODO: Integrate with external monitoring service
  // Example: Sentry.captureException(error, { extra: errorLog });
}

// Validation helper for request data
export const validateRequired = (data: any, requiredFields: string[]): void => {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missing.length > 0) {
    throw new ValidationError('Required fields missing', {
      missingFields: missing
    });
  }
};

// Validation helper for email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation helper for US phone numbers
export const validateUSPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\+\.]/g, '');
  return phoneRegex.test(cleanPhone);
};

// Validation helper for US ZIP codes
export const validateUSZip = (zip: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
};

// Validation helper for US states
export const validateUSState = (state: string): boolean => {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'AS', 'GU', 'MP', 'PR', 'VI'
  ];
  
  return validStates.includes(state.toUpperCase());
};

// Validation helper for loan amounts
export const validateLoanAmount = (amount: number): boolean => {
  return amount >= 1000 && amount <= 50000;
};

// Validation helper for credit scores
export const validateCreditScore = (score: number): boolean => {
  return score >= 300 && score <= 850;
};

// Validation helper for APR rates
export const validateAPR = (apr: number): boolean => {
  return apr >= 0 && apr <= 36; // US usury laws
};