/**
 * Toast.tsx — Lightweight global notification system
 * ---------------------------------------------------
 * Usage:
 *   const toast = useToast();
 *   toast.success('Account created!');
 *   toast.error('Invalid OTP.');
 *   toast.info('Check your email.');
 *   toast.warning('Session expiring soon.');
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id:       string;
  message:  string;
  variant:  ToastVariant;
  duration: number;
}

interface ToastContextValue {
  success: (msg: string, duration?: number) => void;
  error:   (msg: string, duration?: number) => void;
  info:    (msg: string, duration?: number) => void;
  warning: (msg: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (message: string, variant: ToastVariant, duration: number) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  // Clean up all timers on unmount
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const value: ToastContextValue = {
    success: (m, d = 4000) => add(m, 'success', d),
    error:   (m, d = 5000) => add(m, 'error',   d),
    info:    (m, d = 4000) => add(m, 'info',     d),
    warning: (m, d = 4500) => add(m, 'warning',  d),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Visual config per variant ─────────────────────────────────────────────────

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: React.ReactNode; border: string; bg: string; text: string; progress: string; glow: string }
> = {
  success: {
    icon:     <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />,
    border:   'border-emerald-300 dark:border-emerald-500/30',
    bg:       'bg-white/95 dark:bg-[#061914]/90',
    text:     'text-slate-900 dark:text-emerald-100',
    progress: 'bg-emerald-500',
    glow:     'shadow-lg dark:shadow-[0_8px_30px_rgb(16,185,129,0.15)]',
  },
  error: {
    icon:     <XCircle className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-400" />,
    border:   'border-rose-300 dark:border-rose-500/30',
    bg:       'bg-white/95 dark:bg-[#19080c]/90',
    text:     'text-slate-900 dark:text-rose-100',
    progress: 'bg-rose-500',
    glow:     'shadow-lg dark:shadow-[0_8px_30px_rgb(244,63,94,0.15)]',
  },
  info: {
    icon:     <Info className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />,
    border:   'border-indigo-300 dark:border-indigo-500/30',
    bg:       'bg-white/95 dark:bg-[#0A0E24]/90',
    text:     'text-slate-900 dark:text-indigo-100',
    progress: 'bg-indigo-500',
    glow:     'shadow-lg dark:shadow-[0_8px_30px_rgb(99,102,241,0.15)]',
  },
  warning: {
    icon:     <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />,
    border:   'border-amber-300 dark:border-amber-500/30',
    bg:       'bg-white/95 dark:bg-[#1A1206]/90',
    text:     'text-slate-900 dark:text-amber-100',
    progress: 'bg-amber-500',
    glow:     'shadow-lg dark:shadow-[0_8px_30px_rgb(245,158,11,0.15)]',
  },
};

// ── Single toast card ─────────────────────────────────────────────────────────

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const s = VARIANT_STYLES[toast.variant];

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative flex w-84 items-start gap-3 overflow-hidden rounded-2xl border
        ${s.border} ${s.bg} ${s.glow} px-4 py-3.5 backdrop-blur-2xl
        transition-all duration-300 ease-out
        ${visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'}`}
    >
      {/* Icon */}
      {s.icon}

      {/* Message */}
      <p className={`flex-1 text-sm font-medium leading-snug ${s.text}`}>
        {typeof toast.message === 'string' ? toast.message : (typeof toast.message === 'object' ? ((toast.message as any)?.detail || (toast.message as any)?.msg || JSON.stringify(toast.message)) : String(toast.message))}
      </p>

      {/* Close */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 mt-0.5 text-slate-500 hover:text-white transition"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-white/5">
        <div
          className={`h-full ${s.progress} origin-left`}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts:    ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <>
      {/* Keyframe injected once */}
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      <div
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}
