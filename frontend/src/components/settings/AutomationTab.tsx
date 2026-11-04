import React from 'react';
import { Zap, Download, Database } from 'lucide-react';
import { UserSettings } from '../../types/settings';

interface AutomationTabProps {
  autoSave: boolean;
  setAutoSave: (val: boolean) => void;
  notifications: boolean;
  setNotifications: (val: boolean) => void;
  handleSaveSettings: (updates?: Partial<UserSettings>, silent?: boolean) => void;
  handleExportSettings: () => void;
  handleClearCache: () => void;
  toast: any;
}

export function AutomationTab({
  autoSave,
  setAutoSave,
  notifications,
  setNotifications,
  handleSaveSettings,
  handleExportSettings,
  handleClearCache,
  toast,
}: AutomationTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Workspace Automation &amp; Local Storage
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Manage automatic bookmarks, synthesis completion alerts, and local browser storage caches.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Auto-Save High Confidence Answers
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Automatically saves answers with &gt;85% vector similarity to Library &gt; Saved Answers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !autoSave;
              setAutoSave(next);
              handleSaveSettings({ auto_save: next }, true);
              toast.info(next ? 'Auto-save answers enabled' : 'Auto-save answers disabled');
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoSave ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoSave ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Research &amp; Export Notifications
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Display toast notifications when PDF generation, PPT conversion, or Qdrant vector indexing finishes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !notifications;
              setNotifications(next);
              handleSaveSettings({ notifications: next }, true);
              toast.info(next ? 'Research notifications enabled' : 'Research notifications disabled');
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              notifications ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Maintenance Tools */}
      <div className="pt-2 border-t border-slate-200 dark:border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-3">
          Maintenance &amp; Backup
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportSettings}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4 text-indigo-500" />
            <span>Export Configuration JSON</span>
          </button>

          <button
            type="button"
            onClick={handleClearCache}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
          >
            <Database className="h-4 w-4 text-amber-500" />
            <span>Clear Local Storage Cache</span>
          </button>
        </div>
      </div>
    </div>
  );
}
