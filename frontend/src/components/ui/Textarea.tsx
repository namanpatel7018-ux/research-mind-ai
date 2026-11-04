import React from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex w-full flex-col gap-1.5 text-sm">
        {label && (
          <label htmlFor={textareaId} className="font-medium text-xs uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={clsx(
            'glass-input min-h-[120px] w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 resize-y',
            error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-rose-400">{error}</span>}
        {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
