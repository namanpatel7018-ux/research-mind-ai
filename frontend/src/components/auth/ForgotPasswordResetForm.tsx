import React from 'react';
import { CheckCircle2, Lock, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { AuthErrorAlert } from './AuthErrorAlert';

interface ForgotPasswordResetFormProps {
  forgotEmail: string;
  forgotNewPw: string;
  setForgotNewPw: (val: string) => void;
  forgotConfirmPw: string;
  setForgotConfirmPw: (val: string) => void;
  showForgotNewPw: boolean;
  setShowForgotNewPw: React.Dispatch<React.SetStateAction<boolean>>;
  showForgotConfirmPw: boolean;
  setShowForgotConfirmPw: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error: string;
  handleForgotResetPassword: (e: React.FormEvent) => void;
  onGoToLogin: () => void;
}

export function ForgotPasswordResetForm({
  forgotEmail,
  forgotNewPw,
  setForgotNewPw,
  forgotConfirmPw,
  setForgotConfirmPw,
  showForgotNewPw,
  setShowForgotNewPw,
  showForgotConfirmPw,
  setShowForgotConfirmPw,
  loading,
  error,
  handleForgotResetPassword,
  onGoToLogin,
}: ForgotPasswordResetFormProps) {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-500/30 mb-2.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Identity Confirmed</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Set New Password
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Create a strong, secure new password for{' '}
          <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{forgotEmail}</span>
        </p>
      </div>

      <form onSubmit={handleForgotResetPassword} className="space-y-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              New Password
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-3.5 w-3.5 text-slate-400" />
            <input
              type={showForgotNewPw ? 'text' : 'password'}
              value={forgotNewPw}
              autoFocus
              autoComplete="new-password"
              onChange={(e) => setForgotNewPw(e.target.value)}
              maxLength={128}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-9 pr-9 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowForgotNewPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              {showForgotNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {forgotNewPw && <PasswordStrengthMeter password={forgotNewPw} />}

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-3.5 w-3.5 text-slate-400" />
            <input
              type={showForgotConfirmPw ? 'text' : 'password'}
              value={forgotConfirmPw}
              autoComplete="new-password"
              onChange={(e) => setForgotConfirmPw(e.target.value)}
              maxLength={128}
              placeholder="Repeat new password"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-9 pr-9 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowForgotConfirmPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              {showForgotConfirmPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {forgotConfirmPw && forgotConfirmPw !== forgotNewPw && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400">Passwords do not match</p>
          )}
          {forgotConfirmPw && forgotConfirmPw === forgotNewPw && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Passwords match</p>
          )}
        </div>

        {error && <AuthErrorAlert msg={error} />}

        <button
          type="submit"
          disabled={loading || !forgotNewPw || forgotNewPw !== forgotConfirmPw}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50 transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating password…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Password &amp; Sign In</span>
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel and back to <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">Sign In</span>
          </button>
        </div>
      </form>
    </div>
  );
}
