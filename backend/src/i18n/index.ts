import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector } from 'i18next-http-middleware';
import path from 'path';

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .init({
    lng: 'en', // Default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Namespace configuration
    ns: ['common', 'validation', 'compliance', 'calculator', 'credit'],
    defaultNS: 'common',
    
    // Backend configuration
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}', '{{ns}}.json'),
    },
    
    // Language detection
    detection: {
      order: ['header', 'querystring', 'cookie', 'session'],
      lookupHeader: 'accept-language',
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupSession: 'lng',
      caches: ['cookie'],
      ignoreCase: true
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
      formatSeparator: ',',
      format: (value, format, lng) => {
        if (format === 'currency' && lng === 'en') {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
        if (format === 'currency' && lng === 'zh') {
          return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
        if (format === 'percent') {
          return new Intl.NumberFormat(lng === 'zh' ? 'zh-CN' : 'en-US', {
            style: 'percent',
            minimumFractionDigits: 2
          }).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng === 'zh' ? 'zh-CN' : 'en-US').format(new Date(value));
        }
        return value;
      }
    },
    
    // Resources for immediate availability
    resources: {
      en: {
        common: {},
        validation: {},
        compliance: {},
        calculator: {},
        credit: {}
      },
      zh: {
        common: {},
        validation: {},
        compliance: {},
        calculator: {},
        credit: {}
      }
    }
  });

export default i18n;

// Helper functions for validation messages
export const getValidationMessage = (key: string, options?: any, lng?: string): string => {
  return i18n.t(`validation:${key}`, { ...options, lng }) as string;
};

export const getComplianceMessage = (key: string, options?: any, lng?: string): string => {
  return i18n.t(`compliance:${key}`, { ...options, lng }) as string;
};

export const getCalculatorMessage = (key: string, options?: any, lng?: string): string => {
  return i18n.t(`calculator:${key}`, { ...options, lng }) as string;
};

export const getCreditMessage = (key: string, options?: any, lng?: string): string => {
  return i18n.t(`credit:${key}`, { ...options, lng }) as string;
};

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'zh'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Language validation
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

// Get user's preferred language from request
export const getLanguageFromRequest = (req: any): SupportedLanguage => {
  // Check query parameter
  if (req.query.lng && isValidLanguage(req.query.lng)) {
    return req.query.lng as SupportedLanguage;
  }
  
  // Check header
  if (req.headers['accept-language']) {
    const headerLang = req.headers['accept-language'].split(',')[0].split('-')[0];
    if (isValidLanguage(headerLang)) {
      return headerLang as SupportedLanguage;
    }
  }
  
  // Default to English
  return 'en';
};