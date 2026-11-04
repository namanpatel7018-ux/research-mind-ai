import React from 'react';

export function AuthErrorAlert({ msg }: { msg: any }) {
  if (!msg) return null;
  const text =
    typeof msg === 'string'
      ? msg
      : Array.isArray(msg)
      ? msg.map((i) => i.msg || i.detail || JSON.stringify(i)).join(', ')
      : msg?.detail || msg?.msg || JSON.stringify(msg);

  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300">
      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
      <p className="leading-relaxed">{String(text)}</p>
    </div>
  );
}
