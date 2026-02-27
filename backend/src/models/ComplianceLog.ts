import mongoose, { Document, Schema, Types } from 'mongoose';

// US Financial Services Compliance Logging
export interface IComplianceLog extends Document<mongoose.Types.ObjectId> {
  // Log Identification
  logId: string; // Unique log identifier
  
  // Related Entities
  user?: Types.ObjectId;
  loan?: Types.ObjectId;
  application?: Types.ObjectId;
  admin?: Types.ObjectId; // Admin who performed action
  
  // Compliance Type
  complianceType: 'fcra' | 'tcpa' | 'tila' | 'ecoa' | 'scra' | 'udaap' | 'privacy' | 'kyc' | 'aml' | 'ofac' | 'data_retention' | 'adverse_action';
  
  // Event Details
  event: {
    type: 'disclosure_sent' | 'consent_obtained' | 'credit_check' | 'adverse_action' | 'data_access' | 'data_modification' | 'data_deletion' | 'opt_out' | 'marketing_contact' | 'collection_call' | 'document_request' | 'identity_verification' | 'suspicious_activity';
    description: string;
    outcome: 'success' | 'failure' | 'pending' | 'cancelled';
    details: any; // Flexible object for event-specific data
  };
  
  // FCRA Specific (Fair Credit Reporting Act)
  fcra?: {
    disclosureType: 'pre_adverse' | 'adverse_action' | 'investigative_consumer' | 'employment_screening';
    consentObtained: boolean;
    consentTimestamp?: Date;
    creditReportPulled: boolean;
    creditReportProvider?: 'experian' | 'equifax' | 'transunion';
    adverseActionReason?: string[];
    adverseActionSentDate?: Date;
    disputeReceived?: boolean;
    disputeResolution?: string;
  };
  
  // TCPA Specific (Telephone Consumer Protection Act)
  tcpa?: {
    consentType: 'sms' | 'voice' | 'email' | 'autodialer';
    consentMethod: 'written' | 'oral' | 'electronic' | 'website_checkbox';
    consentTimestamp: Date;
    phoneNumber?: string;
    messageType?: 'marketing' | 'transactional' | 'account_alert' | 'collection';
    optOutReceived?: boolean;
    optOutTimestamp?: Date;
    revoked?: boolean;
    revokedTimestamp?: Date;
  };
  
  // TILA Specific (Truth in Lending Act)
  tila?: {
    disclosureType: 'initial' | 'final' | 'periodic' | 'change_in_terms';
    apr: number;
    financeCharge: number;
    amountFinanced: number;
    totalOfPayments: number;
    paymentSchedule: any;
    disclosureProvidedDate: Date;
    acknowledgmentReceived: boolean;
    rightToCancelProvided?: boolean;
    rightToCancelPeriodEnd?: Date;
  };
  
  // ECOA Specific (Equal Credit Opportunity Act)
  ecoa?: {
    actionTaken: 'approved' | 'denied' | 'withdrawn' | 'incomplete';
    reasonCodes?: string[];
    noticeProvided: boolean;
    noticeProvidedDate?: Date;
    demographicInfo?: {
      ethnicity?: string;
      race?: string;
      sex?: string;
      ageCategory?: string;
    };
  };
  
  // Data Privacy & Access
  dataAccess?: {
    dataType: 'pii' | 'credit_info' | 'bank_info' | 'employment_info' | 'communication_prefs' | 'application_data';
    accessMethod: 'manual_lookup' | 'automated_system' | 'report_generation' | 'api_call';
    accessedBy: Types.ObjectId; // User or admin
    purpose: 'customer_service' | 'underwriting' | 'collections' | 'marketing' | 'compliance' | 'fraud_investigation';
    dataFields: string[]; // Specific fields accessed
    retention: {
      retainUntil: Date;
      retentionReason: string;
      autoDeleteScheduled: boolean;
    };
  };
  
  // Communication Tracking
  communication?: {
    channel: 'phone' | 'sms' | 'email' | 'mail' | 'in_person' | 'web_chat';
    direction: 'inbound' | 'outbound';
    initiatedBy: 'customer' | 'system' | 'agent';
    purpose: 'collections' | 'marketing' | 'customer_service' | 'verification' | 'legal_notice';
    consentVerified: boolean;
    recordingConsent?: boolean;
    duration?: number; // in seconds for calls
    transcript?: string;
  };
  
  // Risk & Fraud
  riskAssessment?: {
    riskScore?: number;
    riskFactors: string[];
    fraudIndicators: string[];
    identityVerificationStatus: 'passed' | 'failed' | 'manual_review';
    deviceFingerprint?: string;
    ipAddress?: string;
    geolocation?: {
      country: string;
      state: string;
      city: string;
    };
    ofacCheck: {
      performed: boolean;
      result: 'clear' | 'match' | 'potential_match';
      matchDetails?: string;
    };
  };
  
  // System Context
  systemInfo: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    apiVersion?: string;
    source: 'web' | 'mobile' | 'api' | 'admin_panel' | 'batch_job' | 'webhook';
  };
  
  // Regulatory Metadata
  regulatory: {
    jurisdiction: string[]; // e.g., ['federal', 'california', 'texas']
    examinationPeriod: Date; // Last regulatory examination
    retentionRequired: boolean;
    retentionPeriodYears: number;
    subjectToAudit: boolean;
    sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  };
  
  // Verification & Audit
  verification: {
    verified: boolean;
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    auditTrail: {
      action: string;
      performedBy: Types.ObjectId;
      timestamp: Date;
      changes?: any;
    }[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isRetentionExpired(): boolean;
  shouldAutoDelete(): boolean;
  getRetentionPeriod(): number;
  addAuditEntry(action: string, performedBy: Types.ObjectId, changes?: any): void;
  maskSensitiveData(): object;
}

const ComplianceLogSchema = new Schema<IComplianceLog>({
  logId: {
    type: String,
    required: [true, 'Log ID is required'],
    unique: true,
    index: true
  },
  
  // Related entities
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  loan: {
    type: Schema.Types.ObjectId,
    ref: 'Loan',
    index: true
  },
  
  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    index: true
  },
  
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Compliance type
  complianceType: {
    type: String,
    required: [true, 'Compliance type is required'],
    enum: ['fcra', 'tcpa', 'tila', 'ecoa', 'scra', 'udaap', 'privacy', 'kyc', 'aml', 'ofac', 'data_retention', 'adverse_action'],
    index: true
  },
  
  // Event details
  event: {
    type: {
      type: String,
      required: [true, 'Event type is required'],
      enum: ['disclosure_sent', 'consent_obtained', 'credit_check', 'adverse_action', 'data_access', 'data_modification', 'data_deletion', 'opt_out', 'marketing_contact', 'collection_call', 'document_request', 'identity_verification', 'suspicious_activity']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    outcome: {
      type: String,
      required: [true, 'Event outcome is required'],
      enum: ['success', 'failure', 'pending', 'cancelled']
    },
    details: {
      type: Schema.Types.Mixed, // Flexible for event-specific data
      default: {}
    }
  },
  
  // FCRA specific fields
  fcra: {
    disclosureType: {
      type: String,
      enum: ['pre_adverse', 'adverse_action', 'investigative_consumer', 'employment_screening']
    },
    consentObtained: Boolean,
    consentTimestamp: Date,
    creditReportPulled: Boolean,
    creditReportProvider: {
      type: String,
      enum: ['experian', 'equifax', 'transunion']
    },
    adverseActionReason: [String],
    adverseActionSentDate: Date,
    disputeReceived: Boolean,
    disputeResolution: String
  },
  
  // TCPA specific fields
  tcpa: {
    consentType: {
      type: String,
      enum: ['sms', 'voice', 'email', 'autodialer']
    },
    consentMethod: {
      type: String,
      enum: ['written', 'oral', 'electronic', 'website_checkbox']
    },
    consentTimestamp: Date,
    phoneNumber: String,
    messageType: {
      type: String,
      enum: ['marketing', 'transactional', 'account_alert', 'collection']
    },
    optOutReceived: Boolean,
    optOutTimestamp: Date,
    revoked: Boolean,
    revokedTimestamp: Date
  },
  
  // TILA specific fields
  tila: {
    disclosureType: {
      type: String,
      enum: ['initial', 'final', 'periodic', 'change_in_terms']
    },
    apr: Number,
    financeCharge: Number,
    amountFinanced: Number,
    totalOfPayments: Number,
    paymentSchedule: Schema.Types.Mixed,
    disclosureProvidedDate: Date,
    acknowledgmentReceived: Boolean,
    rightToCancelProvided: Boolean,
    rightToCancelPeriodEnd: Date
  },
  
  // ECOA specific fields
  ecoa: {
    actionTaken: {
      type: String,
      enum: ['approved', 'denied', 'withdrawn', 'incomplete']
    },
    reasonCodes: [String],
    noticeProvided: Boolean,
    noticeProvidedDate: Date,
    demographicInfo: {
      ethnicity: String,
      race: String,
      sex: String,
      ageCategory: String
    }
  },
  
  // Data access tracking
  dataAccess: {
    dataType: {
      type: String,
      enum: ['pii', 'credit_info', 'bank_info', 'employment_info', 'communication_prefs', 'application_data']
    },
    accessMethod: {
      type: String,
      enum: ['manual_lookup', 'automated_system', 'report_generation', 'api_call']
    },
    accessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    purpose: {
      type: String,
      enum: ['customer_service', 'underwriting', 'collections', 'marketing', 'compliance', 'fraud_investigation']
    },
    dataFields: [String],
    retention: {
      retainUntil: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years default
      },
      retentionReason: {
        type: String,
        required: true
      },
      autoDeleteScheduled: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Communication tracking
  communication: {
    channel: {
      type: String,
      enum: ['phone', 'sms', 'email', 'mail', 'in_person', 'web_chat']
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound']
    },
    initiatedBy: {
      type: String,
      enum: ['customer', 'system', 'agent']
    },
    purpose: {
      type: String,
      enum: ['collections', 'marketing', 'customer_service', 'verification', 'legal_notice']
    },
    consentVerified: Boolean,
    recordingConsent: Boolean,
    duration: Number,
    transcript: {
      type: String,
      select: false // Don't include in queries by default
    }
  },
  
  // Risk assessment
  riskAssessment: {
    riskScore: Number,
    riskFactors: [String],
    fraudIndicators: [String],
    identityVerificationStatus: {
      type: String,
      enum: ['passed', 'failed', 'manual_review']
    },
    deviceFingerprint: String,
    ipAddress: String,
    geolocation: {
      country: String,
      state: String,
      city: String
    },
    ofacCheck: {
      performed: {
        type: Boolean,
        required: true,
        default: false
      },
      result: {
        type: String,
        enum: ['clear', 'match', 'potential_match']
      },
      matchDetails: String
    }
  },
  
  // System info
  systemInfo: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    requestId: String,
    apiVersion: String,
    source: {
      type: String,
      required: [true, 'Source is required'],
      enum: ['web', 'mobile', 'api', 'admin_panel', 'batch_job', 'webhook'],
      default: 'web'
    }
  },
  
  // Regulatory metadata
  regulatory: {
    jurisdiction: [{
      type: String,
      required: true
    }],
    examinationPeriod: Date,
    retentionRequired: {
      type: Boolean,
      required: true,
      default: true
    },
    retentionPeriodYears: {
      type: Number,
      required: true,
      min: [1, 'Retention period must be at least 1 year'],
      default: 7
    },
    subjectToAudit: {
      type: Boolean,
      default: true
    },
    sensitivityLevel: {
      type: String,
      required: true,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'confidential'
    }
  },
  
  // Verification & audit
  verification: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    auditTrail: [{
      action: {
        type: String,
        required: true
      },
      performedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      changes: Schema.Types.Mixed
    }]
  }
}, {
  timestamps: true,
  collection: 'complianceLogs'
});

// Indexes for performance and compliance queries
ComplianceLogSchema.index({ complianceType: 1, createdAt: -1 });
ComplianceLogSchema.index({ user: 1, complianceType: 1 });
ComplianceLogSchema.index({ loan: 1, 'event.type': 1 });
ComplianceLogSchema.index({ 'regulatory.jurisdiction': 1, 'regulatory.sensitivityLevel': 1 });
ComplianceLogSchema.index({ 'dataAccess.retainUntil': 1 }); // For automated deletion
ComplianceLogSchema.index({ 'verification.verified': 1, createdAt: -1 });
ComplianceLogSchema.index({ logId: 1 }, { unique: true });

// Instance Methods
ComplianceLogSchema.methods.isRetentionExpired = function(): boolean {
  if (!this.dataAccess?.retention?.retainUntil) return false;
  return new Date() > this.dataAccess.retention.retainUntil;
};

ComplianceLogSchema.methods.shouldAutoDelete = function(): boolean {
  return this.isRetentionExpired() && 
         this.dataAccess?.retention?.autoDeleteScheduled === true &&
         !this.regulatory.subjectToAudit;
};

ComplianceLogSchema.methods.getRetentionPeriod = function(): number {
  return this.regulatory.retentionPeriodYears || 7;
};

ComplianceLogSchema.methods.addAuditEntry = function(action: string, performedBy: Types.ObjectId, changes?: any): void {
  this.verification.auditTrail.push({
    action,
    performedBy,
    timestamp: new Date(),
    changes
  });
};

ComplianceLogSchema.methods.maskSensitiveData = function(): object {
  const masked = this.toObject();
  
  // Mask sensitive fields based on sensitivity level
  if (this.regulatory.sensitivityLevel === 'restricted') {
    if (masked.fcra) {
      delete masked.fcra.adverseActionReason;
    }
    if (masked.dataAccess) {
      masked.dataAccess.dataFields = ['[REDACTED]'];
    }
    if (masked.communication) {
      delete masked.communication.transcript;
    }
  }
  
  return masked;
};

// Pre-save middleware
ComplianceLogSchema.pre('save', function(next) {
  // Auto-generate log ID if not set
  if (!this.logId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    this.logId = `CL_${timestamp}_${random}`.toUpperCase();
  }
  
  // Set retention date if not specified
  if (this.dataAccess && !this.dataAccess.retention.retainUntil) {
    const retentionYears = this.regulatory.retentionPeriodYears || 7;
    this.dataAccess.retention.retainUntil = new Date(
      Date.now() + retentionYears * 365 * 24 * 60 * 60 * 1000
    );
  }
  
  // Add initial audit entry
  if (this.isNew) {
    this.verification.auditTrail.push({
      action: 'log_created',
      performedBy: this.admin || this.user!,
      timestamp: new Date(),
      changes: { status: 'created' }
    });
  }
  
  next();
});

// Static methods for compliance reporting
ComplianceLogSchema.statics.findByComplianceType = function(type: string, startDate?: Date, endDate?: Date) {
  const query: any = { complianceType: type };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

ComplianceLogSchema.statics.findExpiredRetention = function() {
  return this.find({
    'dataAccess.retention.retainUntil': { $lt: new Date() },
    'dataAccess.retention.autoDeleteScheduled': true,
    'regulatory.subjectToAudit': false
  });
};

export const ComplianceLog = mongoose.model<IComplianceLog>('ComplianceLog', ComplianceLogSchema);