/**
 * App.tsx — Root router + providers
 * -----------------------------------
 * Providers (outer → inner): ToastProvider → AuthProvider → Routes
 *
 * ProtectedRoute:
 *  - Shows a full-screen spinner while auth is loading
 *  - Redirects to /login if not authenticated
 *  - Listens for 'auth:expiring-soon' to show a warning toast
 *  - Listens for 'auth:logout' (fired by axios 401 interceptor)
 *    to show an "session expired" toast and redirect
 */

import { useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth }      from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { LoginPage }        from './pages/LoginPage';
import { DashboardPage }    from './pages/DashboardPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

// ── ProtectedRoute ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();

  // React to 401 (axios interceptor) → toast + redirect
  useEffect(() => {
    const onForceLogout = () => {
      toast.error('Your session has expired. Please sign in again.', 6000);
      navigate('/login', { replace: true });    };
    window.addEventListener('auth:logout', onForceLogout);
    return () => window.removeEventListener('auth:logout', onForceLogout);
  }, [navigate, toast]);

  // Warn 2 minutes before token expires
  useEffect(() => {
    const onExpiringSoon = () => {
      toast.warning('Your session will expire in 2 minutes. Save your work.', 8000);
    };
    window.addEventListener('auth:expiring-soon', onExpiringSoon);
    return () => window.removeEventListener('auth:expiring-soon', onExpiringSoon);
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ── App shell ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/signup"        element={<Navigate to="/login" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
