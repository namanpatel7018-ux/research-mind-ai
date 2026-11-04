/**
 * AuthContext.tsx — Context definition + useAuth hook
 * (non-component exports only — required for Vite Fast Refresh)
 */
import { createContext, useContext } from 'react';
import type { OTPRequestResponse } from '../lib/api';

export interface AuthUser {
  email:       string;
  full_name:   string;
  picture?:    string;
  is_verified: boolean;
}

export interface AuthContextValue {
  user:              AuthUser | null;
  loading:           boolean;
  isAuthenticated:   boolean;
  loginWithToken:    (token: string)                                      => Promise<void>;
  loginWithEmail:    (email: string, password: string)                   => Promise<void>;
  loginRequestOtp:   (email: string)                                     => Promise<OTPRequestResponse>;
  loginVerifyOtp:    (email: string, otp: string)                        => Promise<void>;
  logout:            ()                                                   => Promise<void>;
  signupRequestOtp:         (email: string, fullName: string, password: string) => Promise<OTPRequestResponse>;
  signupVerifyOtp:          (email: string, otp: string)                        => Promise<void>;
  forgotPasswordRequestOtp: (email: string)                                     => Promise<OTPRequestResponse>;
  forgotPasswordVerifyOtp:  (email: string, otp: string)                        => Promise<{ status: string; message: string; email: string }>;
  forgotPasswordReset:      (email: string, otp: string, newPassword: string)    => Promise<void>;
  refreshUser:              ()                                                   => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
