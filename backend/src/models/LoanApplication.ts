import mongoose, { Schema, Document } from 'mongoose';

// Production-grade loan application interface for real financial operations
export interface ILoanApplication extends Document {
  // Application Identification
  applicationNumber: string; // Unique loan application number
  userId: mongoose.Types.ObjectId;
  
  // Loan Request Details
  requestedAmount: number;
  loanPurpose: 'debt_consolidation' | 'home_improvement' | 'major_purchase' | 'medical_expenses' | 
              'vacation' | 'wedding' | 'moving_relocation' | 'business_investment' | 'education' | 'other';
  loanPurposeDescription?: string;
  preferredTermMonths: 12 | 24 | 36 | 48 | 60 | 72 | 84;
  
  // Application Status & Workflow
  status: 'draft' | 'submitted' | 'processing' | 'credit_review' | 'underwriting' | 
          'pricing' | 'approval_review' | 'approved' | 'conditionally_approved' | 
          'denied' | 'funded' | 'closed' | 'cancelled';
  
  // Critical Timestamps
  dates: {
    createdAt: Date;
    submittedAt?: Date;
    creditPulledAt?: Date;
    underwritingCompletedAt?: Date;
    approvedAt?: Date;
    deniedAt?: Date;
    fundedAt?: Date;
    firstPaymentDue?: Date;
    maturityDate?: Date;
  };
  
  // Applicant Financial Information
  applicantFinancials: {
    annualIncome: number;
    monthlyIncome: number;
    incomeSource: 'employment' | 'self_employment' | 'investment' | 'retirement' | 'other';
    employmentLength: number; // months
    monthlyHousingPayment: number;
    housingStatus: 'own' | 'rent' | 'live_with_family' | 'other';
    monthlyDebtPayments: number;
    liquidAssets: number;
    
    // Debt-to-Income Calculations
    calculatedDTI: number;
    housingRatio: number;
    totalDebtRatio: number;
  };
  
  // Credit Information (from bureau pulls)
  creditInformation: {
    creditScore?: number;
    creditScoreModel?: 'FICO_8' | 'FICO_9' | 'VantageScore_3' | 'VantageScore_4';
    creditReportDate?: Date;
    bureausUsed: ('Experian' | 'Equifax' | 'TransUnion')[];
    
    // Credit Profile Details
    creditHistory: {
      oldestAccount?: Date;
      averageAccountAge?: number; // months
      totalAccounts?: number;
      openAccounts?: number;
      closedAccounts?: number;
    };
    
    // Payment History
    paymentHistory: {
      latePayments30Days?: number;
      latePayments60Days?: number;
      latePayments90Days?: number;
      latePayments120PlusDays?: number;
      collections?: number;
      chargeOffs?: number;
    };
    
    // Credit Utilization
    creditUtilization: {
      totalCreditLimit?: number;
      totalBalances?: number;
      utilizationRatio?: number;
      highestUtilization?: number;
    };
    
    // Derogatory Information
    derogatoryInformation: {
      bankruptcies?: Array<{
        type: 'chapter_7' | 'chapter_11' | 'chapter_13';
        filedDate: Date;
        dischargedDate?: Date;
        dismissedDate?: Date;
      }>;
      foreclosures?: Array<{
        date: Date;
        amount: number;
      }>;
      repossessions?: Array<{
        date: Date;
        type: string;
      }>;
      judgments?: Array<{
        date: Date;
        amount: number;
        satisfied: boolean;
      }>;
      liens?: Array<{
        date: Date;
        amount: number;
        type: 'tax' | 'mechanic' | 'other';
        satisfied: boolean;
      }>;
    };
  };
  
  // Underwriting Results & Decision Engine
  underwriting: {
    // Automated Underwriting System (AUS) Results
    ausDecision?: 'approve' | 'approve_with_conditions' | 'refer_with_caution' | 'deny';
    ausSystem?: 'DU' | 'LP' | 'GUS' | 'proprietary';
    ausRecommendations?: string[];
    
    // Manual Underwriting Assessment
    manualReview: boolean;
    underwriterAssigned?: string;
    underwriterNotes?: string[];
    
    // Risk Assessment
    riskGrade: 'A' | 'B' | 'C' | 'D' | 'E';
    riskScore: number; // 0-1000
    riskFactors: string[];
    
    // Policy Compliance
    policyExceptions: Array<{
      policy: string;
      exception: string;
      approved: boolean;
      approvedBy?: string;
      approvalDate?: Date;
    }>;
    
    // ATR/QM Analysis (Ability-to-Repay / Qualified Mortgage)
    atrAnalysis: {
      monthlyPayment: number;
      monthlyIncome: number;
      monthlyDebts: number;
      residualIncome: number;
      atrRatio: number;
      qmCompliant: boolean;
      qmPoints?: number;
    };
    
    // Compensating Factors
    compensatingFactors?: Array<{
      factor: string;
      description: string;
      weight: number;
    }>;
  };
  
  // Loan Pricing & Terms
  pricing: {
    // Interest Rate Components
    baseRate: number;
    riskAdjustment: number;
    finalRate: number;
    
    // APR Calculation
    apr: number;
    
    // Fee Structure
    fees: {
      originationFee?: number;
      processingFee?: number;
      underwritingFee?: number;
      documentationFee?: number;
      creditReportFee?: number;
      floodCertificationFee?: number;
      taxServiceFee?: number;
      totalFees: number;
    };
    
    // Loan Terms
    finalLoanAmount: number;
    termMonths: number;
    monthlyPayment: number;
    totalPayments: number;
    totalInterest: number;
    
    // Rate Lock Information
    rateLock: {
      locked: boolean;
      lockDate?: Date;
      lockExpiration?: Date;
      lockPeriodDays?: number;
      lockExtensions?: Array<{
        date: Date;
        newExpiration: Date;
        fee?: number;
        reason: string;
      }>;
    };
    
    // Investor Information
    investor?: {
      name: string;
      purchasePrice: number;
      premium: number;
      servicing: 'retained' | 'released';
    };
  };
  
  // Approval & Conditions
  approval: {
    // Decision Status
    decision: 'approved' | 'conditionally_approved' | 'denied' | 'withdrawn' | 'cancelled';
    decisionDate?: Date;
    decisionBy?: string;
    
    // Approval Conditions
    conditions: Array<{
      type: 'prior_to_docs' | 'prior_to_funding' | 'post_closing';
      description: string;
      required: boolean;
      completed: boolean;
      completedDate?: Date;
      completedBy?: string;
      documents?: string[];
    }>;
    
    // Denial Information
    denialReasons?: Array<{
      code: string;
      description: string;
      adverseActionRequired: boolean;
    }>;
    
    // ECOA/FCRA Adverse Action
    adverseAction: {
      required: boolean;
      sent: boolean;
      sentDate?: Date;
      method?: 'mail' | 'email' | 'online';
      reasons?: string[];
      creditScoreDisclosure?: {
        score: number;
        model: string;
        keyFactors: string[];
      };
    };
  };
  
  // Document Management
  documents: Array<{
    id: string;
    type: 'application' | 'credit_report' | 'paystub' | 'tax_return' | 'bank_statement' | 
          'employment_verification' | 'identity_doc' | 'other';
    subType?: string;
    fileName: string;
    filePath: string;
    uploadedBy: string;
    uploadedAt: Date;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Date;
    required: boolean;
    completed: boolean;
  }>;
  
  // Funding & Disbursement
  funding: {
    status: 'pending' | 'approved' | 'scheduled' | 'sent' | 'completed' | 'failed' | 'returned';
    method: 'wire' | 'ach' | 'check';
    
    // Funding Instructions
    instructions: {
      amount: number;
      recipientName: string;
      recipientAccount: {
        routingNumber: string;
        accountNumber: string; // Encrypted
        accountType: 'checking' | 'savings';
        bankName: string;
      };
      reference: string;
      specialInstructions?: string;
    };
    
    // Funding Dates & Tracking
    scheduledDate?: Date;
    fundedDate?: Date;
    confirmationNumber?: string;
    wireReferenceNumber?: string;
    
    // Compliance Checks
    complianceChecks: {
      ofacScreening: boolean;
      bsaReporting: boolean; // Bank Secrecy Act
      ctaRequired: boolean; // Currency Transaction Report
      sarFiled: boolean; // Suspicious Activity Report
    };
    
    // Funding Verification
    verification: {
      verified: boolean;
      verifiedBy?: string;
      verifiedAt?: Date;
      verificationMethod?: 'bank_confirmation' | 'receipt' | 'statement';
    };
  };
  
  // Servicing & Account Management
  servicing: {
    servicer: string;
    accountNumber?: string;
    transferDate?: Date;
    
    // Payment Information
    paymentInfo: {
      firstPaymentDue: Date;
      monthlyPaymentAmount: number;
      paymentMethod: 'auto_debit' | 'online' | 'mail' | 'phone';
      autopayDiscount?: number;
    };
    
    // Escrow (if applicable)
    escrow?: {
      required: boolean;
      monthlyAmount?: number;
      items?: ('taxes' | 'insurance' | 'pmi' | 'hoa')[];
    };
  };
  
  // Compliance & Regulatory
  compliance: {
    // HMDA (Home Mortgage Disclosure Act) Data
    hmdaData?: {
      actionTaken: number; // 1-8 based on HMDA codes
      actionTakenDate: Date;
      applicantEthnicity?: string;
      applicantRace?: string;
      applicantSex?: string;
      coApplicantEthnicity?: string;
      coApplicantRace?: string;
      coApplicantSex?: string;
      income: number;
      purchaserType?: number;
      rateSpread?: number;
      hoepaStatus?: string;
      lienStatus?: string;
    };
    
    // CRA (Community Reinvestment Act) Data
    craData?: {
      censusTract: string;
      msa: string; // Metropolitan Statistical Area
      countyCode: string;
      smallBusinessLoan: boolean;
      smallFarmLoan: boolean;
      communityDevelopmentLoan: boolean;
    };
    
    // Fair Lending Monitoring
    fairLending: {
      protectedClass: {
        race?: string;
        ethnicity?: string;
        sex?: string;
        age?: number;
        maritalStatus?: string;
        nationalOrigin?: string;
        religion?: string;
      };
      monitoringRequired: boolean;
      peerGroupComparison?: {
        approvalRate: number;
        peerApprovalRate: number;
        disparateImpact: boolean;
      };
    };
    
    // TRID (TILA-RESPA Integrated Disclosures)
    tridCompliance?: {
      leReceived: boolean; // Loan Estimate
      leReceivedDate?: Date;
      cdReceived: boolean; // Closing Disclosure
      cdReceivedDate?: Date;
      waitingPeriodsComplied: boolean;
    };
  };
  
  // Audit Trail & History
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    previousValue?: any;
    newValue?: any;
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  
  // Performance Tracking
  performance: {
    // Processing Time Metrics
    timeToDecision?: number; // hours
    timeToFunding?: number; // hours
    
    // Quality Metrics
    dataQualityScore?: number; // 0-100
    documentCompleteness?: number; // 0-100
    
    // Exception Tracking
    exceptions: Array<{
      type: string;
      description: string;
      resolved: boolean;
      resolutionDate?: Date;
      impact: 'low' | 'medium' | 'high';
    }>;
  };
}

const LoanApplicationSchema: Schema = new Schema({
  // Application Identification
  applicationNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  // Loan Request Details
  requestedAmount: { 
    type: Number, 
    required: true, 
    min: 1000, 
    max: 500000 
  },
  loanPurpose: { 
    type: String, 
    required: true,
    enum: ['debt_consolidation', 'home_improvement', 'major_purchase', 'medical_expenses', 
           'vacation', 'wedding', 'moving_relocation', 'business_investment', 'education', 'other']
  },
  loanPurposeDescription: { type: String, maxlength: 500 },
  preferredTermMonths: { 
    type: Number, 
    required: true,
    enum: [12, 24, 36, 48, 60, 72, 84]
  },
  
  // Application Status & Workflow
  status: { 
    type: String, 
    required: true,
    default: 'draft',
    enum: ['draft', 'submitted', 'processing', 'credit_review', 'underwriting', 
           'pricing', 'approval_review', 'approved', 'conditionally_approved', 
           'denied', 'funded', 'closed', 'cancelled'],
    index: true
  },
  
  // Critical Timestamps
  dates: {
    createdAt: { type: Date, default: Date.now },
    submittedAt: Date,
    creditPulledAt: Date,
    underwritingCompletedAt: Date,
    approvedAt: Date,
    deniedAt: Date,
    fundedAt: Date,
    firstPaymentDue: Date,
    maturityDate: Date
  },
  
  // Applicant Financial Information
  applicantFinancials: {
    annualIncome: { type: Number, required: true, min: 0 },
    monthlyIncome: { type: Number, required: true, min: 0 },
    incomeSource: { 
      type: String, 
      required: true,
      enum: ['employment', 'self_employment', 'investment', 'retirement', 'other']
    },
    employmentLength: { type: Number, required: true, min: 0 }, // months
    monthlyHousingPayment: { type: Number, required: true, min: 0 },
    housingStatus: { 
      type: String, 
      required: true,
      enum: ['own', 'rent', 'live_with_family', 'other']
    },
    monthlyDebtPayments: { type: Number, required: true, min: 0 },
    liquidAssets: { type: Number, required: true, min: 0 },
    
    // Calculated DTI ratios
    calculatedDTI: { type: Number, min: 0, max: 1 },
    housingRatio: { type: Number, min: 0, max: 1 },
    totalDebtRatio: { type: Number, min: 0, max: 1 }
  },
  
  // Credit Information
  creditInformation: {
    creditScore: { type: Number, min: 300, max: 850 },
    creditScoreModel: { 
      type: String,
      enum: ['FICO_8', 'FICO_9', 'VantageScore_3', 'VantageScore_4']
    },
    creditReportDate: Date,
    bureausUsed: [{ 
      type: String,
      enum: ['Experian', 'Equifax', 'TransUnion']
    }],
    
    creditHistory: {
      oldestAccount: Date,
      averageAccountAge: Number,
      totalAccounts: Number,
      openAccounts: Number,
      closedAccounts: Number
    },
    
    paymentHistory: {
      latePayments30Days: { type: Number, default: 0 },
      latePayments60Days: { type: Number, default: 0 },
      latePayments90Days: { type: Number, default: 0 },
      latePayments120PlusDays: { type: Number, default: 0 },
      collections: { type: Number, default: 0 },
      chargeOffs: { type: Number, default: 0 }
    },
    
    creditUtilization: {
      totalCreditLimit: Number,
      totalBalances: Number,
      utilizationRatio: { type: Number, min: 0, max: 1 },
      highestUtilization: { type: Number, min: 0, max: 1 }
    },
    
    derogatoryInformation: {
      bankruptcies: [{
        type: { 
          type: String,
          enum: ['chapter_7', 'chapter_11', 'chapter_13']
        },
        filedDate: Date,
        dischargedDate: Date,
        dismissedDate: Date
      }],
      foreclosures: [{
        date: Date,
        amount: Number
      }],
      repossessions: [{
        date: Date,
        type: String
      }],
      judgments: [{
        date: Date,
        amount: Number,
        satisfied: Boolean
      }],
      liens: [{
        date: Date,
        amount: Number,
        type: { 
          type: String,
          enum: ['tax', 'mechanic', 'other']
        },
        satisfied: Boolean
      }]
    }
  },
  
  // Underwriting Results
  underwriting: {
    ausDecision: { 
      type: String,
      enum: ['approve', 'approve_with_conditions', 'refer_with_caution', 'deny']
    },
    ausSystem: { 
      type: String,
      enum: ['DU', 'LP', 'GUS', 'proprietary']
    },
    ausRecommendations: [String],
    
    manualReview: { type: Boolean, default: false },
    underwriterAssigned: String,
    underwriterNotes: [String],
    
    riskGrade: { 
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E']
    },
    riskScore: { type: Number, min: 0, max: 1000 },
    riskFactors: [String],
    
    policyExceptions: [{
      policy: String,
      exception: String,
      approved: Boolean,
      approvedBy: String,
      approvalDate: Date
    }],
    
    atrAnalysis: {
      monthlyPayment: Number,
      monthlyIncome: Number,
      monthlyDebts: Number,
      residualIncome: Number,
      atrRatio: { type: Number, min: 0 },
      qmCompliant: Boolean,
      qmPoints: Number
    },
    
    compensatingFactors: [{
      factor: String,
      description: String,
      weight: { type: Number, min: 0, max: 1 }
    }]
  },
  
  // Loan Pricing & Terms
  pricing: {
    baseRate: { type: Number, min: 0, max: 1 },
    riskAdjustment: { type: Number, min: -0.1, max: 0.2 },
    finalRate: { type: Number, min: 0, max: 1 },
    apr: { type: Number, min: 0, max: 1 },
    
    fees: {
      originationFee: { type: Number, min: 0 },
      processingFee: { type: Number, min: 0 },
      underwritingFee: { type: Number, min: 0 },
      documentationFee: { type: Number, min: 0 },
      creditReportFee: { type: Number, min: 0 },
      floodCertificationFee: { type: Number, min: 0 },
      taxServiceFee: { type: Number, min: 0 },
      totalFees: { type: Number, min: 0 }
    },
    
    finalLoanAmount: { type: Number, min: 0 },
    termMonths: { type: Number, min: 6, max: 84 },
    monthlyPayment: { type: Number, min: 0 },
    totalPayments: { type: Number, min: 0 },
    totalInterest: { type: Number, min: 0 },
    
    rateLock: {
      locked: { type: Boolean, default: false },
      lockDate: Date,
      lockExpiration: Date,
      lockPeriodDays: Number,
      lockExtensions: [{
        date: Date,
        newExpiration: Date,
        fee: Number,
        reason: String
      }]
    },
    
    investor: {
      name: String,
      purchasePrice: Number,
      premium: Number,
      servicing: { 
        type: String,
        enum: ['retained', 'released']
      }
    }
  },
  
  // Approval & Conditions
  approval: {
    decision: { 
      type: String,
      enum: ['approved', 'conditionally_approved', 'denied', 'withdrawn', 'cancelled']
    },
    decisionDate: Date,
    decisionBy: String,
    
    conditions: [{
      type: { 
        type: String,
        enum: ['prior_to_docs', 'prior_to_funding', 'post_closing']
      },
      description: String,
      required: Boolean,
      completed: { type: Boolean, default: false },
      completedDate: Date,
      completedBy: String,
      documents: [String]
    }],
    
    denialReasons: [{
      code: String,
      description: String,
      adverseActionRequired: Boolean
    }],
    
    adverseAction: {
      required: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      sentDate: Date,
      method: { 
        type: String,
        enum: ['mail', 'email', 'online']
      },
      reasons: [String],
      creditScoreDisclosure: {
        score: Number,
        model: String,
        keyFactors: [String]
      }
    }
  },
  
  // Document Management
  documents: [{
    id: String,
    type: { 
      type: String,
      enum: ['application', 'credit_report', 'paystub', 'tax_return', 'bank_statement', 
             'employment_verification', 'identity_doc', 'other']
    },
    subType: String,
    fileName: String,
    filePath: String,
    uploadedBy: String,
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedBy: String,
    verifiedAt: Date,
    required: Boolean,
    completed: { type: Boolean, default: false }
  }],
  
  // Funding & Disbursement
  funding: {
    status: { 
      type: String,
      default: 'pending',
      enum: ['pending', 'approved', 'scheduled', 'sent', 'completed', 'failed', 'returned']
    },
    method: { 
      type: String,
      enum: ['wire', 'ach', 'check']
    },
    
    instructions: {
      amount: Number,
      recipientName: String,
      recipientAccount: {
        routingNumber: String,
        accountNumber: String, // Encrypted
        accountType: { 
          type: String,
          enum: ['checking', 'savings']
        },
        bankName: String
      },
      reference: String,
      specialInstructions: String
    },
    
    scheduledDate: Date,
    fundedDate: Date,
    confirmationNumber: String,
    wireReferenceNumber: String,
    
    complianceChecks: {
      ofacScreening: { type: Boolean, default: false },
      bsaReporting: { type: Boolean, default: false },
      ctaRequired: { type: Boolean, default: false },
      sarFiled: { type: Boolean, default: false }
    },
    
    verification: {
      verified: { type: Boolean, default: false },
      verifiedBy: String,
      verifiedAt: Date,
      verificationMethod: { 
        type: String,
        enum: ['bank_confirmation', 'receipt', 'statement']
      }
    }
  },
  
  // Servicing & Account Management
  servicing: {
    servicer: { type: String, required: true, default: 'Zpu Financial Services' },
    accountNumber: String,
    transferDate: Date,
    
    paymentInfo: {
      firstPaymentDue: Date,
      monthlyPaymentAmount: Number,
      paymentMethod: { 
        type: String,
        enum: ['auto_debit', 'online', 'mail', 'phone'],
        default: 'auto_debit'
      },
      autopayDiscount: Number
    },
    
    escrow: {
      required: { type: Boolean, default: false },
      monthlyAmount: Number,
      items: [{ 
        type: String,
        enum: ['taxes', 'insurance', 'pmi', 'hoa']
      }]
    }
  },
  
  // Compliance & Regulatory Data
  compliance: {
    hmdaData: {
      actionTaken: { type: Number, min: 1, max: 8 },
      actionTakenDate: Date,
      applicantEthnicity: String,
      applicantRace: String,
      applicantSex: String,
      coApplicantEthnicity: String,
      coApplicantRace: String,
      coApplicantSex: String,
      income: Number,
      purchaserType: Number,
      rateSpread: Number,
      hoepaStatus: String,
      lienStatus: String
    },
    
    craData: {
      censusTract: String,
      msa: String,
      countyCode: String,
      smallBusinessLoan: { type: Boolean, default: false },
      smallFarmLoan: { type: Boolean, default: false },
      communityDevelopmentLoan: { type: Boolean, default: false }
    },
    
    fairLending: {
      protectedClass: {
        race: String,
        ethnicity: String,
        sex: String,
        age: Number,
        maritalStatus: String,
        nationalOrigin: String,
        religion: String
      },
      monitoringRequired: { type: Boolean, default: true },
      peerGroupComparison: {
        approvalRate: Number,
        peerApprovalRate: Number,
        disparateImpact: Boolean
      }
    },
    
    tridCompliance: {
      leReceived: { type: Boolean, default: false },
      leReceivedDate: Date,
      cdReceived: { type: Boolean, default: false },
      cdReceivedDate: Date,
      waitingPeriodsComplied: { type: Boolean, default: false }
    }
  },
  
  // Audit Trail
  auditTrail: [{
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    notes: String,
    ipAddress: String,
    userAgent: String
  }],
  
  // Performance Tracking
  performance: {
    timeToDecision: Number, // hours
    timeToFunding: Number, // hours
    dataQualityScore: { type: Number, min: 0, max: 100 },
    documentCompleteness: { type: Number, min: 0, max: 100 },
    
    exceptions: [{
      type: String,
      description: String,
      resolved: { type: Boolean, default: false },
      resolutionDate: Date,
      impact: { 
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      }
    }]
  }
});

// Auto-generate application number
LoanApplicationSchema.pre('save', function(next) {
  const doc = this as any;
  
  if (!doc.applicationNumber) {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    doc.applicationNumber = `ZPU${year}${timestamp}${random}`;
  }
  
  // Calculate DTI ratios
  if (doc.applicantFinancials) {
    const monthly = doc.applicantFinancials.monthlyIncome;
    if (monthly > 0) {
      doc.applicantFinancials.housingRatio = doc.applicantFinancials.monthlyHousingPayment / monthly;
      doc.applicantFinancials.totalDebtRatio = 
        (doc.applicantFinancials.monthlyHousingPayment + doc.applicantFinancials.monthlyDebtPayments) / monthly;
      doc.applicantFinancials.calculatedDTI = doc.applicantFinancials.totalDebtRatio;
    }
  }
  
  // Update maturity date based on loan terms
  if (doc.dates?.fundedDate && doc.pricing?.termMonths) {
    doc.dates.maturityDate = new Date(doc.dates.fundedDate);
    doc.dates.maturityDate.setMonth(doc.dates.maturityDate.getMonth() + doc.pricing.termMonths);
  }
  
  next();
});

// Indexes for performance
LoanApplicationSchema.index({ applicationNumber: 1 });
LoanApplicationSchema.index({ userId: 1 });
LoanApplicationSchema.index({ status: 1 });
LoanApplicationSchema.index({ 'dates.createdAt': -1 });
LoanApplicationSchema.index({ 'dates.submittedAt': -1 });
LoanApplicationSchema.index({ 'underwriting.riskGrade': 1 });
LoanApplicationSchema.index({ 'approval.decision': 1 });
LoanApplicationSchema.index({ 'funding.status': 1 });

export default mongoose.model<ILoanApplication>('LoanApplication', LoanApplicationSchema);