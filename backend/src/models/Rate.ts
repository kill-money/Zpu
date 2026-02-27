import mongoose, { Document, Schema } from 'mongoose';

// US Market Interest Rate Management
export interface IRate extends Document<mongoose.Types.ObjectId> {
  // Rate Identification
  rateId: string; // Unique rate identifier
  name: string; // Rate plan name (e.g., "Prime Plus", "Standard Rate")
  description?: string;
  
  // Rate Details
  baseRate: number; // Base APR percentage
  minRate: number; // Minimum possible APR
  maxRate: number; // Maximum possible APR
  
  // Risk-based pricing tiers
  riskTiers: {
    tier: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    creditScoreMin: number;
    creditScoreMax: number;
    rateAdjustment: number; // Percentage points added to base rate
    finalRate: number; // Calculated final APR
  }[];
  
  // Term-based adjustments
  termAdjustments: {
    termMonths: number; // 12, 24, 36, 48, 60
    rateAdjustment: number; // Percentage points
  }[];
  
  // Loan amount adjustments
  amountAdjustments: {
    minAmount: number;
    maxAmount: number;
    rateAdjustment: number; // Percentage points
  }[];
  
  // State-specific rates (compliance with state usury laws)
  stateRates: {
    state: string; // US state code (e.g., 'CA', 'NY')
    maxLegalRate: number; // State usury limit
    rateOverride?: number; // Override rate if needed
    isActive: boolean;
  }[];
  
  // Fees associated with this rate
  fees: {
    originationFee: {
      type: 'percentage' | 'fixed';
      value: number; // Percentage or dollar amount
      min?: number; // Minimum fee
      max?: number; // Maximum fee
    };
    processingFee?: number;
    underwritingFee?: number;
    latePaymentFee: number;
    insufficientFundsFee: number;
    prepaymentPenalty: {
      enabled: boolean;
      type?: 'percentage' | 'fixed';
      value?: number;
      termLimit?: number; // Only applies to first X months
    };
  };
  
  // Rate Validity
  effectiveDate: Date;
  expirationDate?: Date;
  isActive: boolean;
  
  // Usage Constraints
  constraints: {
    minCreditScore?: number;
    maxCreditScore?: number;
    minIncome?: number;
    maxDebtToIncomeRatio?: number;
    allowedStates: string[]; // List of allowed US states
    excludedStates: string[]; // List of excluded US states
    minLoanAmount: number;
    maxLoanAmount: number;
    allowedTerms: number[]; // Allowed loan terms in months
  };
  
  // Promotional Settings
  promotional: {
    isPromotional: boolean;
    promotionName?: string;
    promotionCode?: string;
    promotionStart?: Date;
    promotionEnd?: Date;
    promotionDescription?: string;
    discountRate?: number; // Percentage points off
  };
  
  // Compliance & Regulatory
  compliance: {
    usuryCap: number; // Maximum allowed rate by law
    tilaCompliant: boolean; // Truth in Lending Act compliant
    stateCompliant: boolean; // State-specific compliance
    federalCompliant: boolean; // Federal compliance
    lastComplianceCheck: Date;
  };
  
  // Performance Tracking
  performance: {
    totalLoansIssued: number;
    totalVolumeIssued: number; // Dollar amount
    averageApprovalRate: number;
    averageDefaultRate: number;
    lastUpdated: Date;
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId; // Admin user who created
  updatedBy?: mongoose.Types.ObjectId; // Admin user who last updated
  version: number; // Rate version for tracking changes
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateFinalRate(creditScore: number, loanAmount: number, termMonths: number, state: string): number;
  calculateMonthlyPayment(principal: number, termMonths: number, creditScore: number): number;
  isValidForApplication(creditScore: number, income: number, dti: number, state: string, loanAmount: number, term: number): boolean;
  getApplicableFees(loanAmount: number): object;
  isCurrentlyActive(): boolean;
}

const RateSchema = new Schema<IRate>({
  rateId: {
    type: String,
    required: [true, 'Rate ID is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  
  name: {
    type: String,
    required: [true, 'Rate name is required'],
    trim: true,
    maxlength: [100, 'Rate name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Base rates
  baseRate: {
    type: Number,
    required: [true, 'Base rate is required'],
    min: [0, 'Rate cannot be negative'],
    max: [50, 'Rate cannot exceed 50%']
  },
  
  minRate: {
    type: Number,
    required: [true, 'Minimum rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  
  maxRate: {
    type: Number,
    required: [true, 'Maximum rate is required'],
    max: [36, 'Rate cannot exceed 36% (federal usury limit)']
  },
  
  // Risk tiers
  riskTiers: [{
    tier: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    },
    creditScoreMin: {
      type: Number,
      required: true,
      min: [300, 'Credit score cannot be below 300'],
      max: [850, 'Credit score cannot exceed 850']
    },
    creditScoreMax: {
      type: Number,
      required: true,
      min: [300, 'Credit score cannot be below 300'],
      max: [850, 'Credit score cannot exceed 850']
    },
    rateAdjustment: {
      type: Number,
      required: true
    },
    finalRate: {
      type: Number,
      required: true
    }
  }],
  
  // Term adjustments
  termAdjustments: [{
    termMonths: {
      type: Number,
      required: true,
      enum: [12, 24, 36, 48, 60]
    },
    rateAdjustment: {
      type: Number,
      required: true
    }
  }],
  
  // Amount adjustments
  amountAdjustments: [{
    minAmount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    maxAmount: {
      type: Number,
      required: true
    },
    rateAdjustment: {
      type: Number,
      required: true
    }
  }],
  
  // State rates
  stateRates: [{
    state: {
      type: String,
      required: true,
      uppercase: true,
      length: [2, 'State code must be 2 characters']
    },
    maxLegalRate: {
      type: Number,
      required: true,
      max: [36, 'Rate cannot exceed 36%']
    },
    rateOverride: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Fees structure
  fees: {
    originationFee: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
      },
      value: {
        type: Number,
        required: true,
        min: [0, 'Fee cannot be negative']
      },
      min: Number,
      max: Number
    },
    processingFee: {
      type: Number,
      min: [0, 'Fee cannot be negative'],
      default: 0
    },
    underwritingFee: {
      type: Number,
      min: [0, 'Fee cannot be negative'],
      default: 0
    },
    latePaymentFee: {
      type: Number,
      required: [true, 'Late payment fee is required'],
      min: [0, 'Fee cannot be negative']
    },
    insufficientFundsFee: {
      type: Number,
      required: [true, 'NSF fee is required'],
      min: [0, 'Fee cannot be negative']
    },
    prepaymentPenalty: {
      enabled: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: Number,
      termLimit: Number
    }
  },
  
  // Validity
  effectiveDate: {
    type: Date,
    required: [true, 'Effective date is required'],
    default: Date.now
  },
  
  expirationDate: Date,
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Constraints
  constraints: {
    minCreditScore: {
      type: Number,
      min: [300, 'Credit score cannot be below 300']
    },
    maxCreditScore: {
      type: Number,
      max: [850, 'Credit score cannot exceed 850']
    },
    minIncome: {
      type: Number,
      min: [0, 'Income cannot be negative']
    },
    maxDebtToIncomeRatio: {
      type: Number,
      min: [0, 'DTI cannot be negative'],
      max: [100, 'DTI cannot exceed 100%']
    },
    allowedStates: [{
      type: String,
      uppercase: true,
      length: [2, 'State code must be 2 characters']
    }],
    excludedStates: [{
      type: String,
      uppercase: true,
      length: [2, 'State code must be 2 characters']
    }],
    minLoanAmount: {
      type: Number,
      required: [true, 'Minimum loan amount is required'],
      min: [500, 'Minimum loan amount cannot be below $500']
    },
    maxLoanAmount: {
      type: Number,
      required: [true, 'Maximum loan amount is required'],
      max: [100000, 'Maximum loan amount cannot exceed $100,000']
    },
    allowedTerms: [{
      type: Number,
      enum: [12, 24, 36, 48, 60]
    }]
  },
  
  // Promotional
  promotional: {
    isPromotional: {
      type: Boolean,
      default: false
    },
    promotionName: String,
    promotionCode: String,
    promotionStart: Date,
    promotionEnd: Date,
    promotionDescription: String,
    discountRate: {
      type: Number,
      min: [0, 'Discount cannot be negative']
    }
  },
  
  // Compliance
  compliance: {
    usuryCap: {
      type: Number,
      required: [true, 'Usury cap is required'],
      max: [36, 'Usury cap cannot exceed 36%']
    },
    tilaCompliant: {
      type: Boolean,
      required: true,
      default: true
    },
    stateCompliant: {
      type: Boolean,
      required: true,
      default: true
    },
    federalCompliant: {
      type: Boolean,
      required: true,
      default: true
    },
    lastComplianceCheck: {
      type: Date,
      default: Date.now
    }
  },
  
  // Performance
  performance: {
    totalLoansIssued: {
      type: Number,
      default: 0
    },
    totalVolumeIssued: {
      type: Number,
      default: 0
    },
    averageApprovalRate: {
      type: Number,
      min: [0, 'Rate cannot be negative'],
      max: [100, 'Rate cannot exceed 100%'],
      default: 0
    },
    averageDefaultRate: {
      type: Number,
      min: [0, 'Rate cannot be negative'],
      max: [100, 'Rate cannot exceed 100%'],
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'rates'
});

// Indexes for performance
RateSchema.index({ rateId: 1 }, { unique: true });
RateSchema.index({ isActive: 1, effectiveDate: 1 });
RateSchema.index({ 'constraints.allowedStates': 1 });
RateSchema.index({ 'riskTiers.creditScoreMin': 1, 'riskTiers.creditScoreMax': 1 });
RateSchema.index({ effectiveDate: 1, expirationDate: 1 });

// Instance Methods
RateSchema.methods.calculateFinalRate = function(creditScore: number, loanAmount: number, termMonths: number, state: string): number {
  let finalRate = this.baseRate;
  
  // Apply risk tier adjustment
  const applicableTier = this.riskTiers.find((tier: any) => 
    creditScore >= tier.creditScoreMin && creditScore <= tier.creditScoreMax
  );
  
  if (applicableTier) {
    finalRate = applicableTier.finalRate;
  }
  
  // Apply term adjustment
  const termAdjustment = this.termAdjustments.find((adj: any) => adj.termMonths === termMonths);
  if (termAdjustment) {
    finalRate += termAdjustment.rateAdjustment;
  }
  
  // Apply amount adjustment
  const amountAdjustment = this.amountAdjustments.find((adj: any) => 
    loanAmount >= adj.minAmount && loanAmount <= adj.maxAmount
  );
  if (amountAdjustment) {
    finalRate += amountAdjustment.rateAdjustment;
  }
  
  // Check state-specific caps
  const stateRate = this.stateRates.find((sr: any) => sr.state === state && sr.isActive);
  if (stateRate) {
    finalRate = Math.min(finalRate, stateRate.maxLegalRate);
    if (stateRate.rateOverride) {
      finalRate = stateRate.rateOverride;
    }
  }
  
  // Ensure within bounds
  finalRate = Math.max(this.minRate, Math.min(this.maxRate, finalRate));
  
  return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
};

RateSchema.methods.calculateMonthlyPayment = function(principal: number, termMonths: number, creditScore: number): number {
  const rate = this.calculateFinalRate(creditScore, principal, termMonths, 'CA'); // Default state
  const monthlyRate = rate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                        (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Math.round(monthlyPayment * 100) / 100;
};

RateSchema.methods.isValidForApplication = function(
  creditScore: number, 
  income: number, 
  dti: number, 
  state: string, 
  loanAmount: number, 
  term: number
): boolean {
  const constraints = this.constraints;
  
  // Check credit score range
  if (constraints.minCreditScore && creditScore < constraints.minCreditScore) return false;
  if (constraints.maxCreditScore && creditScore > constraints.maxCreditScore) return false;
  
  // Check income
  if (constraints.minIncome && income < constraints.minIncome) return false;
  
  // Check debt-to-income ratio
  if (constraints.maxDebtToIncomeRatio && dti > constraints.maxDebtToIncomeRatio) return false;
  
  // Check state eligibility
  if (constraints.excludedStates.includes(state)) return false;
  if (constraints.allowedStates.length > 0 && !constraints.allowedStates.includes(state)) return false;
  
  // Check loan amount
  if (loanAmount < constraints.minLoanAmount || loanAmount > constraints.maxLoanAmount) return false;
  
  // Check term
  if (constraints.allowedTerms.length > 0 && !constraints.allowedTerms.includes(term)) return false;
  
  return true;
};

RateSchema.methods.getApplicableFees = function(loanAmount: number): object {
  const fees = this.fees;
  let originationFee = 0;
  
  if (fees.originationFee.type === 'percentage') {
    originationFee = loanAmount * (fees.originationFee.value / 100);
  } else {
    originationFee = fees.originationFee.value;
  }
  
  // Apply min/max limits
  if (fees.originationFee.min) {
    originationFee = Math.max(originationFee, fees.originationFee.min);
  }
  if (fees.originationFee.max) {
    originationFee = Math.min(originationFee, fees.originationFee.max);
  }
  
  return {
    originationFee: Math.round(originationFee * 100) / 100,
    processingFee: fees.processingFee || 0,
    underwritingFee: fees.underwritingFee || 0,
    latePaymentFee: fees.latePaymentFee,
    insufficientFundsFee: fees.insufficientFundsFee,
    totalFees: Math.round((originationFee + (fees.processingFee || 0) + (fees.underwritingFee || 0)) * 100) / 100
  };
};

RateSchema.methods.isCurrentlyActive = function(): boolean {
  const now = new Date();
  return this.isActive && 
         this.effectiveDate <= now && 
         (!this.expirationDate || this.expirationDate >= now);
};

// Pre-save middleware
RateSchema.pre('save', function(next) {
  // Increment version on updates
  if (!this.isNew) {
    this.version += 1;
  }
  
  // Calculate final rates for risk tiers
  this.riskTiers.forEach(tier => {
    tier.finalRate = this.baseRate + tier.rateAdjustment;
    tier.finalRate = Math.max(this.minRate, Math.min(this.maxRate, tier.finalRate));
  });
  
  // Validate rate constraints
  if (this.minRate > this.maxRate) {
    return next(new Error('Minimum rate cannot exceed maximum rate'));
  }
  
  if (this.baseRate < this.minRate || this.baseRate > this.maxRate) {
    return next(new Error('Base rate must be within min/max range'));
  }
  
  next();
});

export const Rate = mongoose.model<IRate>('Rate', RateSchema);