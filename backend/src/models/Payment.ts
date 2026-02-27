import mongoose, { Document, Schema, Types } from 'mongoose';

// US Loan Payment Management
export interface IPayment extends Document<mongoose.Types.ObjectId> {
  // Payment Identification
  paymentId: string; // Unique payment identifier
  loan: Types.ObjectId;
  user: Types.ObjectId;
  
  // Payment Details
  amount: number;
  principalAmount: number;
  interestAmount: number;
  feesAmount: number;
  
  // Payment Type
  paymentType: 'scheduled' | 'extra_principal' | 'payoff' | 'late_fee' | 'nsf_fee' | 'manual_adjustment';
  
  // Scheduled vs Actual
  scheduledDate: Date;
  actualPaymentDate?: Date;
  
  // Payment Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  
  // Payment Method
  paymentMethod: {
    type: 'ach' | 'wire' | 'check' | 'money_order' | 'credit_card' | 'debit_card';
    bankAccount?: {
      bankName: string;
      routingNumber: string;
      accountType: 'checking' | 'savings';
      accountNumberLast4: string;
    };
    card?: {
      cardType: 'visa' | 'mastercard' | 'amex' | 'discover';
      last4Digits: string;
      expiryMonth: number;
      expiryYear: number;
    };
    isAutopay: boolean;
  };
  
  // Transaction Details
  transaction: {
    transactionId?: string; // External transaction ID from payment processor
    processorName?: 'stripe' | 'plaid' | 'dwolla' | 'ach_works' | 'nacha';
    processorResponse?: any; // Response from payment processor
    attemptNumber: number;
    
    // ACH specific
    achDetails?: {
      companyId: string;
      batchId?: string;
      traceNumber?: string;
      effectiveDate: Date;
      returnCode?: string; // If ACH return
      returnReason?: string;
    };
  };
  
  // Payment Allocation
  allocation: {
    principal: number;
    interest: number;
    fees: {
      latePaymentFee: number;
      nsfFee: number;
      processingFee: number;
      other: number;
    };
    escrow?: number; // If applicable
  };
  
  // Late Payment Information
  latePayment: {
    isLate: boolean;
    daysLate?: number;
    lateFeeAssessed?: number;
    lateFeeWaived?: boolean;
    lateFeeWaivedReason?: string;
    lateFeeWaivedBy?: Types.ObjectId;
  };
  
  // NSF (Non-Sufficient Funds) Information
  nsf: {
    isNsf: boolean;
    nsfDate?: Date;
    nsfFeeAssessed?: number;
    bankReturnCode?: string;
    bankReturnReason?: string;
    retryAttempt?: number;
    retryScheduledDate?: Date;
  };
  
  // Refund Information
  refund: {
    isRefunded: boolean;
    refundAmount?: number;
    refundDate?: Date;
    refundReason?: string;
    refundMethod?: 'ach' | 'check' | 'original_method';
    refundTransactionId?: string;
    refundedBy?: Types.ObjectId; // Admin who processed refund
    partialRefunds?: {
      amount: number;
      date: Date;
      reason: string;
      transactionId: string;
    }[];
  };
  
  // Loan Balance Impact
  balanceImpact: {
    principalBalanceBefore: number;
    principalBalanceAfter: number;
    interestBalanceBefore: number;
    interestBalanceAfter: number;
    totalBalanceBefore: number;
    totalBalanceAfter: number;
    payoffPayment: boolean;
  };
  
  // Communication & Notifications
  notifications: {
    paymentConfirmationSent: boolean;
    paymentConfirmationSentAt?: Date;
    paymentReminderSent?: boolean;
    paymentReminderSentAt?: Date;
    latePaymentNoticeSent?: boolean;
    latePaymentNoticeSentAt?: Date;
    nsfNoticeSent?: boolean;
    nsfNoticeSentAt?: Date;
  };
  
  // Compliance & Audit
  compliance: {
    regulationECompliant: boolean; // Regulation E (Electronic Fund Transfers)
    nachComplaint: boolean; // NACHA rules
    disputeReceived: boolean;
    disputeDate?: Date;
    disputeReason?: string;
    disputeResolution?: string;
    disputeResolvedDate?: Date;
  };
  
  // Processing Metadata
  processing: {
    processedBy?: Types.ObjectId; // Admin who processed manual payments
    processingNotes?: string;
    batchId?: string; // For batch processing
    reconciled: boolean;
    reconciledDate?: Date;
    reconciledBy?: Types.ObjectId;
  };
  
  // System Metadata
  metadata: {
    source: 'autopay' | 'manual_online' | 'manual_admin' | 'phone' | 'mail' | 'branch';
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateLateFee(): number;
  isPaymentLate(): boolean;
  getDaysLate(): number;
  canBeRefunded(): boolean;
  processRefund(amount: number, reason: string, adminId: Types.ObjectId): Promise<void>;
  sendPaymentConfirmation(): Promise<void>;
  updateLoanBalance(): Promise<void>;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    required: [true, 'Payment ID is required'],
    unique: true,
    index: true
  },
  
  loan: {
    type: Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan reference is required'],
    index: true
  },
  
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  
  // Payment amounts
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be positive']
  },
  
  principalAmount: {
    type: Number,
    required: true,
    min: [0, 'Principal amount cannot be negative']
  },
  
  interestAmount: {
    type: Number,
    required: true,
    min: [0, 'Interest amount cannot be negative']
  },
  
  feesAmount: {
    type: Number,
    default: 0,
    min: [0, 'Fees amount cannot be negative']
  },
  
  // Payment type
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: ['scheduled', 'extra_principal', 'payoff', 'late_fee', 'nsf_fee', 'manual_adjustment'],
    index: true
  },
  
  // Dates
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    index: true
  },
  
  actualPaymentDate: Date,
  
  // Status
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  
  // Payment method
  paymentMethod: {
    type: {
      type: String,
      required: [true, 'Payment method type is required'],
      enum: ['ach', 'wire', 'check', 'money_order', 'credit_card', 'debit_card']
    },
    bankAccount: {
      bankName: String,
      routingNumber: {
        type: String,
        match: [/^\d{9}$/, 'Routing number must be 9 digits']
      },
      accountType: {
        type: String,
        enum: ['checking', 'savings']
      },
      accountNumberLast4: {
        type: String,
        match: [/^\d{4}$/, 'Account last 4 must be 4 digits']
      }
    },
    card: {
      cardType: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'discover']
      },
      last4Digits: {
        type: String,
        match: [/^\d{4}$/, 'Card last 4 must be 4 digits']
      },
      expiryMonth: {
        type: Number,
        min: [1, 'Invalid expiry month'],
        max: [12, 'Invalid expiry month']
      },
      expiryYear: {
        type: Number,
        min: [new Date().getFullYear(), 'Invalid expiry year']
      }
    },
    isAutopay: {
      type: Boolean,
      default: false
    }
  },
  
  // Transaction details
  transaction: {
    transactionId: String,
    processorName: {
      type: String,
      enum: ['stripe', 'plaid', 'dwolla', 'ach_works', 'nacha']
    },
    processorResponse: Schema.Types.Mixed,
    attemptNumber: {
      type: Number,
      default: 1,
      min: [1, 'Attempt number must be at least 1']
    },
    achDetails: {
      companyId: String,
      batchId: String,
      traceNumber: String,
      effectiveDate: Date,
      returnCode: String,
      returnReason: String
    }
  },
  
  // Payment allocation
  allocation: {
    principal: {
      type: Number,
      required: true,
      min: [0, 'Principal allocation cannot be negative']
    },
    interest: {
      type: Number,
      required: true,
      min: [0, 'Interest allocation cannot be negative']
    },
    fees: {
      latePaymentFee: { type: Number, default: 0 },
      nsfFee: { type: Number, default: 0 },
      processingFee: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    escrow: { type: Number, default: 0 }
  },
  
  // Late payment
  latePayment: {
    isLate: {
      type: Boolean,
      default: false,
      index: true
    },
    daysLate: Number,
    lateFeeAssessed: Number,
    lateFeeWaived: { type: Boolean, default: false },
    lateFeeWaivedReason: String,
    lateFeeWaivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // NSF information
  nsf: {
    isNsf: {
      type: Boolean,
      default: false,
      index: true
    },
    nsfDate: Date,
    nsfFeeAssessed: Number,
    bankReturnCode: String,
    bankReturnReason: String,
    retryAttempt: { type: Number, default: 0 },
    retryScheduledDate: Date
  },
  
  // Refund information
  refund: {
    isRefunded: {
      type: Boolean,
      default: false,
      index: true
    },
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
    refundMethod: {
      type: String,
      enum: ['ach', 'check', 'original_method']
    },
    refundTransactionId: String,
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    partialRefunds: [{
      amount: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      },
      reason: String,
      transactionId: String
    }]
  },
  
  // Balance impact
  balanceImpact: {
    principalBalanceBefore: {
      type: Number,
      required: true
    },
    principalBalanceAfter: {
      type: Number,
      required: true
    },
    interestBalanceBefore: {
      type: Number,
      required: true
    },
    interestBalanceAfter: {
      type: Number,
      required: true
    },
    totalBalanceBefore: {
      type: Number,
      required: true
    },
    totalBalanceAfter: {
      type: Number,
      required: true
    },
    payoffPayment: {
      type: Boolean,
      default: false
    }
  },
  
  // Notifications
  notifications: {
    paymentConfirmationSent: { type: Boolean, default: false },
    paymentConfirmationSentAt: Date,
    paymentReminderSent: { type: Boolean, default: false },
    paymentReminderSentAt: Date,
    latePaymentNoticeSent: { type: Boolean, default: false },
    latePaymentNoticeSentAt: Date,
    nsfNoticeSent: { type: Boolean, default: false },
    nsfNoticeSentAt: Date
  },
  
  // Compliance
  compliance: {
    regulationECompliant: { type: Boolean, default: true },
    nachCompliant: { type: Boolean, default: true },
    disputeReceived: { type: Boolean, default: false },
    disputeDate: Date,
    disputeReason: String,
    disputeResolution: String,
    disputeResolvedDate: Date
  },
  
  // Processing metadata
  processing: {
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    processingNotes: String,
    batchId: String,
    reconciled: { type: Boolean, default: false },
    reconciledDate: Date,
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // System metadata
  metadata: {
    source: {
      type: String,
      required: [true, 'Payment source is required'],
      enum: ['autopay', 'manual_online', 'manual_admin', 'phone', 'mail', 'branch'],
      default: 'manual_online'
    },
    ipAddress: String,
    userAgent: String,
    sessionId: String
  }
}, {
  timestamps: true,
  collection: 'payments'
});

// Indexes for performance
PaymentSchema.index({ loan: 1, scheduledDate: -1 });
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, scheduledDate: 1 });
PaymentSchema.index({ 'latePayment.isLate': 1, scheduledDate: 1 });
PaymentSchema.index({ 'nsf.isNsf': 1, 'nsf.retryScheduledDate': 1 });
PaymentSchema.index({ paymentType: 1, actualPaymentDate: -1 });
PaymentSchema.index({ 'transaction.processorName': 1, 'transaction.transactionId': 1 });

// Instance Methods
PaymentSchema.methods.calculateLateFee = function(): number {
  if (!this.isPaymentLate()) return 0;
  
  // This would typically get the late fee from the loan's rate schedule
  // For now, using a simple calculation
  const baseFee = 25; // $25 base late fee
  const percentageFee = this.amount * 0.05; // 5% of payment amount
  
  return Math.min(baseFee + percentageFee, 50); // Cap at $50
};

PaymentSchema.methods.isPaymentLate = function(): boolean {
  if (this.status === 'completed' && this.actualPaymentDate) {
    return this.actualPaymentDate > this.scheduledDate;
  }
  
  // If not yet paid, check if past due
  return new Date() > this.scheduledDate && this.status !== 'completed';
};

PaymentSchema.methods.getDaysLate = function(): number {
  if (!this.isPaymentLate()) return 0;
  
  const compareDate = this.actualPaymentDate || new Date();
  const diffTime = compareDate.getTime() - this.scheduledDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

PaymentSchema.methods.canBeRefunded = function(): boolean {
  return this.status === 'completed' && 
         !this.refund.isRefunded &&
         this.actualPaymentDate &&
         (new Date().getTime() - this.actualPaymentDate.getTime()) <= (60 * 24 * 60 * 60 * 1000); // 60 days
};

PaymentSchema.methods.processRefund = async function(amount: number, reason: string, adminId: Types.ObjectId): Promise<void> {
  if (!this.canBeRefunded()) {
    throw new Error('Payment cannot be refunded');
  }
  
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  // Update refund information
  if (amount === this.amount) {
    this.refund.isRefunded = true;
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
    if (!this.refund.partialRefunds) this.refund.partialRefunds = [];
    this.refund.partialRefunds.push({
      amount,
      date: new Date(),
      reason,
      transactionId: `REF_${Date.now()}`
    });
  }
  
  this.refund.refundAmount = (this.refund.refundAmount || 0) + amount;
  this.refund.refundDate = new Date();
  this.refund.refundReason = reason;
  this.refund.refundedBy = adminId;
  
  await this.save();
};

PaymentSchema.methods.sendPaymentConfirmation = async function(): Promise<void> {
  // Implementation would integrate with email/SMS service
  this.notifications.paymentConfirmationSent = true;
  this.notifications.paymentConfirmationSentAt = new Date();
  await this.save();
};

PaymentSchema.methods.updateLoanBalance = async function(): Promise<void> {
  const { Loan } = require('./Loan');
  const loan = await Loan.findById(this.loan);
  
  if (!loan) {
    throw new Error('Loan not found');
  }
  
  // Update loan balance based on payment allocation
  if (this.status === 'completed') {
    loan.repayment.currentBalance = this.balanceImpact.totalBalanceAfter;
    loan.repayment.totalPaid = (loan.repayment.totalPaid || 0) + this.amount;
    
    // Calculate next payment date (next month)
    if (this.balanceImpact.totalBalanceAfter > 0) {
      const nextDate = new Date(this.scheduledDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      loan.repayment.nextPaymentDate = nextDate;
    } else {
      // Loan is paid off
      loan.status = 'paid_off';
      loan.repayment.nextPaymentDate = null;
    }
    
    await loan.save();
  }
};

// Pre-save middleware
PaymentSchema.pre('save', function(next) {
  // Auto-generate payment ID if not set
  if (!this.paymentId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.paymentId = `PAY_${timestamp}_${random}`.toUpperCase();
  }
  
  // Calculate late payment information
  this.latePayment.isLate = this.isPaymentLate();
  if (this.latePayment.isLate) {
    this.latePayment.daysLate = this.getDaysLate();
  }
  
  // Ensure allocation matches total amount
  const totalAllocation = this.allocation.principal + 
                         this.allocation.interest + 
                         this.allocation.fees.latePaymentFee +
                         this.allocation.fees.nsfFee +
                         this.allocation.fees.processingFee +
                         this.allocation.fees.other +
                         (this.allocation.escrow || 0);
  
  if (Math.abs(totalAllocation - this.amount) > 0.01) {
    return next(new Error('Payment allocation does not match total amount'));
  }
  
  next();
});

// Static methods
PaymentSchema.statics.findOverduePayments = function() {
  return this.find({
    status: { $in: ['pending', 'failed'] },
    scheduledDate: { $lt: new Date() }
  }).populate('loan user');
};

PaymentSchema.statics.findUpcomingPayments = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'pending',
    scheduledDate: {
      $gte: new Date(),
      $lte: futureDate
    }
  }).populate('loan user');
};

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);