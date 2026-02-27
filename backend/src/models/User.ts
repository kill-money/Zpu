import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Production-grade user interface for real financial operations
export interface IUser extends Document {
  // Basic Authentication
  email: string;
  password: string;
  fullName: string;
  phone: string;
  isEmailVerified: boolean;
  
  // Personal Identifiable Information (PII) - Encrypted
  ssn: string; // Encrypted SSN - never stored in plain text
  dateOfBirth: Date;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    validatedAt?: Date;
    validationProvider?: string;
  };
  
  // Identity Verification Status (KYC/CDD)
  identityVerification: {
    status: 'pending' | 'verified' | 'failed' | 'expired' | 'manual_review';
    documentType?: 'drivers_license' | 'passport' | 'state_id';
    documentNumber?: string; // Encrypted
    verifiedAt?: Date;
    expiresAt?: Date;
    verificationProvider?: 'Jumio' | 'Onfido' | 'Shufti' | 'manual';
    verificationScore?: number;
    fraudScore?: number;
    manualReviewRequired?: boolean;
    verificationDocuments?: string[]; // File IDs
  };
  
  // Financial Profile & Credit Information
  financialProfile: {
    annualIncome?: number;
    incomeSource?: 'employment' | 'self_employment' | 'investment' | 'retirement' | 'other';
    employmentStatus?: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
    employerName?: string;
    employmentStartDate?: Date;
    
    // Credit Information (updated from bureau pulls)
    creditScore?: number;
    creditScoreModel?: 'FICO_8' | 'FICO_9' | 'VantageScore_3' | 'VantageScore_4';
    creditReportPulledAt?: Date;
    creditBureauUsed?: 'Experian' | 'Equifax' | 'TransUnion'[];
    
    // Financial Status
    monthlyHousingPayment?: number;
    monthlyDebtPayments?: number;
    liquidAssets?: number;
    hasBankruptcy?: boolean;
    bankruptcyDischargeDate?: Date;
    hasForeclosure?: boolean;
    foreclosureDate?: Date;
    hasRepossession?: boolean;
    
    // Banking Information (Encrypted)
    primaryBankAccount?: {
      encryptedAccountNumber: string;
      routingNumber: string;
      accountType: 'checking' | 'savings';
      bankName: string;
      verified: boolean;
      verificationMethod?: 'micro_deposits' | 'instant_auth' | 'manual';
      verifiedAt?: Date;
    };
  };
  
  // Compliance & Regulatory
  compliance: {
    // FCRA (Fair Credit Reporting Act)
    fcraConsent: boolean;
    fcraConsentDate?: Date;
    fcraConsentIP?: string;
    
    // TCPA (Telephone Consumer Protection Act)
    tcpaConsent: boolean;
    tcpaConsentDate?: Date;
    tcpaConsentIP?: string;
    
    // Privacy & Marketing
    creditMonitoringConsent: boolean;
    marketingConsent: boolean;
    dataProcessingConsent: boolean;
    privacyPolicyAccepted: boolean;
    termsOfServiceAccepted: boolean;
    lastComplianceUpdate: Date;
    
    // PATRIOT Act / BSA (Bank Secrecy Act) Compliance
    patriotActVerification: {
      ofacScreeningStatus: 'clear' | 'flagged' | 'pending' | 'manual_review';
      ofacLastChecked: Date;
      sanctionsListChecked: string[];
      pepStatus?: 'clear' | 'flagged'; // Politically Exposed Person
      pepDetails?: string;
    };
    
    // CIP (Customer Identification Program)
    cipVerification: {
      status: 'pending' | 'verified' | 'failed';
      verificationMethod: 'document' | 'non_document' | 'combination';
      documentsCollected: string[];
      verifiedAt?: Date;
      riskAssessment: 'low' | 'medium' | 'high';
    };
  };
  
  // Security & Account Management
  security: {
    // Multi-Factor Authentication
    mfaEnabled: boolean;
    mfaMethod?: 'sms' | 'email' | 'totp' | 'hardware_token';
    mfaSecret?: string; // Encrypted TOTP secret
    backupCodes?: string[]; // Encrypted backup codes
    
    // Account Security
    lastPasswordChange?: Date;
    passwordResetTokens?: Array<{
      token: string;
      expiresAt: Date;
      used: boolean;
    }>;
    
    // Login Security
    failedLoginAttempts: number;
    lastFailedLoginAt?: Date;
    accountLocked: boolean;
    lockoutExpiresAt?: Date;
    
    // Password reset
    passwordResetToken?: string;
    passwordResetExpiresAt?: Date;
    
    // Email verification
    emailVerificationToken?: string;
    
    // Device Management
    trustedDevices: Array<{
      id: string;
      name: string;
      fingerprint: string;
      addedAt: Date;
      lastUsed: Date;
      ipAddress?: string;
      userAgent?: string;
    }>;
    
    // Session Management
    activeSessions: Array<{
      sessionId: string;
      ipAddress: string;
      userAgent: string;
      createdAt: Date;
      lastActivity: Date;
      expiresAt: Date;
    }>;
  };
  
  // Audit Trail & Compliance Logging
  audit: {
    createdAt: Date;
    lastLoginAt?: Date;
    lastActivityAt?: Date;
    accountStatus: 'active' | 'pending' | 'suspended' | 'closed' | 'banned';
    suspensionReason?: string;
    closureReason?: string;
    
    // Risk Management
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    riskFactors?: string[];
    fraudAlerts?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      triggeredAt: Date;
      resolved: boolean;
      resolvedAt?: Date;
    }>;
    
    // Regulatory Reporting
    hmda: { // Home Mortgage Disclosure Act data
      ethnicity?: string;
      race?: string;
      sex?: string;
      income?: number;
      reportingYear?: number;
    };
    
    cra: { // Community Reinvestment Act data
      censusTract?: string;
      msa?: string; // Metropolitan Statistical Area
      countyCode?: string;
    };
  };
  
  // Role
  role: 'user' | 'admin' | 'loan_officer' | 'compliance_officer';
  
  // Audit trail for compliance
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  
  // Convenience / route-facing properties
  firstName?: string;
  lastName?: string;
  creditScore?: number;
  isActive?: boolean;
  status?: string;
  deactivatedAt?: Date;
  deactivationReason?: string;
  
  bankAccount?: {
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
    accountType?: string;
    verified?: boolean;
    addedDate?: Date;
  };
  
  creditInfo?: {
    score?: number;
    reportDate?: Date;
    bureau?: string;
    history?: Array<{
      date: Date;
      score: number;
      bureau: string;
      reason: string;
    }>;
  };
  
  preferences?: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
  
  consents?: {
    fcraAuthorization?: boolean;
    fcraAuthorizationDate?: Date;
    tcpaConsent?: boolean;
    tcpaConsentDate?: Date;
    electronicSignatureConsent?: boolean;
    privacyPolicyAccepted?: boolean;
    termsOfServiceAccepted?: boolean;
  };

  // Mongoose timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  encryptSensitiveData(): void;
  decryptSensitiveData(): void;
  performSanctionsScreening(): Promise<boolean>;
  updateRiskAssessment(): void;
  generateMFABackupCodes(): string[];
  verifyMFAToken(token: string): boolean;
}

const UserSchema = new Schema<IUser>({
  // Basic Authentication
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    index: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Invalid email format'
    }
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 12,
    validate: {
      validator: (password: string) => 
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password),
      message: 'Password must contain uppercase, lowercase, number, and special character'
    }
  },
  fullName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: (phone: string) => /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(phone.replace(/[^\d]/g, '')),
      message: 'Invalid US phone number'
    }
  },
  isEmailVerified: { type: Boolean, default: false },
  
  // Personal Identifiable Information (Encrypted)
  ssn: { 
    type: String, 
    required: true,
    validate: {
      validator: function(ssn: string): boolean {
        // This will be an encrypted string, so we validate after decryption
        return !!ssn && ssn.length > 0;
      },
      message: 'SSN is required'
    }
  },
  dateOfBirth: { 
    type: Date, 
    required: true,
    validate: {
      validator: (dob: Date) => {
        const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 18 && age <= 120;
      },
      message: 'Must be at least 18 years old'
    }
  },
  address: {
    street: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, maxlength: 100 },
    state: { 
      type: String, 
      required: true, 
      length: 2,
      uppercase: true,
      validate: {
        validator: (state: string) => /^[A-Z]{2}$/.test(state),
        message: 'State must be 2-letter code'
      }
    },
    zipCode: { 
      type: String, 
      required: true,
      validate: {
        validator: (zip: string) => /^\d{5}(-\d{4})?$/.test(zip),
        message: 'Invalid ZIP code format'
      }
    },
    country: { type: String, required: true, default: 'US' },
    validatedAt: Date,
    validationProvider: String
  },
  
  // Identity Verification
  identityVerification: {
    status: { 
      type: String, 
      enum: ['pending', 'verified', 'failed', 'expired', 'manual_review'],
      default: 'pending'
    },
    documentType: { 
      type: String, 
      enum: ['drivers_license', 'passport', 'state_id']
    },
    documentNumber: String, // Encrypted
    verifiedAt: Date,
    expiresAt: Date,
    verificationProvider: { 
      type: String, 
      enum: ['Jumio', 'Onfido', 'Shufti', 'manual']
    },
    verificationScore: { type: Number, min: 0, max: 100 },
    fraudScore: { type: Number, min: 0, max: 100 },
    manualReviewRequired: { type: Boolean, default: false },
    verificationDocuments: [String]
  },
  
  // Financial Profile
  financialProfile: {
    annualIncome: { type: Number, min: 0, max: 50000000 },
    incomeSource: { 
      type: String, 
      enum: ['employment', 'self_employment', 'investment', 'retirement', 'other']
    },
    employmentStatus: { 
      type: String, 
      enum: ['employed', 'self_employed', 'unemployed', 'retired', 'student']
    },
    employerName: { type: String, maxlength: 200 },
    employmentStartDate: Date,
    
    creditScore: { type: Number, min: 300, max: 850 },
    creditScoreModel: { 
      type: String, 
      enum: ['FICO_8', 'FICO_9', 'VantageScore_3', 'VantageScore_4']
    },
    creditReportPulledAt: Date,
    creditBureauUsed: [{ 
      type: String, 
      enum: ['Experian', 'Equifax', 'TransUnion']
    }],
    
    monthlyHousingPayment: { type: Number, min: 0 },
    monthlyDebtPayments: { type: Number, min: 0 },
    liquidAssets: { type: Number, min: 0 },
    hasBankruptcy: { type: Boolean, default: false },
    bankruptcyDischargeDate: Date,
    hasForeclosure: { type: Boolean, default: false },
    foreclosureDate: Date,
    hasRepossession: { type: Boolean, default: false },
    
    primaryBankAccount: {
      encryptedAccountNumber: String, // Encrypted account number
      routingNumber: { 
        type: String,
        validate: {
          validator: (routing: string) => {
            const clean = routing.replace(/[^\d]/g, '');
            if (clean.length !== 9) return false;
            // ABA checksum validation
            const digits = clean.split('').map(Number);
            const checksum = 3 * (digits[0] + digits[3] + digits[6]) +
                            7 * (digits[1] + digits[4] + digits[7]) +
                            (digits[2] + digits[5] + digits[8]);
            return checksum % 10 === 0;
          },
          message: 'Invalid routing number'
        }
      },
      accountType: { 
        type: String, 
        enum: ['checking', 'savings']
      },
      bankName: { type: String, maxlength: 100 },
      verified: { type: Boolean, default: false },
      verificationMethod: { 
        type: String, 
        enum: ['micro_deposits', 'instant_auth', 'manual']
      },
      verifiedAt: Date
    }
  },
  
  // Compliance & Regulatory
  compliance: {
    fcraConsent: { type: Boolean, required: true, default: false },
    fcraConsentDate: Date,
    fcraConsentIP: String,
    
    tcpaConsent: { type: Boolean, default: false },
    tcpaConsentDate: Date,
    tcpaConsentIP: String,
    
    creditMonitoringConsent: { type: Boolean, default: false },
    marketingConsent: { type: Boolean, default: false },
    dataProcessingConsent: { type: Boolean, required: true, default: false },
    privacyPolicyAccepted: { type: Boolean, required: true, default: false },
    termsOfServiceAccepted: { type: Boolean, required: true, default: false },
    lastComplianceUpdate: { type: Date, default: Date.now },
    
    patriotActVerification: {
      ofacScreeningStatus: { 
        type: String, 
        enum: ['clear', 'flagged', 'pending', 'manual_review'],
        default: 'pending'
      },
      ofacLastChecked: Date,
      sanctionsListChecked: [String],
      pepStatus: { 
        type: String, 
        enum: ['clear', 'flagged']
      },
      pepDetails: String
    },
    
    cipVerification: {
      status: { 
        type: String, 
        enum: ['pending', 'verified', 'failed'],
        default: 'pending'
      },
      verificationMethod: { 
        type: String, 
        enum: ['document', 'non_document', 'combination'],
        default: 'document'
      },
      documentsCollected: [String],
      verifiedAt: Date,
      riskAssessment: { 
        type: String, 
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }
  },
  
  // Security
  security: {
    mfaEnabled: { type: Boolean, default: false },
    mfaMethod: { 
      type: String, 
      enum: ['sms', 'email', 'totp', 'hardware_token']
    },
    mfaSecret: String, // Encrypted
    backupCodes: [String], // Encrypted
    
    lastPasswordChange: Date,
    passwordResetTokens: [{
      token: String,
      expiresAt: Date,
      used: { type: Boolean, default: false }
    }],
    
    failedLoginAttempts: { type: Number, default: 0, max: 10 },
    lastFailedLoginAt: Date,
    accountLocked: { type: Boolean, default: false },
    lockoutExpiresAt: Date,
    
    passwordResetToken: String,
    passwordResetExpiresAt: Date,
    emailVerificationToken: String,
    
    trustedDevices: [{
      id: String,
      name: String,
      fingerprint: String,
      addedAt: { type: Date, default: Date.now },
      lastUsed: { type: Date, default: Date.now },
      ipAddress: String,
      userAgent: String
    }],
    
    activeSessions: [{
      sessionId: String,
      ipAddress: String,
      userAgent: String,
      createdAt: { type: Date, default: Date.now },
      lastActivity: { type: Date, default: Date.now },
      expiresAt: Date
    }]
  },
  
  // Audit Trail
  audit: {
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: Date,
    lastActivityAt: Date,
    accountStatus: { 
      type: String, 
      enum: ['active', 'pending', 'suspended', 'closed', 'banned'],
      default: 'pending'
    },
    suspensionReason: String,
    closureReason: String,
    
    riskLevel: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'extreme'],
      default: 'medium'
    },
    riskFactors: [String],
    fraudAlerts: [{
      type: String,
      severity: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String,
      triggeredAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false },
      resolvedAt: Date
    }],
    
    hmda: {
      ethnicity: String,
      race: String,
      sex: String,
      income: Number,
      reportingYear: Number
    },
    
    cra: {
      censusTract: String,
      msa: String,
      countyCode: String
    }
  },
  
  // Role
  role: {
    type: String,
    enum: ['user', 'admin', 'loan_officer', 'compliance_officer'],
    default: 'user'
  },
  
  // Audit trail for compliance
  auditTrail: [{
    timestamp: { type: Date, default: Date.now },
    action: String,
    performedBy: String,
    notes: String,
    ipAddress: String,
    userAgent: String
  }],

  // Convenience / route-facing fields
  firstName: { type: String },
  lastName: { type: String },
  creditScore: { type: Number },
  isActive: { type: Boolean, default: true },
  status: { type: String, default: 'active' },
  deactivatedAt: { type: Date },
  deactivationReason: { type: String },
  bankAccount: {
    accountNumber: String,
    routingNumber: String,
    bankName: String,
    accountType: String,
    verified: { type: Boolean, default: false },
    addedDate: Date
  },
  creditInfo: {
    score: Number,
    reportDate: Date,
    bureau: String,
    history: [{
      date: Date,
      score: Number,
      bureau: String,
      reason: String
    }]
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  consents: {
    fcraAuthorization: Boolean,
    fcraAuthorizationDate: Date,
    tcpaConsent: Boolean,
    tcpaConsentDate: Date,
    electronicSignatureConsent: Boolean,
    privacyPolicyAccepted: Boolean,
    termsOfServiceAccepted: Boolean
  }
}, {
  timestamps: true
});

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'production-encryption-key-256-bit-strong';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Pre-save middleware for password hashing and data encryption
UserSchema.pre('save', async function (next) {
  const doc = this as any;
  
  // Hash password if modified
  if (doc.isModified('password')) {
    const salt = await bcrypt.genSalt(14); // Increased salt rounds for production
    doc.password = await bcrypt.hash(doc.password, salt);
  }
  
  // Encrypt SSN if modified
  if (doc.isModified('ssn') && doc.ssn) {
    doc.ssn = encrypt(doc.ssn);
  }
  
  // Encrypt bank account number if present and modified
  if (doc.isModified('financialProfile.primaryBankAccount.encryptedAccountNumber') && 
      doc.financialProfile?.primaryBankAccount?.encryptedAccountNumber) {
    doc.financialProfile.primaryBankAccount.encryptedAccountNumber = 
      encrypt(doc.financialProfile.primaryBankAccount.encryptedAccountNumber);
  }
  
  // Update audit trail
  doc.audit.lastActivityAt = new Date();
  
  next();
});

// Encryption utilities
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('financial-data'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted, authTagHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('financial-data'));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Instance methods
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.encryptSensitiveData = function(): void {
  // This method can be called to re-encrypt data if needed
  if (this.ssn && !this.ssn.includes(':')) {
    this.ssn = encrypt(this.ssn);
  }
};

UserSchema.methods.decryptSensitiveData = function(): any {
  // Return a copy with decrypted data for display purposes
  const userObj = this.toObject();
  
  if (userObj.ssn && userObj.ssn.includes(':')) {
    userObj.ssnDecrypted = decrypt(userObj.ssn);
    userObj.ssnMasked = maskSSN(userObj.ssnDecrypted);
  }
  
  return userObj;
};

UserSchema.methods.performSanctionsScreening = async function(): Promise<boolean> {
  // Implement OFAC and sanctions list screening
  // This would integrate with real sanctions screening API
  
  try {
    // Mock implementation - replace with real OFAC API
    const screeningResult = {
      status: 'clear',
      confidence: 0.99,
      matches: []
    };
    
    this.compliance.patriotActVerification.ofacScreeningStatus = screeningResult.status as any;
    this.compliance.patriotActVerification.ofacLastChecked = new Date();
    this.compliance.patriotActVerification.sanctionsListChecked = ['OFAC', 'EU', 'UN'];
    
    await this.save();
    return screeningResult.status === 'clear';
    
  } catch (error) {
    console.error('Sanctions screening error:', error);
    this.compliance.patriotActVerification.ofacScreeningStatus = 'manual_review';
    return false;
  }
};

UserSchema.methods.updateRiskAssessment = function(): void {
  let riskScore = 0;
  const riskFactors: string[] = [];
  
  // Age-based risk
  const age = (Date.now() - this.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 21) {
    riskScore += 10;
    riskFactors.push('Young age');
  }
  
  // Credit score risk
  if (this.financialProfile?.creditScore) {
    if (this.financialProfile.creditScore < 580) {
      riskScore += 25;
      riskFactors.push('Low credit score');
    } else if (this.financialProfile.creditScore < 640) {
      riskScore += 15;
      riskFactors.push('Below average credit score');
    }
  }
  
  // Employment risk
  if (this.financialProfile?.employmentStatus === 'unemployed') {
    riskScore += 20;
    riskFactors.push('Unemployed');
  }
  
  // Bankruptcy/foreclosure history
  if (this.financialProfile?.hasBankruptcy) {
    riskScore += 15;
    riskFactors.push('Bankruptcy history');
  }
  
  if (this.financialProfile?.hasForeclosure) {
    riskScore += 15;
    riskFactors.push('Foreclosure history');
  }
  
  // Fraud alerts
  if (this.audit.fraudAlerts && this.audit.fraudAlerts.length > 0) {
    riskScore += 30;
    riskFactors.push('Previous fraud alerts');
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  if (riskScore <= 10) riskLevel = 'low';
  else if (riskScore <= 25) riskLevel = 'medium';
  else if (riskScore <= 50) riskLevel = 'high';
  else riskLevel = 'extreme';
  
  this.audit.riskLevel = riskLevel;
  this.audit.riskFactors = riskFactors;
};

UserSchema.methods.generateMFABackupCodes = function(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  this.security.backupCodes = codes.map(code => encrypt(code));
  return codes; // Return unencrypted codes for display to user
};

UserSchema.methods.verifyMFAToken = function(token: string): boolean {
  // Implement TOTP verification logic here
  // This would use libraries like 'speakeasy' for TOTP verification
  return true; // Placeholder
};

// Utility function for SSN masking
function maskSSN(ssn: string): string {
  const cleanSSN = ssn.replace(/[^\d]/g, '');
  if (cleanSSN.length !== 9) return 'XXX-XX-XXXX';
  return `XXX-XX-${cleanSSN.slice(-4)}`;
}

// Indexes for performance and compliance
UserSchema.index({ email: 1 });
UserSchema.index({ 'audit.accountStatus': 1 });
UserSchema.index({ 'audit.riskLevel': 1 });
UserSchema.index({ 'compliance.patriotActVerification.ofacScreeningStatus': 1 });
UserSchema.index({ 'identityVerification.status': 1 });
UserSchema.index({ 'audit.createdAt': 1 });
UserSchema.index({ 'audit.lastLoginAt': 1 });

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
