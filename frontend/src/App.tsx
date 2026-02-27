import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { ConfigProvider as MobileConfigProvider } from 'antd-mobile';
import enUS from 'antd/locale/en_US';
import enUSMobile from 'antd-mobile/es/locales/en-US';
import { useAuthStore } from './store/useAuthStore';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import BottomNav from './components/BottomNav';
import './App.css';

// Lazy load components for code splitting
const Home = lazy(() => import('./pages/user/Home'));
const Login = lazy(() => import('./pages/user/Login'));
const Register = lazy(() => import('./pages/user/Register'));
const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const Apply = lazy(() => import('./pages/user/Apply'));
const MyLoans = lazy(() => import('./pages/user/MyLoans'));
const Profile = lazy(() => import('./pages/user/Profile'));
const Repay = lazy(() => import('./pages/user/Repay'));
const Payments = lazy(() => import('./pages/user/Payments'));
const LoanDetails = lazy(() => import('./pages/user/LoanDetails'));
const Documents = lazy(() => import('./pages/user/Documents'));
const Notifications = lazy(() => import('./pages/user/Notifications'));
const Support = lazy(() => import('./pages/user/Support'));

// Admin pages
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminLoans = lazy(() => import('./pages/admin/Loans'));
const AdminRates = lazy(() => import('./pages/admin/Rates'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));

function App() {
  const { isInitialized, isAuthenticated, initializeAuth, refreshSession, sessionExpiry, accessToken } = useAuthStore();

  // Initialize auth on mount - restores session from localStorage
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry || !accessToken) return;

    // Calculate time until token expires (refresh 2 minutes before)
    const timeUntilExpiry = sessionExpiry - Date.now() - (2 * 60 * 1000);
    
    if (timeUntilExpiry <= 0) {
      // Token already expired or about to expire, refresh now
      refreshSession();
      return;
    }

    // Set timer to refresh before expiry
    const refreshTimer = setTimeout(() => {
      refreshSession();
    }, Math.max(timeUntilExpiry, 0));

    return () => clearTimeout(refreshTimer);
  }, [isAuthenticated, sessionExpiry, accessToken, refreshSession]);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <ConfigProvider locale={enUS}>
      <MobileConfigProvider locale={enUSMobile}>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected User Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/apply" element={
                <ProtectedRoute>
                  <Apply />
                </ProtectedRoute>
              } />
              <Route path="/my-loans" element={
                <ProtectedRoute>
                  <MyLoans />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/repay/:loanId" element={
                <ProtectedRoute>
                  <Repay />
                </ProtectedRoute>
              } />
              <Route path="/user/payments" element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="/user/payments/:loanId" element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="/user/loan-details/:loanId" element={
                <ProtectedRoute>
                  <LoanDetails />
                </ProtectedRoute>
              } />
              <Route path="/user/documents" element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              } />
              <Route path="/user/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/user/messages" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/user/support" element={
                <ProtectedRoute>
                  <Support />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } />
              <Route path="/admin/loans" element={
                <AdminRoute>
                  <AdminLoans />
                </AdminRoute>
              } />
              <Route path="/admin/rates" element={
                <AdminRoute>
                  <AdminRates />
                </AdminRoute>
              } />
              <Route path="/admin/reports" element={
                <AdminRoute>
                  <AdminReports />
                </AdminRoute>
              } />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <BottomNav />
          </Suspense>
        </BrowserRouter>
      </MobileConfigProvider>
    </ConfigProvider>
  );
}

export default App;