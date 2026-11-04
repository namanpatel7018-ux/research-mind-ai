import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading = false, disabled, asChild, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
      md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
      lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
      icon: 'p-2 rounded-xl text-sm justify-center',
    }[size];

    const variantClasses = {
      default:
        'glass-button-primary font-medium tracking-wide shadow-glow-indigo',
      secondary:
        'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 hover:border-white/20 shadow-glass-sm backdrop-blur-md',
      ghost:
        'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border border-transparent',
      outline:
        'bg-transparent hover:bg-white/[0.04] text-slate-200 border border-white/15 hover:border-indigo-400/50 hover:text-indigo-200',
      danger:
        'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-900/30 border border-white/15',
      success:
        'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/30 border border-white/15',
    }[variant];

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-space-950 disabled:pointer-events-none disabled:opacity-45 cursor-pointer',
          sizeClasses,
          variantClasses,
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />}
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
