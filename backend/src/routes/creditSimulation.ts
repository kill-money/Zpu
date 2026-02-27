import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { getCreditMessage, getLanguageFromRequest } from '../i18n';
import { ValidationHelpers } from '../validation/schemas';

const router = express.Router();

// Rate limiting for credit simulation API
const creditLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Too many credit simulation requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

router.use(creditLimiter);

/**
 * Credit Simulation Engine
 * Simulates credit profile analysis and lending decisions
 */
export class CreditSimulator {
  
  /**
   * Generate a random credit profile for simulation
   */
  static generateRandomProfile(type: 'excellent' | 'good' | 'fair' | 'poor' | 'newCredit' | 'recovery' = 'good') {
    const profiles = {
      excellent: {
        creditScore: this.randomBetween(750, 850),
        historyLength: this.randomBetween(120, 300), // 10-25 years in months
        paymentHistory: {
          onTime: this.randomBetween(95, 100),
          late30: this.randomBetween(0, 2),
          late60: this.randomBetween(0, 1),
          late90: this.randomBetween(0, 0),
          chargeOffs: 0,
          collections: 0
        },
        creditUtilization: this.randomBetween(5, 25),
        totalAccounts: this.randomBetween(8, 15),
        hardInquiries: this.randomBetween(0, 2),
        publicRecords: 0
      },
      good: {
        creditScore: this.randomBetween(650, 749),
        historyLength: this.randomBetween(60, 180), // 5-15 years
        paymentHistory: {
          onTime: this.randomBetween(85, 95),
          late30: this.randomBetween(2, 8),
          late60: this.randomBetween(0, 3),
          late90: this.randomBetween(0, 1),
          chargeOffs: this.randomBetween(0, 1),
          collections: this.randomBetween(0, 1)
        },
        creditUtilization: this.randomBetween(25, 45),
        totalAccounts: this.randomBetween(5, 12),
        hardInquiries: this.randomBetween(1, 4),
        publicRecords: this.randomBetween(0, 1)
      },
      fair: {
        creditScore: this.randomBetween(580, 649),
        historyLength: this.randomBetween(36, 120), // 3-10 years
        paymentHistory: {
          onTime: this.randomBetween(70, 85),
          late30: this.randomBetween(8, 15),
          late60: this.randomBetween(2, 8),
          late90: this.randomBetween(1, 4),
          chargeOffs: this.randomBetween(1, 3),
          collections: this.randomBetween(1, 3)
        },
        creditUtilization: this.randomBetween(45, 75),
        totalAccounts: this.randomBetween(3, 8),
        hardInquiries: this.randomBetween(3, 8),
        publicRecords: this.randomBetween(0, 2)
      },
      poor: {
        creditScore: this.randomBetween(300, 579),
        historyLength: this.randomBetween(12, 84), // 1-7 years
        paymentHistory: {
          onTime: this.randomBetween(40, 70),
          late30: this.randomBetween(15, 30),
          late60: this.randomBetween(8, 20),
          late90: this.randomBetween(4, 15),
          chargeOffs: this.randomBetween(2, 8),
          collections: this.randomBetween(2, 10)
        },
        creditUtilization: this.randomBetween(75, 100),
        totalAccounts: this.randomBetween(2, 6),
        hardInquiries: this.randomBetween(5, 15),
        publicRecords: this.randomBetween(1, 4)
      },
      newCredit: {
        creditScore: this.randomBetween(620, 720),
        historyLength: this.randomBetween(3, 24), // 3 months - 2 years
        paymentHistory: {
          onTime: this.randomBetween(90, 100),
          late30: this.randomBetween(0, 3),
          late60: this.randomBetween(0, 1),
          late90: this.randomBetween(0, 0),
          chargeOffs: 0,
          collections: 0
        },
        creditUtilization: this.randomBetween(10, 40),
        totalAccounts: this.randomBetween(1, 4),
        hardInquiries: this.randomBetween(1, 3),
        publicRecords: 0
      },
      recovery: {
        creditScore: this.randomBetween(580, 680),
        historyLength: this.randomBetween(48, 120), // 4-10 years
        paymentHistory: {
          onTime: this.randomBetween(80, 95),
          late30: this.randomBetween(5, 12),
          late60: this.randomBetween(2, 6),
          late90: this.randomBetween(1, 3),
          chargeOffs: this.randomBetween(1, 4),
          collections: this.randomBetween(0, 2)
        },
        creditUtilization: this.randomBetween(20, 50),
        totalAccounts: this.randomBetween(4, 10),
        hardInquiries: this.randomBetween(2, 6),
        publicRecords: this.randomBetween(0, 2)
      }
    };
    
    return {
      ...profiles[type],
      profileType: type,
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Analyze credit profile and generate risk assessment
   */
  static analyzeCreditProfile(profile: any) {
    const analysis = {
      creditScore: profile.creditScore,
      riskLevel: this.calculateRiskLevel(profile),
      riskFactors: this.identifyRiskFactors(profile),
      protectiveFactors: this.identifyProtectiveFactors(profile),
      scoreFactors: this.analyzeScoreFactors(profile),
      recommendation: '',
      suggestedTerms: {},
      complianceFlags: [] as string[]
    };
    
    // Generate lending recommendation
    analysis.recommendation = this.generateLendingRecommendation(analysis.riskLevel, profile.creditScore);
    
    // Generate suggested lending terms
    analysis.suggestedTerms = this.generateLendingTerms(profile.creditScore, analysis.riskLevel);
    
    // Check compliance requirements
    analysis.complianceFlags = this.checkComplianceRequirements(analysis);
    
    return analysis;
  }
  
  /**
   * Calculate risk level based on credit profile
   */
  static calculateRiskLevel(profile: any): string {
    let riskScore = 0;
    
    // Credit score impact (40% weight)
    if (profile.creditScore >= 750) riskScore += 0;
    else if (profile.creditScore >= 700) riskScore += 10;
    else if (profile.creditScore >= 650) riskScore += 25;
    else if (profile.creditScore >= 600) riskScore += 40;
    else riskScore += 60;
    
    // Payment history impact (30% weight)
    const latePayments = profile.paymentHistory.late30 + profile.paymentHistory.late60 * 2 + profile.paymentHistory.late90 * 3;
    riskScore += Math.min(latePayments * 2, 30);
    
    // Credit utilization impact (15% weight)
    if (profile.creditUtilization > 80) riskScore += 15;
    else if (profile.creditUtilization > 60) riskScore += 10;
    else if (profile.creditUtilization > 40) riskScore += 5;
    else if (profile.creditUtilization > 30) riskScore += 2;
    
    // History length impact (10% weight)
    if (profile.historyLength < 12) riskScore += 10;
    else if (profile.historyLength < 24) riskScore += 5;
    else if (profile.historyLength < 60) riskScore += 2;
    
    // Hard inquiries impact (5% weight)
    if (profile.hardInquiries > 10) riskScore += 5;
    else if (profile.hardInquiries > 6) riskScore += 3;
    else if (profile.hardInquiries > 3) riskScore += 1;
    
    // Public records impact (heavy penalty)
    riskScore += profile.publicRecords * 15;
    riskScore += profile.paymentHistory.chargeOffs * 10;
    riskScore += profile.paymentHistory.collections * 8;
    
    if (riskScore <= 15) return 'veryLow';
    if (riskScore <= 30) return 'low';
    if (riskScore <= 50) return 'moderate';
    if (riskScore <= 75) return 'high';
    return 'veryHigh';
  }
  
  /**
   * Identify risk factors in credit profile
   */
  static identifyRiskFactors(profile: any): string[] {
    const factors = [];
    
    if (profile.creditScore < 650) factors.push('Low credit score');
    if (profile.creditUtilization > 60) factors.push('High credit utilization');
    if (profile.paymentHistory.late90 > 0) factors.push('Recent 90+ day late payments');
    if (profile.paymentHistory.chargeOffs > 0) factors.push('Charge-offs on record');
    if (profile.paymentHistory.collections > 0) factors.push('Accounts in collections');
    if (profile.publicRecords > 0) factors.push('Public records (bankruptcy/judgments)');
    if (profile.hardInquiries > 6) factors.push('Too many recent credit inquiries');
    if (profile.historyLength < 24) factors.push('Limited credit history');
    if (profile.totalAccounts < 3) factors.push('Insufficient credit accounts');
    
    return factors;
  }
  
  /**
   * Identify protective factors in credit profile
   */
  static identifyProtectiveFactors(profile: any): string[] {
    const factors = [];
    
    if (profile.creditScore >= 750) factors.push('Excellent credit score');
    if (profile.paymentHistory.onTime >= 95) factors.push('Excellent payment history');
    if (profile.creditUtilization <= 30) factors.push('Low credit utilization');
    if (profile.historyLength >= 120) factors.push('Long credit history');
    if (profile.totalAccounts >= 8) factors.push('Diverse credit portfolio');
    if (profile.hardInquiries <= 2) factors.push('Minimal recent credit inquiries');
    if (profile.publicRecords === 0) factors.push('No public records');
    if (profile.paymentHistory.chargeOffs === 0) factors.push('No charge-offs');
    if (profile.paymentHistory.collections === 0) factors.push('No collection accounts');
    
    return factors;
  }
  
  /**
   * Analyze credit score factors
   */
  static analyzeScoreFactors(profile: any) {
    return {
      paymentHistory: {
        weight: 35,
        impact: profile.paymentHistory.onTime >= 95 ? 'positive' : 
                profile.paymentHistory.onTime >= 80 ? 'neutral' : 'negative'
      },
      creditUtilization: {
        weight: 30,
        impact: profile.creditUtilization <= 30 ? 'positive' :
                profile.creditUtilization <= 60 ? 'neutral' : 'negative'
      },
      historyLength: {
        weight: 15,
        impact: profile.historyLength >= 84 ? 'positive' :
                profile.historyLength >= 36 ? 'neutral' : 'negative'
      },
      creditMix: {
        weight: 10,
        impact: profile.totalAccounts >= 6 ? 'positive' :
                profile.totalAccounts >= 3 ? 'neutral' : 'negative'
      },
      newCredit: {
        weight: 10,
        impact: profile.hardInquiries <= 3 ? 'positive' :
                profile.hardInquiries <= 6 ? 'neutral' : 'negative'
      }
    };
  }
  
  /**
   * Generate lending recommendation
   */
  static generateLendingRecommendation(riskLevel: string, creditScore: number): string {
    if (riskLevel === 'veryLow' && creditScore >= 750) return 'approve';
    if (riskLevel === 'low' && creditScore >= 700) return 'approve';
    if (riskLevel === 'moderate' && creditScore >= 650) return 'approveWithConditions';
    if (riskLevel === 'high' && creditScore >= 600) return 'counterOffer';
    if (creditScore >= 580) return 'manualReview';
    return 'decline';
  }
  
  /**
   * Generate suggested lending terms
   */
  static generateLendingTerms(creditScore: number, riskLevel: string) {
    const terms: any = {
      maxLoanAmount: 0,
      interestRate: { min: 0, max: 0 },
      maxLoanTerm: 0,
      requiredDownPayment: 0,
      conditions: []
    };
    
    // Set terms based on credit score and risk level
    if (creditScore >= 750) {
      terms.maxLoanAmount = 500000;
      terms.interestRate = { min: 5.99, max: 8.99 };
      terms.maxLoanTerm = 84;
      terms.requiredDownPayment = 0;
    } else if (creditScore >= 700) {
      terms.maxLoanAmount = 300000;
      terms.interestRate = { min: 7.99, max: 12.99 };
      terms.maxLoanTerm = 72;
      terms.requiredDownPayment = 5;
    } else if (creditScore >= 650) {
      terms.maxLoanAmount = 150000;
      terms.interestRate = { min: 10.99, max: 17.99 };
      terms.maxLoanTerm = 60;
      terms.requiredDownPayment = 10;
      terms.conditions.push('Income verification required');
    } else if (creditScore >= 600) {
      terms.maxLoanAmount = 75000;
      terms.interestRate = { min: 15.99, max: 24.99 };
      terms.maxLoanTerm = 48;
      terms.requiredDownPayment = 20;
      terms.conditions.push('Co-signer may be required');
      terms.conditions.push('Additional documentation required');
    } else {
      terms.maxLoanAmount = 25000;
      terms.interestRate = { min: 22.99, max: 35.99 };
      terms.maxLoanTerm = 36;
      terms.requiredDownPayment = 30;
      terms.conditions.push('Secured loan only');
      terms.conditions.push('Co-signer required');
    }
    
    // Adjust based on risk level
    if (riskLevel === 'high' || riskLevel === 'veryHigh') {
      terms.maxLoanAmount *= 0.7;
      terms.interestRate.min += 2;
      terms.interestRate.max += 3;
      terms.requiredDownPayment += 10;
    }
    
    return terms;
  }
  
  /**
   * Check compliance requirements
   */
  static checkComplianceRequirements(analysis: any): string[] {
    const flags = [];
    
    if (analysis.recommendation === 'decline' || analysis.recommendation === 'counterOffer') {
      flags.push('ADVERSE_ACTION_REQUIRED');
      flags.push('FCRA_DISCLOSURE_REQUIRED');
      flags.push('ECOA_NOTICE_REQUIRED');
    }
    
    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'veryHigh') {
      flags.push('MANUAL_REVIEW_RECOMMENDED');
      flags.push('ENHANCED_DOCUMENTATION_REQUIRED');
    }
    
    return flags;
  }
  
  /**
   * Generate random number between min and max (inclusive)
   */
  private static randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Validation schemas
const simulationSchema = z.object({
  profileType: z.enum(['excellent', 'good', 'fair', 'poor', 'newCredit', 'recovery']).optional(),
  customProfile: z.object({
    creditScore: z.number().int().min(300).max(850).optional(),
    historyLength: z.number().int().min(1).max(600).optional(),
    creditUtilization: z.number().min(0).max(100).optional(),
    totalAccounts: z.number().int().min(0).max(50).optional(),
    hardInquiries: z.number().int().min(0).max(50).optional(),
    publicRecords: z.number().int().min(0).max(20).optional(),
    paymentHistory: z.object({
      onTime: z.number().min(0).max(100).optional(),
      late30: z.number().int().min(0).max(100).optional(),
      late60: z.number().int().min(0).max(100).optional(),
      late90: z.number().int().min(0).max(100).optional(),
      chargeOffs: z.number().int().min(0).max(50).optional(),
      collections: z.number().int().min(0).max(50).optional()
    }).optional()
  }).optional()
});

/**
 * @route POST /api/credit/simulate
 * @desc Generate and analyze a credit profile
 * @access Public
 */
router.post('/simulate', async (req, res) => {
  const lng = getLanguageFromRequest(req);
  try {
    const validation = simulationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: getCreditMessage('messages.analysisError', {}, lng),
        errors: validation.error.errors
      });
    }
    
    const { profileType = 'good', customProfile } = validation.data;
    
    // Generate or use custom profile
    const profile = customProfile && Object.keys(customProfile).length > 0 
      ? { ...CreditSimulator.generateRandomProfile(profileType), ...customProfile }
      : CreditSimulator.generateRandomProfile(profileType);
    
    // Analyze the profile
    const analysis = CreditSimulator.analyzeCreditProfile(profile);
    
    res.json({
      success: true,
      message: getCreditMessage('messages.simulationComplete', {}, lng),
      data: {
        profile,
        analysis,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Credit simulation error:', error);
    res.status(500).json({
      success: false,
      message: getCreditMessage('messages.analysisError', {}, lng),
      code: 'SIMULATION_ERROR'
    });
  }
});

/**
 * @route POST /api/credit/analyze
 * @desc Analyze a provided credit profile
 * @access Public
 */
router.post('/analyze', async (req, res) => {
  const lng = getLanguageFromRequest(req);
  try {
    const { profile } = req.body;
    
    if (!profile || !profile.creditScore) {
      return res.status(400).json({
        success: false,
        message: getCreditMessage('messages.noProfile', {}, lng),
        code: 'INVALID_PROFILE'
      });
    }
    
    const analysis = CreditSimulator.analyzeCreditProfile(profile);
    
    res.json({
      success: true,
      message: getCreditMessage('analysis.title', {}, lng),
      data: {
        profile,
        analysis,
        analyzedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Credit analysis error:', error);
    res.status(500).json({
      success: false,
      message: getCreditMessage('messages.analysisError', {}, lng),
      code: 'ANALYSIS_ERROR'
    });
  }
});

/**
 * @route GET /api/credit/profiles
 * @desc Get predefined credit profiles for simulation
 * @access Public
 */
router.get('/profiles', async (req, res) => {
  const lng = getLanguageFromRequest(req);
  try {
    
    const profiles = {
      excellent: CreditSimulator.generateRandomProfile('excellent'),
      good: CreditSimulator.generateRandomProfile('good'),
      fair: CreditSimulator.generateRandomProfile('fair'),
      poor: CreditSimulator.generateRandomProfile('poor'),
      newCredit: CreditSimulator.generateRandomProfile('newCredit'),
      recovery: CreditSimulator.generateRandomProfile('recovery')
    };
    
    res.json({
      success: true,
      message: getCreditMessage('simulation_profiles.title', {}, lng),
      data: profiles
    });
    
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      success: false,
      message: getCreditMessage('messages.analysisError', {}, lng),
      code: 'PROFILE_ERROR'
    });
  }
});

/**
 * @route GET /api/credit/score-factors
 * @desc Get information about credit score factors
 * @access Public
 */
router.get('/score-factors', async (req, res) => {
  const lng = getLanguageFromRequest(req);
  try {
    
    const factors = {
      paymentHistory: {
        weight: 35,
        description: getCreditMessage('paymentHistory.title', {}, lng),
        tips: [
          'Always pay at least the minimum amount due',
          'Set up automatic payments to avoid late payments',
          'Pay off past due accounts as soon as possible'
        ]
      },
      creditUtilization: {
        weight: 30,
        description: getCreditMessage('creditUtilization.title', {}, lng),
        tips: [
          'Keep total utilization below 30%',
          'Pay down balances before statement dates',
          'Consider requesting credit limit increases'
        ]
      },
      historyLength: {
        weight: 15,
        description: getCreditMessage('creditHistory.title', {}, lng),
        tips: [
          'Keep old accounts open',
          'Avoid closing your oldest credit cards',
          'Be patient - history length improves with time'
        ]
      },
      creditMix: {
        weight: 10,
        description: getCreditMessage('accounts.title', {}, lng),
        tips: [
          'Maintain a mix of credit types',
          'Consider an installment loan if you only have credit cards',
          'Only open accounts you actually need'
        ]
      },
      newCredit: {
        weight: 10,
        description: getCreditMessage('inquiries.title', {}, lng),
        tips: [
          'Limit credit applications',
          'Shop for rates within a focused time period',
          'Avoid opening multiple accounts quickly'
        ]
      }
    };
    
    res.json({
      success: true,
      message: getCreditMessage('creditScore.factors', {}, lng),
      data: factors
    });
    
  } catch (error) {
    console.error('Score factors error:', error);
    res.status(500).json({
      success: false,
      message: getCreditMessage('messages.analysisError', {}, lng),
      code: 'FACTORS_ERROR'
    });
  }
});

export default router;