import React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex w-full flex-col gap-1.5 text-sm">
        {label && (
          <label htmlFor={inputId} className="font-medium text-xs uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              'glass-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200',
              icon && 'pl-10',
              error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-rose-400">{error}</span>}
        {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
