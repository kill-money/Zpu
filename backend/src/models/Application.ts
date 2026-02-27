import mongoose, { Document, Schema, Types } from 'mongoose';

// US Loan Application tracking separate from main Loan document
export interface IApplication extends Document<mongoose.Types.ObjectId> {
  user: Types.ObjectId;
  
  // Application Flow Control
  currentStep: number; // Multi-step form progress (1-7)
  totalSteps: number;
  isComplete: boolean;
  
  // Application Steps Data
  steps: {
    // Step 1: Personal Information
    personalInfo: {
      completed: boolean;
      data: {
        firstName: string;
        lastName: string;
        middleName?: string;
        dateOfBirth: Date;
        ssn: string; // Will be encrypted before storage
        phone: string;
        email: string;
      };
    };
    
    // Step 2: Address Information
    addressInfo: {
      completed: boolean;
      data: {
        street1: string;
        street2?: string;
        city: string;
        state: string;
        zipCode: string;
        yearsAtAddress: number;
        residenceType: 'own' | 'rent' | 'other';
        monthlyRentMortgage?: number;
      };
    };
    
    // Step 3: Employment Information
    employmentInfo: {
      completed: boolean;
      data: {
        status: 'employed' | 'self-employed' | 'unemployed' | 'retired' | 'student';
        employer?: string;
        jobTitle?: string;
        workPhone?: string;
        monthlyIncome: number;
        employmentLength: number; // months
        payday1?: Date;
        payday2?: Date;
        payFrequency: 'weekly' | 'biweekly' | 'monthly' | 'other';
      };
    };
    
    // Step 4: Bank Account Information
    bankInfo: {
      completed: boolean;
      data: {
        bankName: string;
        accountType: 'checking' | 'savings';
        routingNumber: string;
        accountNumber: string; // Will be encrypted
        monthsWithBank: number;
        directDeposit: boolean;
      };
    };
    
    // Step 5: Loan Information
    loanInfo: {
      completed: boolean;
      data: {
        requestedAmount: number;
        purpose: 'debt_consolidation' | 'home_improvement' | 'medical' | 'vacation' | 'major_purchase' | 'other';
        purposeDescription?: string;
        preferredTerm: number; // months
      };
    };
    
    // Step 6: References (if required)
    references: {
      completed: boolean;
      data: {
        reference1: {
          name: string;
          relationship: string;
          phone: string;
        };
        reference2?: {
          name: string;
          relationship: string;
          phone: string;
        };
      };
    };
    
    // Step 7: Consents & Final Review
    consents: {
      completed: boolean;
      data: {
        fcraAuthorization: boolean;
        fcraAuthorizationDate?: Date;
        tcpaConsent: boolean;
        tcpaConsentDate?: Date;
        electronicSignatureConsent: boolean;
        privacyPolicyAccepted: boolean;
        termsOfServiceAccepted: boolean;
        estatementConsent: boolean;
        marketingConsent?: boolean;
      };
    };
  };
  
  // Real-time Validation Results
  validationResults: {
    personalInfoValid: boolean;
    addressValid: boolean;
    employmentValid: boolean;
    bankAccountValid: boolean;
    overallValid: boolean;
    validationErrors: string[];
  };
  
  // Application Processing
  processing: {
    submitted: boolean;
    submittedAt?: Date;
    processingStarted: boolean;
    processingStartedAt?: Date;
    convertedToLoan: boolean;
    convertedAt?: Date;
    loanId?: Types.ObjectId;
  };
  
  // Pre-qualification Results (soft credit check)
  preQualification: {
    completed: boolean;
    completedAt?: Date;
    creditScore?: number;
    preQualifiedAmount?: number;
    estimatedRate?: number;
    riskCategory?: 'low' | 'medium' | 'high';
    preQualificationCode?: string;
  };
  
  // Application Metadata
  metadata: {
    source: 'web' | 'mobile' | 'partner';
    referralCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  };
  
  // Time Tracking
  timeTracking: {
    startedAt: Date;
    lastActivityAt: Date;
    completedAt?: Date;
    timeSpentPerStep: {
      step: number;
      timeSpent: number; // seconds
    }[];
    totalTimeSpent?: number; // seconds
  };
  
  // Fraud Prevention
  antifraud: {
    riskScore?: number;
    deviceId?: string;
    ipGeolocation?: {
      country: string;
      state: string;
      city: string;
      lat: number;
      lon: number;
    };
    behaviorFlags: string[];
    duplicateCheck: boolean;
    velocityCheck: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Convenience / route-facing top-level fields
  status?: string;
  submittedAt?: Date;
  amount?: number;
  purpose?: string;
  loan?: Types.ObjectId;
  applicantInfo?: any;
  loanDetails?: any;
  ipAddress?: string;
  userAgent?: string;
  
  // Methods
  calculateCompletionPercentage(): number;
  getNextStep(): number;
  canProceedToStep(stepNumber: number): boolean;
  markStepComplete(stepNumber: number): void;
  convertToLoan(): Promise<Types.ObjectId>;
}

const ApplicationSchema = new Schema<IApplication>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  
  currentStep: {
    type: Number,
    min: [1, 'Step number must be at least 1'],
    max: [7, 'Step number cannot exceed 7'],
    default: 1
  },
  
  totalSteps: {
    type: Number,
    default: 7
  },
  
  isComplete: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Application Steps
  steps: {
    personalInfo: {
      completed: { type: Boolean, default: false },
      data: {
        firstName: String,
        lastName: String,
        middleName: String,
        dateOfBirth: Date,
        ssn: String, // Encrypted
        phone: String,
        email: String
      }
    },
    
    addressInfo: {
      completed: { type: Boolean, default: false },
      data: {
        street1: String,
        street2: String,
        city: String,
        state: String,
        zipCode: String,
        yearsAtAddress: Number,
        residenceType: {
          type: String,
          enum: ['own', 'rent', 'other']
        },
        monthlyRentMortgage: Number
      }
    },
    
    employmentInfo: {
      completed: { type: Boolean, default: false },
      data: {
        status: {
          type: String,
          enum: ['employed', 'self-employed', 'unemployed', 'retired', 'student']
        },
        employer: String,
        jobTitle: String,
        workPhone: String,
        monthlyIncome: Number,
        employmentLength: Number,
        payday1: Date,
        payday2: Date,
        payFrequency: {
          type: String,
          enum: ['weekly', 'biweekly', 'monthly', 'other']
        }
      }
    },
    
    bankInfo: {
      completed: { type: Boolean, default: false },
      data: {
        bankName: String,
        accountType: {
          type: String,
          enum: ['checking', 'savings']
        },
        routingNumber: String,
        accountNumber: String, // Encrypted
        monthsWithBank: Number,
        directDeposit: Boolean
      }
    },
    
    loanInfo: {
      completed: { type: Boolean, default: false },
      data: {
        requestedAmount: {
          type: Number,
          min: [1000, 'Minimum loan amount is $1,000'],
          max: [50000, 'Maximum loan amount is $50,000']
        },
        purpose: {
          type: String,
          enum: ['debt_consolidation', 'home_improvement', 'medical', 'vacation', 'major_purchase', 'other']
        },
        purposeDescription: String,
        preferredTerm: {
          type: Number,
          enum: [12, 24, 36, 48, 60]
        }
      }
    },
    
    references: {
      completed: { type: Boolean, default: false },
      data: {
        reference1: {
          name: String,
          relationship: String,
          phone: String
        },
        reference2: {
          name: String,
          relationship: String,
          phone: String
        }
      }
    },
    
    consents: {
      completed: { type: Boolean, default: false },
      data: {
        fcraAuthorization: { type: Boolean, required: true },
        fcraAuthorizationDate: Date,
        tcpaConsent: { type: Boolean, required: true },
        tcpaConsentDate: Date,
        electronicSignatureConsent: { type: Boolean, required: true },
        privacyPolicyAccepted: { type: Boolean, required: true },
        termsOfServiceAccepted: { type: Boolean, required: true },
        estatementConsent: { type: Boolean, required: true },
        marketingConsent: Boolean
      }
    }
  },
  
  // Validation Results
  validationResults: {
    personalInfoValid: { type: Boolean, default: false },
    addressValid: { type: Boolean, default: false },
    employmentValid: { type: Boolean, default: false },
    bankAccountValid: { type: Boolean, default: false },
    overallValid: { type: Boolean, default: false },
    validationErrors: [String]
  },
  
  // Processing
  processing: {
    submitted: { type: Boolean, default: false },
    submittedAt: Date,
    processingStarted: { type: Boolean, default: false },
    processingStartedAt: Date,
    convertedToLoan: { type: Boolean, default: false },
    convertedAt: Date,
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan'
    }
  },
  
  // Pre-qualification
  preQualification: {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    creditScore: Number,
    preQualifiedAmount: Number,
    estimatedRate: Number,
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    preQualificationCode: String
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'partner'],
      default: 'web'
    },
    referralCode: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String
  },
  
  // Time Tracking
  timeTracking: {
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    timeSpentPerStep: [{
      step: Number,
      timeSpent: Number
    }],
    totalTimeSpent: Number
  },
  
  // Anti-fraud
  antifraud: {
    riskScore: Number,
    deviceId: String,
    ipGeolocation: {
      country: String,
      state: String,
      city: String,
      lat: Number,
      lon: Number
    },
    behaviorFlags: [String],
    duplicateCheck: { type: Boolean, default: false },
    velocityCheck: { type: Boolean, default: false }
  },

  // Convenience / route-facing top-level fields
  status: { type: String, default: 'draft' },
  submittedAt: { type: Date },
  amount: { type: Number },
  purpose: { type: String },
  loan: { type: Schema.Types.ObjectId, ref: 'Loan' },
  applicantInfo: { type: Schema.Types.Mixed },
  loanDetails: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String }
}, {
  timestamps: true,
  collection: 'applications'
});

// Indexes for performance
ApplicationSchema.index({ user: 1, isComplete: 1 });
ApplicationSchema.index({ currentStep: 1 });
ApplicationSchema.index({ 'processing.submitted': 1, 'processing.convertedToLoan': 1 });
ApplicationSchema.index({ createdAt: -1 });
ApplicationSchema.index({ 'timeTracking.lastActivityAt': 1 });

// Instance Methods
ApplicationSchema.methods.calculateCompletionPercentage = function(): number {
  const steps = this.steps;
  const completedSteps = Object.values(steps).filter((step: any) => step.completed).length;
  return Math.round((completedSteps / this.totalSteps) * 100);
};

ApplicationSchema.methods.getNextStep = function(): number {
  if (this.isComplete) return -1;
  return Math.min(this.currentStep + 1, this.totalSteps);
};

ApplicationSchema.methods.canProceedToStep = function(stepNumber: number): boolean {
  if (stepNumber <= 1) return true;
  if (stepNumber > this.totalSteps) return false;
  
  // Check if previous steps are completed
  const stepKeys = ['personalInfo', 'addressInfo', 'employmentInfo', 'bankInfo', 'loanInfo', 'references', 'consents'];
  
  for (let i = 0; i < stepNumber - 1; i++) {
    if (!this.steps[stepKeys[i]]?.completed) {
      return false;
    }
  }
  
  return true;
};

ApplicationSchema.methods.markStepComplete = function(stepNumber: number): void {
  const stepKeys = ['personalInfo', 'addressInfo', 'employmentInfo', 'bankInfo', 'loanInfo', 'references', 'consents'];
  
  if (stepNumber > 0 && stepNumber <= stepKeys.length) {
    this.steps[stepKeys[stepNumber - 1]].completed = true;
    this.currentStep = Math.max(this.currentStep, stepNumber);
    
    // Update activity timestamp
    this.timeTracking.lastActivityAt = new Date();
    
    // Check if application is complete
    const allStepsComplete = stepKeys.every(key => this.steps[key]?.completed);
    if (allStepsComplete) {
      this.isComplete = true;
      this.timeTracking.completedAt = new Date();
    }
  }
};

ApplicationSchema.methods.convertToLoan = async function(): Promise<Types.ObjectId> {
  const { Loan } = require('./Loan');
  
  if (!this.isComplete || this.processing.convertedToLoan) {
    throw new Error('Application not ready for conversion or already converted');
  }
  
  const loanData = {
    user: this.user,
    amount: this.steps.loanInfo.data.requestedAmount,
    purpose: this.steps.loanInfo.data.purpose,
    purposeDescription: this.steps.loanInfo.data.purposeDescription,
    term: this.steps.loanInfo.data.preferredTerm,
    status: 'pending',
    source: this.metadata.source,
    referralCode: this.metadata.referralCode,
    utmSource: this.metadata.utmSource,
    utmMedium: this.metadata.utmMedium,
    utmCampaign: this.metadata.utmCampaign,
    ipAddress: this.metadata.ipAddress,
    userAgent: this.metadata.userAgent,
    
    // Copy compliance consents
    compliance: {
      fcraDisclosureSent: false,
      tcpaConsentObtained: this.steps.consents.data.tcpaConsent,
      tcpaConsentDate: this.steps.consents.data.tcpaConsentDate,
      estatementConsent: this.steps.consents.data.estatementConsent
    }
  };
  
  const loan = new Loan(loanData);
  await loan.save();
  
  // Mark application as converted
  this.processing.convertedToLoan = true;
  this.processing.convertedAt = new Date();
  this.processing.loanId = loan._id;
  await this.save();
  
  return loan._id;
};

// Pre-save middleware
ApplicationSchema.pre('save', function(next) {
  // Update last activity timestamp
  this.timeTracking.lastActivityAt = new Date();
  
  // Validate overall application
  this.validationResults.overallValid = this.isComplete && 
    this.validationResults.personalInfoValid &&
    this.validationResults.addressValid &&
    this.validationResults.employmentValid &&
    this.validationResults.bankAccountValid;
  
  next();
});

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);