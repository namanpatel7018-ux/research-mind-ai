import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { getGoogleAuthUrl } from '../lib/api';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import {
  AuthHeroPanel,
  EmailLoginForm,
  SignupForm,
  OTPScreen,
  ForgotPasswordRequestForm,
  ForgotPasswordResetForm,
} from '../components/auth';

type Screen = 'login-email' | 'signup' | 'signup-otp' | 'forgot-request' | 'forgot-otp' | 'forgot-reset';

export function LoginPage() {
  const {
    user,
    loginWithEmail,
    signupRequestOtp,
    signupVerifyOtp,
    forgotPasswordRequestOtp,
    forgotPasswordVerifyOtp,
    forgotPasswordReset,
  } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [screen, setScreen] = useState<Screen>('login-email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Signup state
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);

  // Signup OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [emailSent, setEmailSent] = useState<boolean>(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [signupSuccessMsg, setSignupSuccessMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotConfirmPw, setForgotConfirmPw] = useState('');
  const [showForgotNewPw, setShowForgotNewPw] = useState(false);
  const [showForgotConfirmPw, setShowForgotConfirmPw] = useState(false);
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotResendTimer, setForgotResendTimer] = useState(0);
  const [forgotEmailSent, setForgotEmailSent] = useState<boolean>(true);
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);
  const forgotInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const forgotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      showErr(errorMsg);
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [resendTimer]);

  useEffect(() => {
    if (forgotResendTimer <= 0) return;
    forgotTimerRef.current = setInterval(() => {
      setForgotResendTimer((t) => {
        if (t <= 1) {
          clearInterval(forgotTimerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(forgotTimerRef.current!);
  }, [forgotResendTimer]);

  function formatError(raw: any, fallback = 'Something went wrong.'): string {
    if (!raw) return fallback;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      return (
        raw
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.msg || item.message || JSON.stringify(item);
            }
            return String(item);
          })
          .filter(Boolean)
          .join(', ') || fallback
      );
    }
    if (typeof raw === 'object') {
      if (raw.detail) return formatError(raw.detail, fallback);
      if (raw.msg) return String(raw.msg);
      if (raw.message) return String(raw.message);
      try {
        return JSON.stringify(raw);
      } catch {
        return fallback;
      }
    }
    return String(raw);
  }

  const showErr = (e: any) => setError(formatError(e));
  const clearErr = () => setError('');

  const go = (s: Screen) => {
    clearErr();
    setScreen(s);
  };

  const resetOtp = () => {
    setOtpDigits(['', '', '', '', '', '']);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!loginEmail.trim()) {
      showErr('Please enter your email.');
      return;
    }
    if (!loginPassword) {
      showErr('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(loginEmail.trim().toLowerCase(), loginPassword);
      toast.success('Welcome back to ResearchMind AI!');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      showErr(err?.response?.data?.detail || err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearErr();
    setLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      if (url) {
        window.location.href = url;
      } else {
        showErr('Could not initiate Google authentication.');
      }
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Google sign-in error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!name.trim()) {
      showErr('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim()) {
      showErr('Please enter your email.');
      return;
    }
    if (password.length < 8) {
      showErr('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      showErr('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await signupRequestOtp(signupEmail.trim().toLowerCase(), name.trim(), password);
      setEmailSent(res.email_sent !== false);
      setEmailError(res.email_error || null);
      setResendTimer(60);
      resetOtp();
      go('signup-otp');
      toast.info('Verification code dispatched to your email.');
    } catch (err: any) {
      showErr(err?.response?.data?.detail || err?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErr();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      showErr('Please enter all 6 digits of your verification code.');
      return;
    }
    setLoading(true);
    try {
      await signupVerifyOtp(signupEmail.trim().toLowerCase(), otp);
      setSignupSuccessMsg('Email verified successfully! Initializing workspace…');
      toast.success('Account created! Welcome to ResearchMind AI.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Incorrect or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupResend = async () => {
    clearErr();
    setLoading(true);
    try {
      const res = await signupRequestOtp(signupEmail.trim().toLowerCase(), name.trim(), password);
      setEmailSent(res.email_sent !== false);
      setEmailError(res.email_error || null);
      setResendTimer(60);
      resetOtp();
      toast.info('A fresh verification code has been dispatched.');
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKey = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otpDigits];
    p.split('').forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setOtpDigits(next);
    inputRefs.current[Math.min(p.length, 5)]?.focus();
  };

  const otpFilled = otpDigits.every(Boolean);

  // Forgot password handlers
  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!forgotEmail.trim()) {
      showErr('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPasswordRequestOtp(forgotEmail.trim().toLowerCase());
      setForgotEmailSent(res.email_sent !== false);
      setForgotEmailError(res.email_error || null);
      setForgotResendTimer(60);
      setForgotOtpDigits(['', '', '', '', '', '']);
      go('forgot-otp');
      toast.info('Password reset code sent to your email.');
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Failed to request password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErr();
    const otp = forgotOtpDigits.join('');
    if (otp.length < 6) {
      showErr('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPasswordVerifyOtp(forgotEmail.trim().toLowerCase(), otp);
      setForgotOtpVerified(true);
      setForgotSuccessMsg(res.message || 'Verification code confirmed!');
      toast.success('Code confirmed! Please set your new password.');
      setTimeout(() => {
        setForgotSuccessMsg('');
        go('forgot-reset');
      }, 1000);
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    clearErr();
    setLoading(true);
    try {
      const res = await forgotPasswordRequestOtp(forgotEmail.trim().toLowerCase());
      setForgotEmailSent(res.email_sent !== false);
      setForgotEmailError(res.email_error || null);
      setForgotResendTimer(60);
      setForgotOtpDigits(['', '', '', '', '', '']);
      toast.info('A fresh password reset code was sent.');
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...forgotOtpDigits];
    next[index] = digit;
    setForgotOtpDigits(next);
    if (digit && index < 5) {
      forgotInputRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKey = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) {
      forgotInputRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...forgotOtpDigits];
    p.split('').forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setForgotOtpDigits(next);
    forgotInputRefs.current[Math.min(p.length, 5)]?.focus();
  };

  const forgotOtpFilled = forgotOtpDigits.every(Boolean);

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErr();
    if (forgotNewPw.length < 8) {
      showErr('New password must be at least 8 characters.');
      return;
    }
    if (forgotNewPw !== forgotConfirmPw) {
      showErr('Passwords do not match.');
      return;
    }
    const otp = forgotOtpDigits.join('');
    setLoading(true);
    try {
      await forgotPasswordReset(forgotEmail.trim().toLowerCase(), otp, forgotNewPw);
      toast.success('Password updated successfully! Welcome back.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      showErr(err?.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07090E] p-4 sm:p-6 lg:p-12 transition-colors duration-200">
      {/* ── Floating Top-Right Theme Toggle ───────────────────────────────── */}
      <div className="absolute top-4 right-4 z-30">
        <div className="flex items-center rounded-full border border-slate-300 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/95 p-1 shadow-md backdrop-blur-md">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              resolvedTheme === 'light'
                ? 'bg-amber-100 text-amber-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Switch to Light Crisp mode"
            aria-label="Light mode"
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              resolvedTheme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Switch to Dark Space mode"
            aria-label="Dark mode"
          >
            <Moon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0A0E17]/90 shadow-2xl backdrop-blur-2xl overflow-hidden min-h-[620px] transition-colors">
        {/* ══ LEFT HERO PANEL ═════════════════════════════════════════════ */}
        <AuthHeroPanel />

        {/* ══ RIGHT FORM PANEL ════════════════════════════════════════════ */}
        <div className="flex flex-1 flex-col justify-center p-6 sm:p-10 lg:p-12 bg-white dark:bg-[#0A0E17]/90 transition-colors">
          <div className="w-full max-w-sm mx-auto">
            {/* Mobile Header Branding */}
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-[#070D1E] overflow-hidden p-1">
                  <img
                    src="/logo-icon.png"
                    alt="Research Mind AI Logo"
                    className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  />
                </div>
              </div>
              <div>
                <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Research Mind AI
                </span>
                <span className="ml-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                  v2.0
                </span>
              </div>
            </div>

            {/* Form Switcher Tab: Sign In vs Create Account */}
            {(screen === 'login-email' || screen === 'signup') && (
              <div className="mb-6 flex rounded-2xl bg-slate-100 dark:bg-white/[0.04] p-1 border border-slate-200 dark:border-white/10">
                {(['login-email', 'signup'] as Screen[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => go(s)}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer ${
                      screen === s
                        ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {s === 'login-email' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>
            )}

            {/* Forgot Password Step Navigation Bar */}
            {(screen === 'forgot-request' || screen === 'forgot-otp' || screen === 'forgot-reset') && (
              <div className="mb-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => go('login-email')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to Sign In</span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span
                      className={`h-1.5 w-3.5 rounded-full transition-colors ${
                        screen === 'forgot-request' || screen === 'forgot-otp' || screen === 'forgot-reset'
                          ? 'bg-indigo-600 shadow-glow-indigo'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <span
                      className={`h-1.5 w-3.5 rounded-full transition-colors ${
                        screen === 'forgot-otp' || screen === 'forgot-reset'
                          ? 'bg-indigo-600 shadow-glow-indigo'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <span
                      className={`h-1.5 w-3.5 rounded-full transition-colors ${
                        screen === 'forgot-reset'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                    {screen === 'forgot-request'
                      ? 'Step 1: Email'
                      : screen === 'forgot-otp'
                      ? 'Step 2: Verify'
                      : 'Step 3: New Password'}
                  </span>
                </div>
              </div>
            )}

            {/* SCREEN 1: Sign In */}
            {screen === 'login-email' && (
              <EmailLoginForm
                loginEmail={loginEmail}
                setLoginEmail={setLoginEmail}
                loginPassword={loginPassword}
                setLoginPassword={setLoginPassword}
                showLoginPw={showLoginPw}
                setShowLoginPw={setShowLoginPw}
                loading={loading}
                error={error}
                handleLogin={handleLogin}
                handleGoogleLogin={handleGoogleLogin}
                onForgotPassword={() => {
                  setForgotEmail(loginEmail.trim());
                  go('forgot-request');
                }}
              />
            )}

            {/* SCREEN 2: Forgot Password Request OTP */}
            {screen === 'forgot-request' && (
              <ForgotPasswordRequestForm
                forgotEmail={forgotEmail}
                setForgotEmail={setForgotEmail}
                loading={loading}
                error={error}
                handleForgotRequestOtp={handleForgotRequestOtp}
                onGoToLogin={() => go('login-email')}
                onGoToSignup={(email) => {
                  setSignupEmail(email);
                  go('signup');
                }}
              />
            )}

            {/* SCREEN 3: Forgot Password Check OTP */}
            {screen === 'forgot-otp' && (
              <OTPScreen
                title="Verify Security Code"
                badge="Step 2 · Check One-Time Code"
                email={forgotEmail.trim().toLowerCase()}
                otpDigits={forgotOtpDigits}
                otpFilled={forgotOtpFilled}
                error={error}
                successMsg={forgotSuccessMsg}
                loading={loading}
                resendTimer={forgotResendTimer}
                emailSent={forgotEmailSent}
                emailError={forgotEmailError}
                inputRefs={forgotInputRefs}
                onSubmit={handleForgotVerifyOtp}
                onOtpChange={handleForgotOtpChange}
                onOtpKey={handleForgotOtpKey}
                onOtpPaste={handleForgotOtpPaste}
                onResend={handleForgotResendOtp}
                onBack={() => go('forgot-request')}
                backLabel="Change email address"
                submitLabel={forgotOtpVerified ? 'Code Verified ✓' : 'Verify Code'}
              />
            )}

            {/* SCREEN 4: Forgot Password Set New Password */}
            {screen === 'forgot-reset' && (
              <ForgotPasswordResetForm
                forgotEmail={forgotEmail}
                forgotNewPw={forgotNewPw}
                setForgotNewPw={setForgotNewPw}
                forgotConfirmPw={forgotConfirmPw}
                setForgotConfirmPw={setForgotConfirmPw}
                showForgotNewPw={showForgotNewPw}
                setShowForgotNewPw={setShowForgotNewPw}
                showForgotConfirmPw={showForgotConfirmPw}
                setShowForgotConfirmPw={setShowForgotConfirmPw}
                loading={loading}
                error={error}
                handleForgotResetPassword={handleForgotResetPassword}
                onGoToLogin={() => go('login-email')}
              />
            )}

            {/* SCREEN 5: Create Account */}
            {screen === 'signup' && (
              <SignupForm
                name={name}
                setName={setName}
                signupEmail={signupEmail}
                setSignupEmail={setSignupEmail}
                password={password}
                setPassword={setPassword}
                confirm={confirm}
                setConfirm={setConfirm}
                showPw={showPw}
                setShowPw={setShowPw}
                showCf={showCf}
                setShowCf={setShowCf}
                loading={loading}
                error={error}
                handleSignup={handleSignup}
                onGoToLogin={() => {
                  setLoginEmail(signupEmail);
                  go('login-email');
                }}
              />
            )}

            {/* SCREEN 6: Verify Signup OTP */}
            {screen === 'signup-otp' && (
              <OTPScreen
                title="Verify Email Address"
                badge="Step 2 · Security Verification"
                email={signupEmail.trim().toLowerCase()}
                otpDigits={otpDigits}
                otpFilled={otpFilled}
                error={error}
                successMsg={signupSuccessMsg}
                loading={loading}
                resendTimer={resendTimer}
                emailSent={emailSent}
                emailError={emailError}
                inputRefs={inputRefs}
                onSubmit={handleSignupOtp}
                onOtpChange={handleOtpChange}
                onOtpKey={handleOtpKey}
                onOtpPaste={handleOtpPaste}
                onResend={handleSignupResend}
                onBack={() => go('signup')}
                backLabel="Back to registration"
                submitLabel="Verify Code & Complete Sign Up"
              />
            )}

            <p className="mt-6 text-center text-[11px] text-slate-500 dark:text-slate-500">
              By accessing this system, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
