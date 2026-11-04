import React from 'react';
import { ShieldCheck, Sparkles, CheckCircle2, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { AuthErrorAlert } from './AuthErrorAlert';

export interface OTPScreenProps {
  title: string;
  badge?: string;
  email: string;
  otpDigits: string[];
  otpFilled: boolean;
  error: string;
  successMsg?: string;
  loading: boolean;
  resendTimer: number;
  emailSent?: boolean;
  emailError?: string | null;
  submitLabel: string;
  backLabel: string;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onSubmit: (e: React.FormEvent) => void;
  onOtpChange: (idx: number, val: string) => void;
  onOtpKey: (idx: number, e: React.KeyboardEvent) => void;
  onOtpPaste: (e: React.ClipboardEvent) => void;
  onResend: () => void;
  onBack: () => void;
}

export function OTPScreen({
  title,
  badge,
  email,
  otpDigits,
  otpFilled,
  error,
  successMsg,
  loading,
  resendTimer,
  emailSent = true,
  emailError,
  submitLabel,
  backLabel,
  inputRefs,
  onSubmit,
  onOtpChange,
  onOtpKey,
  onOtpPaste,
  onResend,
  onBack,
}: OTPScreenProps) {
  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 shadow-sm mb-3">
          <ShieldCheck className="h-7 w-7" />
        </div>
        {badge && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-500/30">
              <Sparkles className="h-3 w-3" />
              {badge}
            </span>
          </div>
        )}
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Enter the 6-digit confirmation code sent to<br />
          <span className="font-semibold text-indigo-600 dark:text-indigo-300 font-mono">{email}</span>
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
          <span>⏱</span>
          <span>
            Code valid for <strong>5 minutes</strong> only
          </span>
        </div>
      </div>

      {!emailSent && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <span>⚠️</span>
            <span>Email Delivery Notice</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-200/90 leading-relaxed">
            {emailError
              ? `Could not deliver email: ${emailError}`
              : 'Failed to deliver confirmation email. Please check your SMTP configuration.'}
          </p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex justify-center gap-2" onPaste={onOtpPaste}>
          {otpDigits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => onOtpChange(i, e.target.value)}
              onKeyDown={(e) => onOtpKey(i, e)}
              className={`h-12 w-11 rounded-xl border text-center text-xl font-bold font-mono
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/50
                ${
                  successMsg
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 shadow-sm'
                    : error
                    ? 'border-rose-500/60 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    : d
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-white shadow-sm'
                    : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white hover:border-slate-400'
                }`}
            />
          ))}
        </div>

        {error && <AuthErrorAlert msg={error} />}

        <button
          type="submit"
          disabled={loading || !otpFilled || Boolean(successMsg)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50 transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking code…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitLabel}</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Didn't receive the email?</span>{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={resendTimer > 0 || loading}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:text-slate-400 transition cursor-pointer"
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition pt-1 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{backLabel}</span>
        </button>
      </form>
    </div>
  );
}
