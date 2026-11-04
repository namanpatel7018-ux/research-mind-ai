import React from 'react';
import { KeyRound, Mail, Loader2, ArrowRight } from 'lucide-react';
import { AuthErrorAlert } from './AuthErrorAlert';

interface ForgotPasswordRequestFormProps {
  forgotEmail: string;
  setForgotEmail: (val: string) => void;
  loading: boolean;
  error: string;
  handleForgotRequestOtp: (e: React.FormEvent) => void;
  onGoToLogin: () => void;
  onGoToSignup: (email: string) => void;
}

export function ForgotPasswordRequestForm({
  forgotEmail,
  setForgotEmail,
  loading,
  error,
  handleForgotRequestOtp,
  onGoToLogin,
  onGoToSignup,
}: ForgotPasswordRequestFormProps) {
  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-500/30 mb-2.5">
          <KeyRound className="h-3 w-3" />
          <span>Account Recovery</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Forgot Password?
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Enter the email associated with your account. We'll send a 6-digit one-time passcode to verify your identity.
        </p>
      </div>

      <form onSubmit={handleForgotRequestOtp} className="space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Email Address
            </label>
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={forgotEmail}
              autoFocus
              autoComplete="email"
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="researcher@example.com"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        {error && (
          <div className="space-y-1.5">
            <AuthErrorAlert msg={error} />
            {String(error).toLowerCase().includes('not found') && (
              <button
                type="button"
                onClick={() => onGoToSignup(forgotEmail)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium block text-left cursor-pointer"
              >
                Need a new account? Create one here →
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !forgotEmail.trim()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50 transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending verification code…</span>
            </>
          ) : (
            <>
              <span>Send Verification Code</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Remembered your password?{' '}
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">Sign In</span>
          </button>
        </div>
      </form>
    </div>
  );
}
