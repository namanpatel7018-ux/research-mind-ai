import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  interactive?: boolean;
}

export function Card({
  title,
  description,
  icon,
  action,
  children,
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <article
      className={clsx(
        interactive ? 'glass-card-interactive' : 'glass-panel',
        'rounded-2xl p-6 transition-all duration-200',
        className
      )}
      {...props}
    >
      {(title || description || icon || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 shadow-sm">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="font-display text-base font-semibold text-white tracking-tight">{title}</h3>}
              {description && <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </article>
  );
}
