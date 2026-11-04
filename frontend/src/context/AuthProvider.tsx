/**
 * AuthProvider.tsx — React component only (required for Vite Fast Refresh)
 *
 * Security features:
 *  - Token expiry check on mount (stale tokens discarded)
 *  - jti-based server-side logout (token blacklist)
 *  - Listens for axios 401 → 'auth:logout' custom event
 *  - Fires 'auth:expiring-soon' 2 min before token expires
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext, AuthContextValue, AuthUser } from './AuthContext';
import { getAuthToken, saveAuthToken, clearAuthToken, tokenExpiresInMs } from '../lib/auth';
import {
  fetchCurrentUser,
  loginWithEmailPassword,
  loginRequestOTP,
  loginVerifyOTP,
  logoutFromServer,
  signupRequestOTP,
  signupVerifyOTP,
  forgotPasswordRequestOTP,
  forgotPasswordVerifyOTP,
  forgotPasswordReset,
} from '../lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate user from a JWT ───────────────────────────────────────────────
  const _hydrateUser = useCallback(async (token: string): Promise<void> => {
    saveAuthToken(token);
    const profile = await fetchCurrentUser();
    setUser({
      email:       profile.email,
      full_name:   profile.full_name,
      picture:     profile.picture,
      is_verified: profile.is_verified ?? true,
    });

    // Warn 2 min before expiry
    const expiresIn = tokenExpiresInMs(token);
    if (expiresIn > 2 * 60 * 1000) {
      refreshTimer.current = setTimeout(
        () => window.dispatchEvent(new CustomEvent('auth:expiring-soon')),
        expiresIn - 2 * 60 * 1000,
      );
    }
  }, []);

  // ── Clear session atomically ──────────────────────────────────────────────
  const _clearSession = useCallback((token?: string | null): void => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    clearAuthToken();
    setUser(null);
    if (token) logoutFromServer(token);  // fire-and-forget server blacklist
  }, []);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();  // returns null if expired
    if (!token) { setLoading(false); return; }
    _hydrateUser(token)
      .catch(() => _clearSession(token))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to axios 401 ────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => _clearSession();
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, [_clearSession]);

  // ── Public methods ────────────────────────────────────────────────────────
  const loginWithToken   = useCallback((token: string) => _hydrateUser(token), [_hydrateUser]);
  const loginWithEmail   = useCallback(async (email: string, password: string) => {
    const token = await loginWithEmailPassword(email, password);
    await _hydrateUser(token);
  }, [_hydrateUser]);
  const loginRequestOtp  = useCallback((email: string) => loginRequestOTP(email), []);
  const loginVerifyOtp   = useCallback(async (email: string, otp: string) => {
    const token = await loginVerifyOTP(email, otp);
    await _hydrateUser(token);
  }, [_hydrateUser]);
  const logout           = useCallback(async () => _clearSession(getAuthToken()), [_clearSession]);
  const signupRequestOtp = useCallback(
    (email: string, fullName: string, password: string) => signupRequestOTP(email, fullName, password),
    [],
  );
  const signupVerifyOtp  = useCallback(async (email: string, otp: string) => {
    const token = await signupVerifyOTP(email, otp);
    await _hydrateUser(token);
  }, [_hydrateUser]);

  const forgotPasswordRequestOtp = useCallback(
    (email: string) => forgotPasswordRequestOTP(email),
    [],
  );

  const forgotPasswordVerifyOtp = useCallback(
    (email: string, otp: string) => forgotPasswordVerifyOTP(email, otp),
    [],
  );

  const forgotPasswordResetAction = useCallback(
    async (email: string, otp: string, newPassword: string) => {
      const token = await forgotPasswordReset(email, otp, newPassword);
      await _hydrateUser(token);
    },
    [_hydrateUser],
  );

  const refreshUser = useCallback(async () => {
    try {
      const profile = await fetchCurrentUser();
      setUser({
        email:       profile.email,
        full_name:   profile.full_name,
        picture:     profile.picture,
        is_verified: profile.is_verified ?? true,
      });
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user, loading,
      isAuthenticated: Boolean(user),
      loginWithToken, loginWithEmail,
      loginRequestOtp, loginVerifyOtp,
      logout,
      signupRequestOtp, signupVerifyOtp,
      forgotPasswordRequestOtp,
      forgotPasswordVerifyOtp,
      forgotPasswordReset: forgotPasswordResetAction,
      refreshUser,
    }),
    [
      user, loading, loginWithToken, loginWithEmail, loginRequestOtp, loginVerifyOtp, logout,
      signupRequestOtp, signupVerifyOtp, forgotPasswordRequestOtp, forgotPasswordVerifyOtp, forgotPasswordResetAction, refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
