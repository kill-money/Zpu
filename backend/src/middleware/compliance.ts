import { Request, Response, NextFunction } from 'express';
import { ComplianceLog } from '../models/ComplianceLog';
import User from '../models/User';
import crypto from 'crypto';

// Extend Request interface for compliance tracking
declare global {
  namespace Express {
    interface Request {
      complianceContext?: {
        fcraRequired?: boolean;
        tcpaRequired?: boolean;
        tilaRequired?: boolean;
        dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
        auditRequired?: boolean;
      };
    }
  }
}

// Main compliance logging middleware - logs all requests for audit trail
export const complianceLogger = async (req: Request, res: Response, next: NextFunction) => {
  // Skip logging for health checks and static assets
  if (req.path === '/health' || req.path.startsWith('/assets')) {
    return next();
  }
  
  try {
    // Determine data classification based on endpoint
    const dataClassification = getDataClassification(req.path, req.method);
    const isAuditRequired = isAuditRequiredEndpoint(req.path);
    
    // Set compliance context
    req.complianceContext = {
      dataClassification,
      auditRequired: isAuditRequired
    };
    
    // Log high-sensitivity operations
    if (dataClassification === 'restricted' || dataClassification === 'confidential') {
      await logComplianceEvent({
        user: req.userId,
        complianceType: 'privacy',
        eventType: 'data_access',
        description: `API access to ${dataClassification} endpoint: ${req.method} ${req.path}`,
        outcome: 'pending',
        details: {
          endpoint: req.path,
          method: req.method,
          dataClassification,
          parameters: sanitizeParameters(req.query, req.body)
        },
        systemInfo: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: 'api'
        },
        sensitivityLevel: dataClassification
      });
    }
    
    next();
  } catch (error) {
    console.error('Compliance logging error:', error);
    next(); // Don't block request on logging failure
  }
};

// FCRA (Fair Credit Reporting Act) compliance middleware
export const fcraCompliance = (disclosureType: 'pre_adverse' | 'adverse_action' | 'investigative_consumer') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for FCRA compliance',
          code: 'AUTH_REQUIRED'
        });
      }
      
      // Check if FCRA authorization is obtained
      if (!req.user.compliance?.fcraConsent) {
        return res.status(403).json({
          success: false,
          message: 'FCRA authorization required',
          code: 'FCRA_CONSENT_REQUIRED',
          complianceType: 'FCRA'
        });
      }
      
      // Log FCRA compliance event
      await logComplianceEvent({
        user: req.user._id,
        complianceType: 'fcra',
        eventType: 'consent_obtained',
        description: `FCRA ${disclosureType} compliance check passed`,
        outcome: 'success',
        fcraDetails: {
          disclosureType,
          consentObtained: true,
          consentTimestamp: req.user.compliance?.fcraConsentDate
        },
        systemInfo: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: 'api'
        }
      });
      
      req.complianceContext = {
        ...req.complianceContext,
        fcraRequired: true
      };
      
      next();
    } catch (error) {
      console.error('FCRA compliance error:', error);
      return res.status(500).json({
        success: false,
        message: 'FCRA compliance check failed',
        code: 'FCRA_ERROR'
      });
    }
  };
};

// TCPA (Telephone Consumer Protection Act) compliance middleware
export const tcpaCompliance = (communicationType: 'sms' | 'voice' | 'email') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for TCPA compliance',
          code: 'AUTH_REQUIRED'
        });
      }
      
      // Check TCPA consent
      if (!req.user.compliance?.tcpaConsent) {
        return res.status(403).json({
          success: false,
          message: 'TCPA consent required for communications',
          code: 'TCPA_CONSENT_REQUIRED',
          complianceType: 'TCPA'
        });
      }
      
      // Log TCPA compliance event
      await logComplianceEvent({
        user: req.user._id,
        complianceType: 'tcpa',
        eventType: 'consent_obtained',
        description: `TCPA consent verified for ${communicationType} communication`,
        outcome: 'success',
        tcpaDetails: {
          consentType: communicationType,
          consentMethod: 'electronic',
          consentTimestamp: req.user.compliance?.tcpaConsentDate || new Date(),
          phoneNumber: req.user.phone,
          messageType: 'transactional'
        },
        systemInfo: {
          ipAddress: req.ip,
          source: 'api'
        }
      });
      
      req.complianceContext = {
        ...req.complianceContext,
        tcpaRequired: true
      };
      
      next();
    } catch (error) {
      console.error('TCPA compliance error:', error);
      return res.status(500).json({
        success: false,
        message: 'TCPA compliance check failed',
        code: 'TCPA_ERROR'
      });
    }
  };
};

// TILA (Truth in Lending Act) compliance middleware
export const tilaCompliance = (disclosureType: 'initial' | 'final' | 'periodic') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TILA disclosures are required for loan transactions
      req.complianceContext = {
        ...req.complianceContext,
        tilaRequired: true
      };
      
      // Log TILA compliance requirement
      if (req.user) {
        await logComplianceEvent({
          user: req.user._id,
          complianceType: 'tila',
          eventType: 'disclosure_sent',
          description: `TILA ${disclosureType} disclosure requirement`,
          outcome: 'pending',
          tilaDetails: {
            disclosureType,
            disclosureProvidedDate: new Date(),
            acknowledgmentReceived: false
          },
          systemInfo: {
            ipAddress: req.ip,
            source: 'api'
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('TILA compliance error:', error);
      next(); // Don't block for TILA logging errors
    }
  };
};

// Data masking middleware for PII protection
export const maskSensitiveData = (req: Request, res: Response, next: NextFunction) => {
  // Override res.json to mask sensitive data
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    const maskedObj = maskPII(obj);
    return originalJson.call(this, maskedObj);
  };
  
  next();
};

// SSN validation and encryption middleware
export const ssnCompliance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.ssn) {
      // Validate SSN format
      const ssnRegex = /^\d{9}$|^\d{3}-\d{2}-\d{4}$/;
      const cleanSSN = req.body.ssn.replace(/[-\s]/g, '');
      
      if (!ssnRegex.test(req.body.ssn) || !isValidSSN(cleanSSN)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid SSN format',
          code: 'INVALID_SSN'
        });
      }
      
      // Log SSN access
      if (req.user) {
        await logComplianceEvent({
          user: req.user._id,
          complianceType: 'privacy',
          eventType: 'data_modification',
          description: 'SSN data processing',
          outcome: 'success',
          details: {
            dataType: 'ssn',
            operation: 'encryption',
            ssnLastFour: cleanSSN.slice(-4)
          },
          systemInfo: {
            ipAddress: req.ip,
            source: 'api'
          },
          sensitivityLevel: 'restricted'
        });
      }
      
      // Store cleaned SSN for encryption
      req.body.ssn = cleanSSN;
    }
    
    next();
  } catch (error) {
    console.error('SSN compliance error:', error);
    return res.status(500).json({
      success: false,
      message: 'SSN validation failed',
      code: 'SSN_ERROR'
    });
  }
};

// Bank account compliance (routing number validation)
export const bankAccountCompliance = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.routingNumber) {
    if (!isValidRoutingNumber(req.body.routingNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid routing number',
        code: 'INVALID_ROUTING_NUMBER'
      });
    }
  }
  
  next();
};

// Adverse action compliance (ECOA - Equal Credit Opportunity Act)
export const adverseActionCompliance = async (req: Request, res: Response, next: NextFunction) => {
  // This middleware ensures adverse action notices are sent when required
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    // Check if this is a loan rejection
    if (obj.loan && (obj.loan.status === 'rejected' || obj.decision?.actionTaken === 'denied')) {
      // Schedule adverse action notice
      scheduleAdverseActionNotice(req.user?._id?.toString() || '', obj.loan._id, obj.decision?.reasonCodes);
    }
    
    return originalJson.call(this, obj);
  };
  
  next();
};

// Helper Functions

function getDataClassification(path: string, method: string): 'public' | 'internal' | 'confidential' | 'restricted' {
  // SSN, banking, credit-related endpoints are restricted
  if (path.includes('ssn') || path.includes('bank') || path.includes('credit')) {
    return 'restricted';
  }
  
  // User PII endpoints are confidential
  if (path.includes('profile') || path.includes('personal')) {
    return 'confidential';
  }
  
  // Admin endpoints are internal
  if (path.startsWith('/api/admin')) {
    return 'internal';
  }
  
  // Public endpoints
  if (path.includes('health') || path.includes('rates') || method === 'GET') {
    return 'public';
  }
  
  return 'internal';
}

function isAuditRequiredEndpoint(path: string): boolean {
  const auditPaths = [
    '/api/loans',
    '/api/admin',
    '/api/user/profile',
    '/api/user/bank',
    '/api/credit'
  ];
  
  return auditPaths.some(auditPath => path.startsWith(auditPath));
}

function sanitizeParameters(query: any, body: any): any {
  const sensitive = ['ssn', 'password', 'accountNumber', 'routingNumber'];
  
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitive.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  };
  
  return {
    query: sanitize(query),
    body: sanitize(body)
  };
}

function maskPII(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const piiFields = {
    ssn: (value: string) => value ? `***-**-${value.slice(-4)}` : value,
    accountNumber: (value: string) => value ? `****${value.slice(-4)}` : value,
    phone: (value: string) => value ? `***-***-${value.slice(-4)}` : value,
    email: (value: string) => {
      if (!value || !value.includes('@')) return value;
      const [local, domain] = value.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }
  };
  
  const masked = { ...obj };
  
  for (const [field, maskFn] of Object.entries(piiFields)) {
    if (masked[field]) {
      masked[field] = maskFn(masked[field]);
    }
  }
  
  return masked;
}

function isValidSSN(ssn: string): boolean {
  // Basic SSN validation rules
  if (ssn.length !== 9) return false;
  if (ssn === '000000000') return false;
  if (ssn.startsWith('000')) return false;
  if (ssn.substring(3, 5) === '00') return false;
  if (ssn.substring(5, 9) === '0000') return false;
  
  // Check for invalid patterns
  const invalidPatterns = [
    '123456789',
    '111111111',
    '222222222',
    '333333333',
    '444444444',
    '555555555',
    '666666666',
    '777777777',
    '888888888',
    '999999999'
  ];
  
  return !invalidPatterns.includes(ssn);
}

function isValidRoutingNumber(routingNumber: string): boolean {
  if (!routingNumber || routingNumber.length !== 9) return false;
  
  // Checksum validation
  const digits = routingNumber.split('').map(Number);
  const checksum = (
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8])
  ) % 10;
  
  return checksum === 0;
}

export async function logComplianceEvent(params: any): Promise<void> {
  try {
    const log = new ComplianceLog({
      user: params.user,
      complianceType: params.complianceType,
      event: {
        type: params.eventType,
        description: params.description,
        outcome: params.outcome,
        details: params.details
      },
      ...(params.fcraDetails && { fcra: params.fcraDetails }),
      ...(params.tcpaDetails && { tcpa: params.tcpaDetails }),
      ...(params.tilaDetails && { tila: params.tilaDetails }),
      systemInfo: params.systemInfo,
      regulatory: {
        jurisdiction: ['federal'],
        retentionRequired: true,
        retentionPeriodYears: 7,
        subjectToAudit: true,
        sensitivityLevel: params.sensitivityLevel || 'confidential'
      }
    });
    
    await log.save();
  } catch (error) {
    console.error('Error logging compliance event:', error);
  }
}

async function scheduleAdverseActionNotice(userId: string, loanId: string, reasonCodes?: string[]): Promise<void> {
  try {
    // Log adverse action requirement
    await logComplianceEvent({
      user: userId,
      loan: loanId,
      complianceType: 'ecoa',
      eventType: 'adverse_action',
      description: 'Adverse action notice required for loan rejection',
      outcome: 'pending',
      details: {
        actionTaken: 'denied',
        reasonCodes: reasonCodes || ['insufficient_credit'],
        noticeRequired: true
      },
      systemInfo: {
        source: 'api'
      },
      sensitivityLevel: 'confidential'
    });
    
    // TODO: Integrate with notification system to send actual notice
    console.log(`Adverse action notice scheduled for user ${userId}, loan ${loanId}`);
  } catch (error) {
    console.error('Error scheduling adverse action notice:', error);
  }
}