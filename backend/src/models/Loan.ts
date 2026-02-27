import mongoose, { Document, Schema, Types } from 'mongoose';

// US market loan application structure
export interface ILoan extends Document<mongoose.Types.ObjectId> {
  user: Types.ObjectId;
  
  // Loan Basic Information
  amount: number; // Requested loan amount
  purpose: 'debt_consolidation' | 'home_improvement' | 'medical' | 'vacation' | 'major_purchase' | 'other';
  purposeDescription?: string;
  
  // Terms (calculated based on creditworthiness)
  term: number; // months (12, 24, 36, 48, 60)
  interestRate: number; // APR (Annual Percentage Rate)
  monthlyPayment: number;
  totalPayment: number;
  
  // Application Status
  status: 'pending' | 'under_review' | 'approved' | 'funded' | 'rejected' | 'cancelled' | 'accepted' | 'pending_documents' | 'terms_updated' | 'active';
  substatus?: string; // Additional status details
  
  // Credit Decision Information
  creditDecision: {
    creditScore?: number;
    creditGrade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    riskCategory?: 'low' | 'medium' | 'high';
    debtToIncomeRatio?: number;
    creditUtilization?: number;
    paymentHistory?: number; // percentage
    creditAge?: number; // months
    newCreditInquiries?: number;
    creditMixScore?: number;
  };
  
  // Underwriting Information
  underwriting: {
    autoDecision?: boolean;
    manualReviewRequired?: boolean;
    riskScore?: number;
    riskFactors?: string[];
    incomeVerification?: 'verified' | 'stated' | 'not_verified';
    employmentVerification?: boolean;
    bankAccountVerification?: boolean;
    identityVerification?: boolean;
  };
  
  // TILA (Truth in Lending Act) Disclosures
  tilaDisclosures: {
    apr: number; // Annual Percentage Rate
    financeCharge: number; // Total interest + fees
    amountFinanced: number; // Loan amount
    totalOfPayments: number; // Total amount to be paid
    paymentSchedule: {
      numberOfPayments: number;
      amountOfPayments: number;
      whenPaymentsDue: string; // e.g., "Monthly beginning 30 days after loan funding"
    };
    latePaymentFee?: number;
    prepaymentPenalty?: boolean;
  };
  
  // Fees Structure
  fees: {
    originationFee?: number;
    originationFeeRate?: number; // percentage
    processingFee?: number;
    underwritingFee?: number;
    totalFees: number;
  };
  
  // Document Requirements
  documents: {
    required: string[]; // List of required document types
    submitted: {
      type: string;
      filename: string;
      uploadedAt: Date;
      verified: boolean;
    }[];
    allSubmitted: boolean;
    allVerified: boolean;
  };
  
  // Funding Information
  funding: {
    fundingDate?: Date;
    fundingAmount?: number;
    fundingMethod?: 'ach' | 'wire' | 'check';
    fundingBankAccount?: {
      bankName: string;
      accountType: 'checking' | 'savings';
      routingNumber: string;
      accountNumberLast4: string;
    };
    fundingStatus?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  };
  
  // Repayment Information
  repayment: {
    firstPaymentDate?: Date;
    paymentDay: number; // day of month (1-28)
    autopayEnabled: boolean;
    autopayBankAccount?: {
      bankName: string;
      routingNumber: string;
      accountNumberLast4: string;
    };
    currentBalance?: number;
    totalPaid?: number;
    paymentsRemaining?: number;
    nextPaymentDate?: Date;
    nextPaymentAmount?: number;
  };
  
  // Approval/Rejection Details
  decision: {
    approvedBy?: Types.ObjectId; // Admin user ID
    approvedAt?: Date;
    rejectedBy?: Types.ObjectId; // Admin user ID
    rejectedAt?: Date;
    rejectionReason?: string;
    rejectionCode?: string; // Standard rejection codes
    adverseActionRequired?: boolean; // FCRA adverse action notice required
    adverseActionSentAt?: Date;
    decision?: string;
    notes?: string;
    terms?: any;
    conditions?: any;
  };
  
  // Compliance Tracking
  compliance: {
    fcraDisclosureSent?: boolean;
    fcraDisclosureSentAt?: Date;
    fcraAdverseActionSent?: boolean;
    fcraAdverseActionSentAt?: Date;
    tcpaConsentObtained?: boolean;
    tcpaConsentDate?: Date;
    tilaDisclosureProvided?: boolean;
    tilaDisclosureProvidedAt?: Date;
    estatementConsent?: boolean;
  };
  
  // Communication Log
  communications: {
    type: 'email' | 'sms' | 'call' | 'letter' | 'system';
    direction: 'inbound' | 'outbound';
    subject?: string;
    content?: string;
    sentAt: Date;
    sentBy?: Types.ObjectId;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
  }[];
  
  // Application Metadata
  source: 'web' | 'mobile' | 'partner' | 'referral';
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Convenience / route-facing fields
  acceptedAt?: Date;
  fundingRequested?: boolean;
  firstPaymentDate?: Date;
  documentsRequired?: string[];
  documentDeadline?: Date;
  application?: Types.ObjectId;
  applicationDate?: Date;
  payments?: any;

  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateMonthlyPayment(): number;
  calculateTotalPayment(): number;
  generateTilaDisclosure(): object;
  isEligibleForFunding(): boolean;
  getPaymentSchedule(): object[];
  generatePaymentSchedule(): Promise<void>;
}

const LoanSchema = new Schema<ILoan>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  
  // Loan Basic Information
  amount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [1000, 'Minimum loan amount is $1,000'],
    max: [50000, 'Maximum loan amount is $50,000']
  },
  
  purpose: {
    type: String,
    required: [true, 'Loan purpose is required'],
    enum: ['debt_consolidation', 'home_improvement', 'medical', 'vacation', 'major_purchase', 'other']
  },
  
  purposeDescription: {
    type: String,
    maxlength: [500, 'Purpose description cannot exceed 500 characters']
  },
  
  // Loan Terms
  term: {
    type: Number,
    required: [true, 'Loan term is required'],
    enum: [12, 24, 36, 48, 60], // months
    default: 36
  },
  
  interestRate: {
    type: Number,
    min: [0, 'Interest rate cannot be negative'],
    max: [36, 'Interest rate cannot exceed 36% (usury laws)']
  },
  
  monthlyPayment: {
    type: Number,
    min: [0, 'Monthly payment cannot be negative']
  },
  
  totalPayment: {
    type: Number,
    min: [0, 'Total payment cannot be negative']
  },
  
  // Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'under_review', 'approved', 'funded', 'rejected', 'cancelled', 'accepted', 'pending_documents', 'terms_updated', 'active'],
    default: 'pending',
    index: true
  },
  
  substatus: {
    type: String,
    maxlength: [100, 'Substatus cannot exceed 100 characters']
  },
  
  // Credit Decision
  creditDecision: {
    creditScore: {
      type: Number,
      min: [300, 'Credit score cannot be below 300'],
      max: [850, 'Credit score cannot be above 850']
    },
    creditGrade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    },
    riskCategory: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    debtToIncomeRatio: {
      type: Number,
      min: [0, 'DTI ratio cannot be negative'],
      max: [100, 'DTI ratio cannot exceed 100%']
    },
    creditUtilization: Number,
    paymentHistory: Number,
    creditAge: Number,
    newCreditInquiries: Number,
    creditMixScore: Number
  },
  
  // Underwriting
  underwriting: {
    autoDecision: { type: Boolean, default: false },
    manualReviewRequired: { type: Boolean, default: false },
    riskScore: {
      type: Number,
      min: [0, 'Risk score cannot be negative'],
      max: [1000, 'Risk score cannot exceed 1000']
    },
    riskFactors: [String],
    incomeVerification: {
      type: String,
      enum: ['verified', 'stated', 'not_verified'],
      default: 'not_verified'
    },
    employmentVerification: { type: Boolean, default: false },
    bankAccountVerification: { type: Boolean, default: false },
    identityVerification: { type: Boolean, default: false }
  },
  
  // TILA Disclosures (Truth in Lending Act)
  tilaDisclosures: {
    apr: {
      type: Number,
      required: [true, 'APR is required for TILA compliance']
    },
    financeCharge: {
      type: Number,
      required: [true, 'Finance charge is required for TILA compliance']
    },
    amountFinanced: {
      type: Number,
      required: [true, 'Amount financed is required for TILA compliance']
    },
    totalOfPayments: {
      type: Number,
      required: [true, 'Total of payments is required for TILA compliance']
    },
    paymentSchedule: {
      numberOfPayments: {
        type: Number,
        required: true
      },
      amountOfPayments: {
        type: Number,
        required: true
      },
      whenPaymentsDue: {
        type: String,
        required: true
      }
    },
    latePaymentFee: Number,
    prepaymentPenalty: { type: Boolean, default: false }
  },
  
  // Fees
  fees: {
    originationFee: { type: Number, default: 0 },
    originationFeeRate: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    underwritingFee: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 }
  },
  
  // Documents
  documents: {
    required: [String],
    submitted: [{
      type: {
        type: String,
        required: true
      },
      filename: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      verified: {
        type: Boolean,
        default: false
      }
    }],
    allSubmitted: { type: Boolean, default: false },
    allVerified: { type: Boolean, default: false }
  },
  
  // Funding
  funding: {
    fundingDate: Date,
    fundingAmount: Number,
    fundingMethod: {
      type: String,
      enum: ['ach', 'wire', 'check']
    },
    fundingBankAccount: {
      bankName: String,
      accountType: {
        type: String,
        enum: ['checking', 'savings']
      },
      routingNumber: String,
      accountNumberLast4: String
    },
    fundingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled']
    }
  },
  
  // Repayment
  repayment: {
    firstPaymentDate: Date,
    paymentDay: {
      type: Number,
      min: [1, 'Payment day must be between 1 and 28'],
      max: [28, 'Payment day must be between 1 and 28'],
      default: 15
    },
    autopayEnabled: { type: Boolean, default: false },
    autopayBankAccount: {
      bankName: String,
      routingNumber: String,
      accountNumberLast4: String
    },
    currentBalance: Number,
    totalPaid: { type: Number, default: 0 },
    paymentsRemaining: Number,
    nextPaymentDate: Date,
    nextPaymentAmount: Number
  },
  
  // Decision
  decision: {
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    rejectionCode: String,
    adverseActionRequired: { type: Boolean, default: false },
    adverseActionSentAt: Date,
    decision: String,
    notes: String,
    terms: { type: Schema.Types.Mixed },
    conditions: { type: Schema.Types.Mixed }
  },
  
  // Compliance
  compliance: {
    fcraDisclosureSent: { type: Boolean, default: false },
    fcraDisclosureSentAt: Date,
    fcraAdverseActionSent: { type: Boolean, default: false },
    fcraAdverseActionSentAt: Date,
    tcpaConsentObtained: { type: Boolean, default: false },
    tcpaConsentDate: Date,
    tilaDisclosureProvided: { type: Boolean, default: false },
    tilaDisclosureProvidedAt: Date,
    estatementConsent: { type: Boolean, default: false }
  },
  
  // Communications
  communications: [{
    type: {
      type: String,
      required: true,
      enum: ['email', 'sms', 'call', 'letter', 'system']
    },
    direction: {
      type: String,
      required: true,
      enum: ['inbound', 'outbound']
    },
    subject: String,
    content: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date
  }],
  
  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'partner', 'referral'],
    default: 'web'
  },
  referralCode: String,
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  ipAddress: String,
  userAgent: String,

  // Convenience / route-facing fields
  acceptedAt: { type: Date },
  fundingRequested: { type: Boolean },
  firstPaymentDate: { type: Date },
  documentsRequired: [{ type: String }],
  documentDeadline: { type: Date },
  application: { type: Schema.Types.ObjectId, ref: 'Application' },
  applicationDate: { type: Date },
  payments: [{ type: Schema.Types.ObjectId, ref: 'Payment' }]
}, {
  timestamps: true,
  collection: 'loans'
});

// Indexes for performance
LoanSchema.index({ user: 1, status: 1 });
LoanSchema.index({ status: 1, createdAt: -1 });
LoanSchema.index({ 'funding.fundingDate': 1 });
LoanSchema.index({ 'repayment.nextPaymentDate': 1 });
LoanSchema.index({ 'creditDecision.creditScore': 1 });
LoanSchema.index({ amount: 1, term: 1 });

// Instance Methods
LoanSchema.methods.calculateMonthlyPayment = function(): number {
  if (!this.amount || !this.interestRate || !this.term) return 0;
  
  const principal = this.amount;
  const monthlyRate = this.interestRate / 100 / 12;
  const numberOfPayments = this.term;
  
  if (monthlyRate === 0) {
    return principal / numberOfPayments;
  }
  
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  return Math.round(monthlyPayment * 100) / 100; // Round to 2 decimal places
};

LoanSchema.methods.calculateTotalPayment = function(): number {
  const monthlyPayment = this.calculateMonthlyPayment();
  return Math.round(monthlyPayment * this.term * 100) / 100;
};

LoanSchema.methods.generateTilaDisclosure = function(): object {
  const financeCharge = this.calculateTotalPayment() - this.amount;
  
  return {
    apr: this.interestRate,
    financeCharge: financeCharge,
    amountFinanced: this.amount,
    totalOfPayments: this.calculateTotalPayment(),
    paymentSchedule: {
      numberOfPayments: this.term,
      amountOfPayments: this.calculateMonthlyPayment(),
      whenPaymentsDue: `Monthly beginning 30 days after loan funding`
    }
  };
};

LoanSchema.methods.isEligibleForFunding = function(): boolean {
  return this.status === 'approved' &&
         this.documents.allVerified &&
         this.underwriting.identityVerification &&
         this.underwriting.bankAccountVerification &&
         this.compliance.tilaDisclosureProvided;
};

LoanSchema.methods.getPaymentSchedule = function(): object[] {
  if (!this.repayment.firstPaymentDate) return [];
  
  const schedule = [];
  const monthlyPayment = this.calculateMonthlyPayment();
  let currentDate = new Date(this.repayment.firstPaymentDate);
  let remainingBalance = this.amount;
  
  for (let i = 0; i < this.term; i++) {
    const interestPayment = remainingBalance * (this.interestRate / 100 / 12);
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
    
    schedule.push({
      paymentNumber: i + 1,
      dueDate: new Date(currentDate),
      totalPayment: monthlyPayment,
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      remainingBalance: Math.round(Math.max(0, remainingBalance) * 100) / 100
    });
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return schedule;
};

LoanSchema.methods.generatePaymentSchedule = async function(): Promise<void> {
  // Generate payment schedule and save
  const schedule = this.getPaymentSchedule();
  if (schedule.length > 0 && schedule[0]) {
    this.firstPaymentDate = (schedule[0] as any).dueDate;
  }
  await this.save();
};

// Pre-save middleware
LoanSchema.pre('save', function(next) {
  const doc = this as any;
  // Auto-calculate monthly payment if terms are set
  if (doc.amount && doc.interestRate && doc.term && !doc.monthlyPayment) {
    doc.monthlyPayment = doc.calculateMonthlyPayment();
    doc.totalPayment = doc.calculateTotalPayment();
  }
  
  // Auto-generate TILA disclosures
  if (doc.amount && doc.interestRate && doc.term && !doc.tilaDisclosures?.apr) {
    const disclosure = doc.generateTilaDisclosure();
    doc.tilaDisclosures = disclosure;
  }
  
  next();
});

export const Loan = mongoose.model<ILoan>('Loan', LoanSchema);