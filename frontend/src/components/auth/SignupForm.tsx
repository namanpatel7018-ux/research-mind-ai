import React from 'react';
import { User, Mail, Lock, KeyRound, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface SignupFormProps {
  name: string;
  setName: (val: string) => void;
  signupEmail: string;
  setSignupEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirm: string;
  setConfirm: (val: string) => void;
  showPw: boolean;
  setShowPw: React.Dispatch<React.SetStateAction<boolean>>;
  showCf: boolean;
  setShowCf: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error: string;
  handleSignup: (e: React.FormEvent) => void;
  onGoToLogin: () => void;
}

export function SignupForm({
  name,
  setName,
  signupEmail,
  setSignupEmail,
  password,
  setPassword,
  confirm,
  setConfirm,
  showPw,
  setShowPw,
  showCf,
  setShowCf,
  loading,
  error,
  handleSignup,
  onGoToLogin,
}: SignupFormProps) {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Create Account
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Join Research Mind AI to analyze documents
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Full Name
            </label>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jane Doe"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Email Address
            </label>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-3.5 w-3.5 text-slate-400" />
            <input
              type="email"
              value={signupEmail}
              autoComplete="email"
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="you@domain.edu"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-3.5 w-3.5 text-slate-400" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-9 pr-9 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {password && <PasswordStrengthMeter password={password} />}

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Confirm Password
            </label>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none h-3.5 w-3.5 text-slate-400" />
            <input
              type={showCf ? 'text' : 'password'}
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              maxLength={128}
              placeholder="Repeat password"
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 dark:bg-[#080B12] pl-9 pr-9 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0c121e] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowCf((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              {showCf ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {confirm && confirm !== password && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="space-y-1.5">
            <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/90 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in-50">
              {error}
            </div>
            {String(error).toLowerCase().includes('already exists') && (
              <button
                type="button"
                onClick={onGoToLogin}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium block text-left cursor-pointer"
              >
                Sign in to this existing account →
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50 transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending verification code…</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
