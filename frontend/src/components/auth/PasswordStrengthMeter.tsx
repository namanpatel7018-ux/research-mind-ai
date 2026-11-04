import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export function computePasswordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;
  const score = computePasswordScore(password);

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    '',
    'bg-rose-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-emerald-500',
  ];

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              score >= step ? colors[score] : 'bg-slate-200 dark:bg-white/10'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>Password strength:</span>
        <span
          className={`font-semibold ${
            score === 1
              ? 'text-rose-500'
              : score === 2
              ? 'text-amber-500'
              : score === 3
              ? 'text-indigo-500 dark:text-indigo-400'
              : 'text-emerald-500'
          }`}
        >
          {labels[score] || 'Too short'}
        </span>
      </div>
    </div>
  );
}
