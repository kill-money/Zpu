import { z } from 'zod';
import { getValidationMessage, getLanguageFromRequest } from '../i18n';

// US State Abbreviations (all 50 states + DC + territories)
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'AS', 'GU', 'MP', 'PR', 'VI'
] as const;

export type USState = typeof US_STATES[number];

// Federal Reserve Bank routing number prefixes
const ROUTING_NUMBER_PREFIXES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'
];

// Invalid SSN patterns (known test/dummy numbers)
const INVALID_SSN_PATTERNS = [
  /^000/, /^666/, /^9\d{2}/, // Invalid area numbers
  /^\d{3}00/, // Invalid group numbers  
  /^\d{5}0{4}$/ // Invalid serial numbers
];

// Helper functions for validation
export class ValidationHelpers {
  
  /**
   * Validate Social Security Number (SSN)
   * Format: XXX-XX-XXXX or XXXXXXXXX
   */
  static validateSSN(ssn: string): boolean {
    if (!ssn) return false;
    
    // Remove all non-digits
    const cleanSSN = ssn.replace(/\D/g, '');
    
    // Must be exactly 9 digits
    if (cleanSSN.length !== 9) return false;
    
    // Check for invalid patterns
    for (const pattern of INVALID_SSN_PATTERNS) {
      if (pattern.test(cleanSSN)) return false;
    }
    
    // Area number cannot be 000, 666, or 900-999
    const area = parseInt(cleanSSN.substring(0, 3));
    if (area === 0 || area === 666 || area >= 900) return false;
    
    // Group number cannot be 00
    const group = parseInt(cleanSSN.substring(3, 5));
    if (group === 0) return false;
    
    // Serial number cannot be 0000
    const serial = parseInt(cleanSSN.substring(5, 9));
    if (serial === 0) return false;
    
    return true;
  }
  
  /**
   * Validate Employer Identification Number (EIN)
   * Format: XX-XXXXXXX
   */
  static validateEIN(ein: string): boolean {
    if (!ein) return false;
    
    // Remove all non-digits
    const cleanEIN = ein.replace(/\D/g, '');
    
    // Must be exactly 9 digits
    if (cleanEIN.length !== 9) return false;
    
    // First two digits (prefix) must be valid
    const prefix = parseInt(cleanEIN.substring(0, 2));
    const validPrefixes = [
      1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25,
      26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
      45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,
      63, 64, 65, 66, 67, 68, 71, 72, 73, 74, 75, 76, 77, 81, 82, 83, 84,
      85, 86, 87, 88, 90, 91, 92, 93, 94, 95, 98, 99
    ];
    
    return validPrefixes.includes(prefix);
  }
  
  /**
   * Validate Bank Routing Number
   * 9-digit number with checksum validation
   */
  static validateRoutingNumber(routing: string): boolean {
    if (!routing) return false;
    
    // Remove all non-digits
    const cleanRouting = routing.replace(/\D/g, '');
    
    // Must be exactly 9 digits
    if (cleanRouting.length !== 9) return false;
    
    // Check prefix (first 2 digits must be valid Federal Reserve routing symbol)
    const prefix = cleanRouting.substring(0, 2);
    if (!ROUTING_NUMBER_PREFIXES.includes(prefix)) return false;
    
    // Checksum validation using the standard ABA algorithm
    const digits = cleanRouting.split('').map(Number);
    const checksum = (
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      1 * (digits[2] + digits[5] + digits[8])
    ) % 10;
    
    return checksum === 0;
  }
  
  /**
   * Validate US Phone Number
   * Format: (XXX) XXX-XXXX
   */
  static validateUSPhone(phone: string): boolean {
    if (!phone) return false;
    
    // Remove all non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Must be exactly 10 digits (US domestic) or 11 digits (with country code)
    if (cleanPhone.length === 11 && cleanPhone[0] === '1') {
      // Remove country code
      return this.validateUSPhone(cleanPhone.substring(1));
    }
    
    if (cleanPhone.length !== 10) return false;
    
    // Area code cannot start with 0 or 1
    const areaCode = cleanPhone.substring(0, 3);
    if (areaCode[0] === '0' || areaCode[0] === '1') return false;
    
    // Exchange code cannot start with 0 or 1
    const exchange = cleanPhone.substring(3, 6);
    if (exchange[0] === '0' || exchange[0] === '1') return false;
    
    return true;
  }
  
  /**
   * Validate ZIP Code (ZIP or ZIP+4)
   * Format: XXXXX or XXXXX-XXXX
   */
  static validateZipCode(zip: string): boolean {
    if (!zip) return false;
    
    // Standard ZIP: 5 digits
    const zipPattern = /^\d{5}$/;
    
    // ZIP+4: 5 digits, hyphen, 4 digits
    const zip4Pattern = /^\d{5}-\d{4}$/;
    
    return zipPattern.test(zip) || zip4Pattern.test(zip);
  }
  
  /**
   * Validate US State abbreviation
   */
  static validateUSState(state: string): boolean {
    if (!state) return false;
    return US_STATES.includes(state.toUpperCase() as USState);
  }
  
  /**
   * Format SSN with standard formatting
   */
  static formatSSN(ssn: string): string {
    const clean = ssn.replace(/\D/g, '');
    if (clean.length >= 9) {
      return `${clean.substring(0, 3)}-${clean.substring(3, 5)}-${clean.substring(5, 9)}`;
    }
    return ssn;
  }
  
  /**
   * Format EIN with standard formatting
   */
  static formatEIN(ein: string): string {
    const clean = ein.replace(/\D/g, '');
    if (clean.length >= 9) {
      return `${clean.substring(0, 2)}-${clean.substring(2, 9)}`;
    }
    return ein;
  }
  
  /**
   * Format phone number with standard formatting
   */
  static formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      const digits = clean.length === 11 && clean[0] === '1' ? clean.substring(1) : clean;
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
    }
    return phone;
  }
}

/**
 * Create localized Zod schema with validation messages
 */
export const createValidationSchema = (req?: any) => {
  const lng = req ? getLanguageFromRequest(req) : 'en';
  
  // Base string validators
  const requiredString = (key: string) => 
    z.string().min(1, getValidationMessage('required', {}, lng));
  
  const email = () => 
    z.string().email(getValidationMessage('invalidEmail', {}, lng));
  
  // US-specific validators
  const ssn = () => z.string()
    .min(1, getValidationMessage('ssn.required', {}, lng))
    .refine(ValidationHelpers.validateSSN, {
      message: getValidationMessage('ssn.invalid', {}, lng)
    })
    .transform(ValidationHelpers.formatSSN);
  
  const ein = () => z.string()
    .min(1, getValidationMessage('ein.required', {}, lng))
    .refine(ValidationHelpers.validateEIN, {
      message: getValidationMessage('ein.invalid', {}, lng)
    })
    .transform(ValidationHelpers.formatEIN);
  
  const routingNumber = () => z.string()
    .min(1, getValidationMessage('routing.required', {}, lng))
    .refine(ValidationHelpers.validateRoutingNumber, {
      message: getValidationMessage('routing.invalid', {}, lng)
    });
  
  const accountNumber = () => z.string()
    .min(4, getValidationMessage('account.tooShort', { min: 4 }, lng))
    .max(20, getValidationMessage('account.tooLong', { max: 20 }, lng))
    .regex(/^\d+$/, getValidationMessage('account.invalidDigits', {}, lng));
  
  const usPhone = () => z.string()
    .min(1, getValidationMessage('phone.required', {}, lng))
    .refine(ValidationHelpers.validateUSPhone, {
      message: getValidationMessage('phone.invalid', {}, lng)
    })
    .transform(ValidationHelpers.formatPhone);
  
  const zipCode = () => z.string()
    .min(1, getValidationMessage('address.zipRequired', {}, lng))
    .refine(ValidationHelpers.validateZipCode, {
      message: getValidationMessage('address.invalidZip', {}, lng)
    });
  
  const usState = () => z.string()
    .min(1, getValidationMessage('state.required', {}, lng))
    .refine(ValidationHelpers.validateUSState, {
      message: getValidationMessage('state.invalid', {}, lng)
    })
    .transform(state => state.toUpperCase());
  
  const currency = (min?: number, max?: number) => {
    let schema = z.number()
      .min(0.01, getValidationMessage('minValue', { min: '$0.01' }, lng));
    
    if (min !== undefined) {
      schema = schema.min(min, getValidationMessage('minValue', { min: `$${min.toLocaleString()}` }, lng));
    }
    
    if (max !== undefined) {
      schema = schema.max(max, getValidationMessage('maxValue', { max: `$${max.toLocaleString()}` }, lng));
    }
    
    return schema;
  };
  
  const creditScore = () => z.number()
    .int()
    .min(300, getValidationMessage('credit.scoreInvalid', {}, lng))
    .max(850, getValidationMessage('credit.scoreInvalid', {}, lng));
  
  const percentage = (min = 0, max = 100) => z.number()
    .min(min, getValidationMessage('minValue', { min: `${min}%` }, lng))
    .max(max, getValidationMessage('maxValue', { max: `${max}%` }, lng));
  
  const dateOfBirth = () => z.string()
    .min(1, getValidationMessage('identity.dobRequired', {}, lng))
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return age >= 18 && age <= 120;
    }, {
      message: getValidationMessage('identity.tooYoung', {}, lng)
    });
  
  return {
    // Basic validators
    requiredString,
    email,
    
    // US-specific validators
    ssn,
    ein,
    routingNumber,
    accountNumber,
    usPhone,
    zipCode,
    usState,
    currency,
    creditScore,
    percentage,
    dateOfBirth,
    
    // Common schemas
    address: () => z.object({
      street: requiredString('address.streetRequired'),
      apartment: z.string().optional(),
      city: requiredString('address.cityRequired'),
      state: usState(),
      zipCode: zipCode()
    }),
    
    bankAccount: () => z.object({
      routingNumber: routingNumber(),
      accountNumber: accountNumber(),
      accountType: z.enum(['checking', 'savings'])
    }),
    
    personalInfo: () => z.object({
      firstName: requiredString('firstName'),
      lastName: requiredString('lastName'),
      dateOfBirth: dateOfBirth(),
      ssn: ssn(),
      phone: usPhone(),
      email: email()
    }),
    
    employment: () => z.object({
      status: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'student']),
      employer: z.string().optional(),
      position: z.string().optional(),
      monthlyIncome: currency(0, 1000000),
      employmentDuration: z.number().int().min(0).max(600) // months
    }),
    
    loanApplication: () => z.object({
      amount: currency(1000, 1000000),
      term: z.number().int().min(12).max(360), // months
      purpose: z.enum(['debt_consolidation', 'home_improvement', 'auto', 'personal', 'business']),
      collateral: z.string().optional()
    })
  };
};

// Export commonly used schemas
export const CommonSchemas = createValidationSchema();

// Loan purpose options
export const LOAN_PURPOSES = [
  'debt_consolidation',
  'home_improvement', 
  'auto',
  'personal',
  'business',
  'medical',
  'education',
  'vacation',
  'wedding',
  'moving',
  'other'
] as const;

// Employment status options
export const EMPLOYMENT_STATUSES = [
  'employed',
  'self_employed',
  'unemployed', 
  'retired',
  'student',
  'homemaker',
  'disabled'
] as const;

// Account types
export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'money_market',
  'certificate_of_deposit'
] as const;

// Income frequency options
export const INCOME_FREQUENCIES = [
  'weekly',
  'bi_weekly',
  'semi_monthly',
  'monthly',
  'quarterly',
  'annually'
] as const;