import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { GoogleMapsProvider } from './components/GoogleMapsProvider';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { initOfflineQueue } from './services/offlineQueue';
import PageLoadingFallback from './components/PageLoadingFallback';

// Critical path pages - loaded immediately
import SplashPage from './pages/SplashPage';
import PhoneAuthPage from './pages/PhoneAuthPage';
import DashboardPage from './pages/DashboardPage';

// Lazy-loaded pages - common routes
const DeliveryDetailPage = lazy(() => import('./pages/DeliveryDetailPage'));
const EarningsPage = lazy(() => import('./pages/EarningsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Lazy-loaded pages - chat
const SupportChatPage = lazy(() => import('./components/SupportChat'));

// Lazy-loaded pages - secondary routes
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const PendingVerificationPage = lazy(() => import('./pages/PendingVerificationPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const WeeklyReportPage = lazy(() => import('./pages/WeeklyReportPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const RouteOptimizationPage = lazy(() => import('./pages/RouteOptimizationPage'));
const ReportIncidentPage = lazy(() => import('./pages/ReportIncidentPage'));
const ClientAbsentProtocolPage = lazy(() => import('./pages/ClientAbsentProtocolPage'));
const PublicTrackingPage = lazy(() => import('./pages/PublicTrackingPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-500">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Public Route (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, driver, loading, isVerified, registrationStep } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary-500">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    // Check registration and verification status
    if (!driver || registrationStep < 6) {
      return <Navigate to="/onboarding" replace />;
    }
    if (!isVerified) {
      return <Navigate to="/pending-verification" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Splash / Entry */}
        <Route path="/splash" element={<SplashPage />} />

        {/* Public tracking (no auth required) */}
        <Route path="/track/:code" element={<PublicTrackingPage />} />

        {/* Public routes */}
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <PhoneAuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-verification"
          element={
            <ProtectedRoute>
              <PendingVerificationPage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/:id"
          element={
            <ProtectedRoute>
              <DeliveryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/:id/report-incident"
          element={
            <ProtectedRoute>
              <ReportIncidentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery/:id/client-absent"
          element={
            <ProtectedRoute>
              <ClientAbsentProtocolPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/earnings"
          element={
            <ProtectedRoute>
              <EarningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <WeeklyReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <ChallengesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/route-optimization"
          element={
            <ProtectedRoute>
              <RouteOptimizationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <SupportChatPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  // Initialize offline queue on app start
  useEffect(() => {
    initOfflineQueue();
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <LocationProvider>
              <GoogleMapsProvider>
                <ToastProvider>
                  <OfflineBanner />
                  <PWAInstallPrompt />
                  <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <AppRoutes />
                  </div>
                </ToastProvider>
              </GoogleMapsProvider>
            </LocationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
