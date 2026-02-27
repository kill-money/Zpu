import express from 'express';
import { z } from 'zod';
import { getComplianceMessage, getLanguageFromRequest } from '../i18n';
import { authenticateToken as requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * @route GET /api/compliance/fcra/disclosure
 * @desc Get FCRA disclosure text
 * @access Public
 */
router.get('/fcra/disclosure', async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    const companyName = process.env.COMPANY_NAME || 'ZPU Loan System';
    
    const disclosure = {
      title: getComplianceMessage('fcra.title', {}, lng),
      subtitle: getComplianceMessage('fcra.subtitle', {}, lng),
      intro: getComplianceMessage('fcra.intro', {}, lng),
      rights: {
        title: getComplianceMessage('fcra.rights.title', {}, lng),
        summary: getComplianceMessage('fcra.rights.summary', {}, lng),
        items: getComplianceMessage('fcra.rights.items', {}, lng)
      },
      consent: {
        title: getComplianceMessage('fcra.consent.title', {}, lng),
        text: getComplianceMessage('fcra.consent.text', { companyName }, lng),
        checkbox: getComplianceMessage('fcra.consent.checkbox', { companyName }, lng)
      }
    };
    
    res.json({
      success: true,
      data: disclosure,
      language: lng
    });
    
  } catch (error) {
    console.error('FCRA disclosure error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving FCRA disclosure',
      code: 'FCRA_DISCLOSURE_ERROR'
    });
  }
});

/**
 * @route GET /api/compliance/ecoa/notice
 * @desc Get ECOA notice text
 * @access Public
 */
router.get('/ecoa/notice', async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    
    const notice = {
      title: getComplianceMessage('ecoa.title', {}, lng),
      subtitle: getComplianceMessage('ecoa.subtitle', {}, lng),
      notice: {
        title: getComplianceMessage('ecoa.notice.title', {}, lng),
        text: getComplianceMessage('ecoa.notice.text', {}, lng)
      },
      rights: {
        title: getComplianceMessage('ecoa.rights.title', {}, lng),
        intro: getComplianceMessage('ecoa.rights.intro', {}, lng),
        items: getComplianceMessage('ecoa.rights.items', {}, lng)
      }
    };
    
    res.json({
      success: true,
      data: notice,
      language: lng
    });
    
  } catch (error) {
    console.error('ECOA notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving ECOA notice',
      code: 'ECOA_NOTICE_ERROR'
    });
  }
});

/**
 * @route GET /api/compliance/tila/disclosure
 * @desc Get TILA disclosure with loan terms
 * @access Public
 */
router.get('/tila/disclosure', async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    
    // Get loan terms from query parameters for dynamic disclosure
    const {
      apr = '0.00',
      financeCharge = '0.00',
      amountFinanced = '0.00',
      totalPayments = '0.00',
      payments = '0',
      paymentAmount = '0.00',
      latePaymentFee = '25.00',
      latePaymentPercent = '5',
      prepaymentPenalty = 'will not have to pay a prepayment penalty'
    } = req.query;
    
    const terms = {
      title: getComplianceMessage('tila.title', {}, lng),
      subtitle: getComplianceMessage('tila.subtitle', {}, lng),
      terms: {
        title: getComplianceMessage('tila.terms.title', {}, lng),
        apr: getComplianceMessage('tila.terms.apr', { apr }, lng),
        financeCharge: getComplianceMessage('tila.terms.financeCharge', { financeCharge }, lng),
        amountFinanced: getComplianceMessage('tila.terms.amountFinanced', { amountFinanced }, lng),
        totalPayments: getComplianceMessage('tila.terms.totalPayments', { totalPayments }, lng),
        paymentSchedule: getComplianceMessage('tila.terms.paymentSchedule', { payments, paymentAmount }, lng),
        latePayment: getComplianceMessage('tila.terms.latePayment', { latePaymentFee, latePaymentPercent }, lng),
        prepayment: getComplianceMessage('tila.terms.prepayment', { prepaymentPenalty }, lng)
      },
      rightToCancel: {
        title: getComplianceMessage('tila.rightToCancel.title', {}, lng),
        notice: getComplianceMessage('tila.rightToCancel.notice', {}, lng)
      }
    };
    
    res.json({
      success: true,
      data: terms,
      language: lng
    });
    
  } catch (error) {
    console.error('TILA disclosure error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving TILA disclosure',
      code: 'TILA_DISCLOSURE_ERROR'
    });
  }
});

/**
 * @route GET /api/compliance/tcpa/consent
 * @desc Get TCPA consent text
 * @access Public
 */
router.get('/tcpa/consent', async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    const companyName = process.env.COMPANY_NAME || 'ZPU Loan System';
    const phoneNumber = process.env.COMPANY_PHONE || '1-800-555-0123';
    const address = process.env.COMPANY_ADDRESS || '123 Main St, Anytown, USA 12345';
    
    const consent = {
      title: getComplianceMessage('tcpa.title', {}, lng),
      subtitle: getComplianceMessage('tcpa.subtitle', {}, lng),
      consent: {
        title: getComplianceMessage('tcpa.consent.title', {}, lng),
        text: getComplianceMessage('tcpa.consent.text', { companyName }, lng),
        checkbox: getComplianceMessage('tcpa.consent.checkbox', { companyName }, lng),
        revoke: getComplianceMessage('tcpa.consent.revoke', { phoneNumber, address }, lng)
      }
    };
    
    res.json({
      success: true,
      data: consent,
      language: lng
    });
    
  } catch (error) {
    console.error('TCPA consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving TCPA consent',
      code: 'TCPA_CONSENT_ERROR'
    });
  }
});

/**
 * @route GET /api/compliance/privacy/notice
 * @desc Get Privacy Policy notice
 * @access Public
 */
router.get('/privacy/notice', async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    
    const privacy = {
      title: getComplianceMessage('privacy.title', {}, lng),
      subtitle: getComplianceMessage('privacy.subtitle', {}, lng),
      collection: {
        title: getComplianceMessage('privacy.collection.title', {}, lng),
        text: getComplianceMessage('privacy.collection.text', {}, lng)
      },
      use: {
        title: getComplianceMessage('privacy.use.title', {}, lng),
        text: getComplianceMessage('privacy.use.text', {}, lng)
      },
      security: {
        title: getComplianceMessage('privacy.security.title', {}, lng),
        text: getComplianceMessage('privacy.security.text', {}, lng)
      }
    };
    
    res.json({
      success: true,
      data: privacy,
      language: lng
    });
    
  } catch (error) {
    console.error('Privacy notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving privacy notice',
      code: 'PRIVACY_NOTICE_ERROR'
    });
  }
});

/**
 * @route POST /api/compliance/adverse-action
 * @desc Generate adverse action notice
 * @access Private (Admin only)
 */
router.post('/adverse-action', requireAuth, async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    
    const schema = z.object({
      applicantName: z.string().min(1),
      action: z.string().min(1),
      reasons: z.array(z.string()).min(1),
      creditAgency: z.object({
        name: z.string(),
        address: z.string(),
        phone: z.string(),
        website: z.string().optional()
      }),
      contactInfo: z.string(),
      noticeType: z.enum(['pre', 'final'])
    });
    
    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid adverse action parameters',
        errors: validation.error.errors
      });
    }
    
    const { applicantName, action, reasons, creditAgency, contactInfo, noticeType } = validation.data;
    
    let notice: any;
    
    if (noticeType === 'pre') {
      notice = {
        title: getComplianceMessage('fcra.adverse.title', {}, lng),
        intro: getComplianceMessage('fcra.adverse.intro', {}, lng),
        actions: getComplianceMessage('fcra.adverse.actions', {}, lng),
        contact: getComplianceMessage('fcra.adverse.contact', {
          agencyName: creditAgency.name,
          agencyAddress: creditAgency.address,
          agencyPhone: creditAgency.phone,
          agencyWebsite: creditAgency.website || 'N/A'
        }, lng)
      };
    } else {
      notice = {
        title: getComplianceMessage('fcra.final.title', {}, lng),
        intro: getComplianceMessage('fcra.final.intro', {}, lng),
        reason: getComplianceMessage('fcra.final.reason', { reasons: reasons.join(', ') }, lng),
        rights: getComplianceMessage('fcra.final.rights', {}, lng),
        contact: getComplianceMessage('fcra.adverse.contact', {
          agencyName: creditAgency.name,
          agencyAddress: creditAgency.address,
          agencyPhone: creditAgency.phone,
          agencyWebsite: creditAgency.website || 'N/A'
        }, lng)
      };
    }
    
    // Add ECOA notice for final adverse action
    if (noticeType === 'final') {
      notice.ecoa = {
        title: getComplianceMessage('ecoa.adverse.title', {}, lng),
        sections: {
          action: getComplianceMessage('ecoa.adverse.sections.action', { action }, lng),
          principal: getComplianceMessage('ecoa.adverse.sections.principal', { reasons: reasons.join(', ') }, lng),
          ecoa: getComplianceMessage('ecoa.adverse.sections.ecoa', {}, lng),
          contact: getComplianceMessage('ecoa.adverse.sections.contact', { contactInfo }, lng)
        }
      };
    }
    
    res.json({
      success: true,
      data: {
        applicantName,
        noticeType,
        generatedAt: new Date().toISOString(),
        notice
      },
      language: lng
    });
    
  } catch (error) {
    console.error('Adverse action notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating adverse action notice',
      code: 'ADVERSE_ACTION_ERROR'
    });
  }
});

/**
 * @route GET /api/compliance/all
 * @desc Get all compliance disclosures in one call
 * @access Public
 */
router.get('/all', async (req, res) => {
  try {
    const lng = getLanguageFromRequest(req);
    const companyName = process.env.COMPANY_NAME || 'ZPU Loan System';
    const phoneNumber = process.env.COMPANY_PHONE || '1-800-555-0123';
    const address = process.env.COMPANY_ADDRESS || '123 Main St, Anytown, USA 12345';
    
    const allCompliance = {
      fcra: {
        title: getComplianceMessage('fcra.title', {}, lng),
        subtitle: getComplianceMessage('fcra.subtitle', {}, lng),
        intro: getComplianceMessage('fcra.intro', {}, lng),
        consent: {
          text: getComplianceMessage('fcra.consent.text', { companyName }, lng),
          checkbox: getComplianceMessage('fcra.consent.checkbox', { companyName }, lng)
        }
      },
      ecoa: {
        title: getComplianceMessage('ecoa.title', {}, lng),
        notice: {
          title: getComplianceMessage('ecoa.notice.title', {}, lng),
          text: getComplianceMessage('ecoa.notice.text', {}, lng)
        }
      },
      tila: {
        title: getComplianceMessage('tila.title', {}, lng),
        rightToCancel: {
          title: getComplianceMessage('tila.rightToCancel.title', {}, lng),
          notice: getComplianceMessage('tila.rightToCancel.notice', {}, lng)
        }
      },
      tcpa: {
        title: getComplianceMessage('tcpa.title', {}, lng),
        consent: {
          text: getComplianceMessage('tcpa.consent.text', { companyName }, lng),
          checkbox: getComplianceMessage('tcpa.consent.checkbox', { companyName }, lng),
          revoke: getComplianceMessage('tcpa.consent.revoke', { phoneNumber, address }, lng)
        }
      },
      privacy: {
        title: getComplianceMessage('privacy.title', {}, lng),
        collection: {
          title: getComplianceMessage('privacy.collection.title', {}, lng),
          text: getComplianceMessage('privacy.collection.text', {}, lng)
        },
        use: {
          title: getComplianceMessage('privacy.use.title', {}, lng),
          text: getComplianceMessage('privacy.use.text', {}, lng)
        },
        security: {
          title: getComplianceMessage('privacy.security.title', {}, lng),
          text: getComplianceMessage('privacy.security.text', {}, lng)
        }
      }
    };
    
    res.json({
      success: true,
      message: 'All compliance disclosures retrieved',
      data: allCompliance,
      language: lng,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('All compliance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving compliance disclosures',
      code: 'COMPLIANCE_ERROR'
    });
  }
});

export default router;