import React from 'react';
import { Palette, Moon, Sun, Monitor, Check } from 'lucide-react';
import { Theme } from '../../context/ThemeContext';

interface AppearanceTabProps {
  theme: Theme;
  systemTheme: 'dark' | 'light';
  accentColor: string;
  setAccentColor: (val: string) => void;
  handleThemeChange: (t: Theme) => void;
  toast: any;
}

export function AppearanceTab({
  theme,
  systemTheme,
  accentColor,
  setAccentColor,
  handleThemeChange,
  toast,
}: AppearanceTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Interface Appearance &amp; Color Scheme
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Choose your preferred contrast mode. Light and dark modes apply immediately throughout the application.
        </p>
      </div>

      {/* 3 Interactive Theme Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Dark Mode */}
        <button
          type="button"
          onClick={() => handleThemeChange('dark')}
          className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer ${
            theme === 'dark'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/40'
              : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-indigo-400 shadow-sm">
              <Moon className="h-5 w-5" />
            </div>
            {theme === 'dark' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dark Space</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Obsidian blacks with vibrant neon glow accents for night-time deep work.
            </p>
          </div>
        </button>

        {/* 2. Light Mode */}
        <button
          type="button"
          onClick={() => handleThemeChange('light')}
          className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer ${
            theme === 'light'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/40'
              : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 border border-amber-300 text-amber-600 shadow-sm">
              <Sun className="h-5 w-5" />
            </div>
            {theme === 'light' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Light Crisp</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              High contrast clean editorial styling optimized for daylight document review.
            </p>
          </div>
        </button>

        {/* 3. System Mode */}
        <button
          type="button"
          onClick={() => handleThemeChange('system')}
          className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer ${
            theme === 'system'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/40'
              : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 shadow-sm">
              <Monitor className="h-5 w-5" />
            </div>
            {theme === 'system' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">System Auto</h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 px-1.5 py-0.5 text-[9px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
                {systemTheme === 'dark' ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                {systemTheme === 'dark' ? 'OS: Dark' : 'OS: Light'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Synchronizes automatically with your device schedule.
            </p>
            <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-1.5">
              Device is currently in {systemTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </p>
          </div>
        </button>
      </div>

      {/* Accent Color Palette */}
      <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Vibrant Brand Accent
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Choose secondary highlight shades used in charts, badges, and citations
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
            ACCENT_COLOR
          </span>
        </div>

        <div className="flex items-center gap-3">
          {[
            { id: 'indigo', name: 'Indigo Nebula', class: 'bg-indigo-600' },
            { id: 'violet', name: 'Ultra Violet', class: 'bg-violet-600' },
            { id: 'cyan', name: 'Electric Cyan', class: 'bg-cyan-500' },
            { id: 'emerald', name: 'Deep Emerald', class: 'bg-emerald-600' },
          ].map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => {
                setAccentColor(acc.id);
                localStorage.setItem('rm_accent', acc.id);
                toast.info(`Accent updated to ${acc.name}`);
              }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                accentColor === acc.id
                  ? 'border-indigo-600 bg-white dark:bg-white/10 font-bold shadow-sm'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-transparent hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span className={`h-3.5 w-3.5 rounded-full ${acc.class} shadow-sm`} />
              <span className="text-slate-800 dark:text-slate-200">{acc.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
