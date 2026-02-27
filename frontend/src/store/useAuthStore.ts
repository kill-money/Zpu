import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import CryptoJS from 'crypto-js';
import { AuthAPI, SecurityManager } from '../utils/api';

// Production-grade user interface for real financial operations
interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  ssn: string; // Encrypted SSN - never stored in plain text
  maskedSSN: string; // Display version: XXX-XX-1234
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Identity Verification Status (KYC)
  identityVerification: {
    status: 'pending' | 'verified' | 'failed' | 'expired';
    documentType?: 'drivers_license' | 'passport' | 'state_id';
    verifiedAt?: string;
    expiresAt?: string;
    verificationProvider?: string;
    verificationScore?: number;
  };
  
  // Financial Profile
  financialProfile: {
    creditScore?: number;
    creditScoreModel?: string;
    creditReportPulledAt?: string;
    annualIncome?: number;
    employmentStatus?: 'employed' | 'self_employed' | 'unemployed' | 'retired';
    bankAccountVerified?: boolean;
    hasBankruptcy?: boolean;
    hasForeclosure?: boolean;
  };
  
  // Compliance & Consent
  compliance: {
    fcraConsent: boolean;
    fcraConsentDate?: string;
    tcpaConsent: boolean;
    tcpaConsentDate?: string;
    creditMonitoringConsent: boolean;
    marketingConsent: boolean;
    privacyPolicyAccepted: boolean;
    termsOfServiceAccepted: boolean;
    lastComplianceUpdate: string;
  };
  
  // Account Security
  security: {
    mfaEnabled: boolean;
    mfaMethod?: 'sms' | 'email' | 'app';
    lastPasswordChange?: string;
    failedLoginAttempts: number;
    accountLocked: boolean;
    lockoutExpiresAt?: string;
    deviceFingerprints: string[];
    trustedDevices: Array<{
      id: string;
      name: string;
      lastUsed: string;
      fingerprint: string;
    }>;
  };
  
  // Regulatory & Audit
  audit: {
    createdAt: string;
    lastLoginAt?: string;
    lastActivityAt?: string;
    accountStatus: 'active' | 'pending' | 'suspended' | 'closed';
    riskLevel: 'low' | 'medium' | 'high';
    sanctionsScreening: {
      status: 'clear' | 'flagged' | 'pending';
      checkedAt: string;
      nextCheckDue: string;
    };
  };
}

interface LoanApplication {
  id: string;
  status: 'draft' | 'submitted' | 'processing' | 'underwriting' | 'approved' | 'denied' | 'funded';
  requestedAmount: number;
  loanPurpose: string;
  submittedAt?: string;
  lastUpdateAt: string;
  underwritingResults?: any;
  approvalConditions?: string[];
  denialReasons?: string[];
  fundingDate?: string;
}

interface AuthState {
  // Core Authentication
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  
  // Application State
  currentApplication: LoanApplication | null;
  applications: LoanApplication[];
  
  // UI State
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean; // Track if auth has been initialized
  
  // Security State
  sessionExpiry: number | null;
  failedAttempts: number;
  isLocked: boolean;
  deviceFingerprint: string | null;
  
  // Authentication Methods
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    ssn: string;
    dateOfBirth: string;
    address: User['address'];
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  initializeAuth: () => Promise<void>; // Initialize auth from stored data
  
  // Identity Verification
  uploadIdentityDocument: (documentType: User['identityVerification']['documentType'], frontImage: File, backImage?: File) => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  
  // Financial Profile
  updateFinancialProfile: (profile: Partial<User['financialProfile']>) => Promise<void>;
  pullCreditReport: () => Promise<void>;
  
  // Security Management
  enableMFA: (method: 'sms' | 'email' | 'app') => Promise<void>;
  disableMFA: () => Promise<void>;
  addTrustedDevice: (deviceName: string) => Promise<void>;
  removeTrustedDevice: (deviceId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Compliance & Consent
  updateConsent: (consentType: keyof User['compliance'], granted: boolean) => Promise<void>;
  getComplianceStatus: () => Promise<void>;
  
  // Loan Application Management
  createApplication: (loanData: { amount: number; purpose: string }) => Promise<string>;
  updateApplication: (applicationId: string, updates: Partial<LoanApplication>) => Promise<void>;
  submitApplication: (applicationId: string) => Promise<void>;
  getApplicationStatus: (applicationId: string) => Promise<LoanApplication>;
  
  // Security & Audit
  clearSession: () => void;
  reportSuspiciousActivity: (description: string) => Promise<void>;
  getAuditLog: () => Promise<any[]>;
}

// Generate device fingerprint for security
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 0, 0);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0
  ].join('|');
  
  return CryptoJS.SHA256(fingerprint).toString();
};

// Check if stored session is valid
const isValidStoredSession = (sessionExpiry: number | null): boolean => {
  if (!sessionExpiry) return false;
  return Date.now() < sessionExpiry - (5 * 60 * 1000); // 5 minutes buffer
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      currentApplication: null,
      applications: [],
      isLoading: false,
      isAuthenticated: false,
      isInitialized: false,
      sessionExpiry: null,
      failedAttempts: 0,
      isLocked: false,
      deviceFingerprint: null,

      // Initialize authentication from stored data
      initializeAuth: async () => {
        set({ isLoading: true });
        
        try {
          const deviceFingerprint = generateDeviceFingerprint();
          set({ deviceFingerprint });
          
          // Try to restore session from storage
          const storedRefreshToken = localStorage.getItem('refreshToken');
          const storedState = get();
          
          if (storedRefreshToken && storedState.user && isValidStoredSession(storedState.sessionExpiry)) {
            // Try to refresh the access token
            const refreshSuccessful = await get().refreshSession();
            
            if (refreshSuccessful) {
              set({ 
                isAuthenticated: true,
                isInitialized: true,
                isLoading: false 
              });
              return;
            }
          }
          
          // If no valid session, clear everything
          await get().clearSession();
          set({ 
            isInitialized: true,
            isLoading: false 
          });
          
        } catch (error) {
          console.error('Auth initialization error:', error);
          await get().clearSession();
          set({ 
            isInitialized: true,
            isLoading: false 
          });
        }
      },

      // Authentication Methods
      login: async (email: string, password: string, mfaCode?: string) => {
        set({ isLoading: true, failedAttempts: 0 });
        
        try {
          const deviceFP = get().deviceFingerprint || generateDeviceFingerprint();
          
          const response = await AuthAPI.login(email, password, mfaCode);
          const { user, accessToken, refreshToken, sessionExpiry, sessionId } = response.data;
          
          // Mask sensitive data for display
          const maskedUser = {
            ...user,
            maskedSSN: SecurityManager.maskSSN(user.ssn || ''),
          };
          
          // Store refresh token securely
          localStorage.setItem('refreshToken', refreshToken);
          
          set({
            user: maskedUser,
            accessToken,
            refreshToken,
            sessionId: sessionId,
            sessionExpiry: Date.now() + (sessionExpiry || 7 * 24 * 60 * 60 * 1000), // default 7 days
            isAuthenticated: true,
            isLoading: false,
            failedAttempts: 0,
            isLocked: false,
            deviceFingerprint: deviceFP
          });
          
        } catch (error: any) {
          const currentAttempts = get().failedAttempts + 1;
          const shouldLock = currentAttempts >= 5;
          
          set({
            isLoading: false,
            failedAttempts: currentAttempts,
            isLocked: shouldLock
          });
          
          if (shouldLock) {
            setTimeout(() => {
              set({ isLocked: false, failedAttempts: 0 });
            }, 15 * 60 * 1000); // 15-minute lockout
          }
          
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        
        try {
          // Validate SSN format before sending
          const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
          if (!ssnPattern.test(userData.ssn)) {
            throw new Error('Invalid SSN format. Use XXX-XX-XXXX or XXXXXXXXX');
          }
          
          await AuthAPI.register(userData);
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await AuthAPI.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          // Always clear local state regardless of API call result
          get().clearSession();
        }
      },

      refreshSession: async (): Promise<boolean> => {
        try {
          const storedRefreshToken = localStorage.getItem('refreshToken') || get().refreshToken;
          
          if (!storedRefreshToken) {
            get().clearSession();
            return false;
          }
          
          const response = await AuthAPI.refreshToken();
          const { accessToken, refreshToken: newRefreshToken, sessionExpiry } = response.data;
          
          // Update stored refresh token if a new one was issued
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          set({
            accessToken,
            refreshToken: newRefreshToken || storedRefreshToken,
            sessionExpiry: Date.now() + (sessionExpiry || 15 * 60 * 1000), // default 15 minutes
            isAuthenticated: true
          });
          
          return true;
          
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().clearSession();
          return false;
        }
      },

      // Identity Verification
      uploadIdentityDocument: async (documentType, frontImage, backImage) => {
        set({ isLoading: true });
        
        try {
          await AuthAPI.verifyIdentity(documentType, frontImage, backImage);
          
          // Update user verification status
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: {
                ...currentUser,
                identityVerification: {
                  ...currentUser.identityVerification,
                  status: 'pending',
                  documentType,
                }
              }
            });
          }
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      checkVerificationStatus: async () => {
        // Implementation would call API to get current verification status
        // and update user object accordingly
      },

      // Financial Profile Management
      updateFinancialProfile: async (profile) => {
        const currentUser = get().user;
        if (!currentUser) throw new Error('User not authenticated');
        
        // Update local state and sync with server
        set({
          user: {
            ...currentUser,
            financialProfile: {
              ...currentUser.financialProfile,
              ...profile
            }
          }
        });
      },

      pullCreditReport: async () => {
        const currentUser = get().user;
        if (!currentUser) throw new Error('User not authenticated');
        
        set({ isLoading: true });
        
        try {
          // This would trigger the actual credit report pull
          // Implementation depends on credit bureau integration
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Security Management
      enableMFA: async (method) => {
        // Implementation for MFA setup
      },

      disableMFA: async () => {
        // Implementation for MFA removal
      },

      addTrustedDevice: async (deviceName) => {
        // Implementation for trusted device management
      },

      removeTrustedDevice: async (deviceId) => {
        // Implementation for device removal
      },

      changePassword: async (currentPassword, newPassword) => {
        // Implementation for password change with security validation
      },

      // Compliance & Consent
      updateConsent: async (consentType, granted) => {
        const currentUser = get().user;
        if (!currentUser) throw new Error('User not authenticated');
        
        set({
          user: {
            ...currentUser,
            compliance: {
              ...currentUser.compliance,
              [consentType]: granted,
              [`${consentType}Date` as keyof User['compliance']]: new Date().toISOString(),
              lastComplianceUpdate: new Date().toISOString()
            }
          }
        });
      },

      getComplianceStatus: async () => {
        // Check and update compliance status
      },

      // Loan Application Management
      createApplication: async (loanData): Promise<string> => {
        const newApplication: LoanApplication = {
          id: `app_${Date.now()}_${Math.random().toString(36)}`,
          status: 'draft',
          requestedAmount: loanData.amount,
          loanPurpose: loanData.purpose,
          lastUpdateAt: new Date().toISOString()
        };
        
        const currentApplications = get().applications;
        set({
          currentApplication: newApplication,
          applications: [...currentApplications, newApplication]
        });
        
        return newApplication.id;
      },

      updateApplication: async (applicationId, updates) => {
        const applications = get().applications;
        const updatedApplications = applications.map(app => 
          app.id === applicationId 
            ? { ...app, ...updates, lastUpdateAt: new Date().toISOString() }
            : app
        );
        
        set({ applications: updatedApplications });
        
        const currentApp = get().currentApplication;
        if (currentApp?.id === applicationId) {
          set({ currentApplication: { ...currentApp, ...updates } });
        }
      },

      submitApplication: async (applicationId) => {
        await get().updateApplication(applicationId, {
          status: 'submitted',
          submittedAt: new Date().toISOString()
        });
      },

      getApplicationStatus: async (applicationId): Promise<LoanApplication> => {
        const applications = get().applications;
        const application = applications.find(app => app.id === applicationId);
        
        if (!application) {
          throw new Error('Application not found');
        }
        
        return application;
      },

      // Security & Audit
      clearSession: () => {
        // Clear all auth and sensitive data
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth-storage');
        sessionStorage.clear();
        
        // Clear browser caches
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          sessionId: null,
          currentApplication: null,
          isAuthenticated: false,
          sessionExpiry: null,
          isInitialized: true // Keep initialized so UI doesn't re-init
        });
      },

      reportSuspiciousActivity: async (description) => {
        // Report to fraud monitoring system
        console.warn('Suspicious activity reported:', description);
      },

      getAuditLog: async () => {
        // Return user's audit log from compliance system
        return [];
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist user data (without raw SSN)
        user: state.user ? {
          ...state.user,
          ssn: undefined, // Never persist unencrypted SSN
        } : null,
        // Persist tokens and session info for auto-recovery
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        sessionExpiry: state.sessionExpiry,
        isAuthenticated: state.isAuthenticated,
        // Persist application data
        applications: state.applications,
        deviceFingerprint: state.deviceFingerprint,
      }),
      // Rehydration handler
      onRehydrateStorage: () => (state) => {
        // After rehydrate, mark as not yet initialized so initializeAuth can run
        if (state) {
          state.isInitialized = false;
          state.isLoading = false;
        }
      },
    }
  )
);
