import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Brain, ShieldCheck, AlertCircle, Loader2, Plus, Download } from 'lucide-react';
import { UploadedFile } from '../../lib/api';

interface ChatHeaderProps {
  showHistory: boolean;
  onToggleHistory: () => void;
  activeFile: string | null;
  onSelectActiveFile: (filename: string | null) => void;
  files: UploadedFile[];
  deepThinkMode: boolean;
  onToggleDeepThink: () => void;
  uploadStage: string;
  uploading: boolean;
  onUploadClick: () => void;
  hasMessages: boolean;
  onExportChatPDF: () => void;
  headerActionLoading: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  showHistory,
  onToggleHistory,
  activeFile,
  onSelectActiveFile,
  files,
  deepThinkMode,
  onToggleDeepThink,
  uploadStage,
  uploading,
  onUploadClick,
  hasMessages,
  onExportChatPDF,
  headerActionLoading,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50/90 dark:bg-[#0A1024]/90 text-xs shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleHistory}
          title={showHistory ? 'Collapse recent threads' : 'Expand recent threads'}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
        >
          {showHistory ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:inline">Corpus:</span>
          <div className="relative">
            <select
              value={activeFile || ''}
              onChange={(e) => onSelectActiveFile(e.target.value || null)}
              className="rounded-xl px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-200 bg-white dark:bg-[#0A0D16] border border-slate-300 dark:border-white/10 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate pr-7 cursor-pointer shadow-sm max-w-[180px] sm:max-w-xs"
            >
              <option value="" className="bg-white dark:bg-[#0A0D16] text-slate-900 dark:text-slate-200">All Uploaded Documents</option>
              {files.map((f) => (
                <option key={f.filename} value={f.filename} className="bg-white dark:bg-[#0A0D16] text-slate-900 dark:text-slate-200">
                  {f.filename} {f.page_count ? `(${f.page_count}p · ${f.chunk_count} chunks)` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Strict RAG vs DeepThink Switcher */}
        <button
          onClick={onToggleDeepThink}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
            deepThinkMode
              ? 'border-violet-500/50 bg-violet-600/20 text-violet-200 shadow-glow-violet'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
          }`}
          title={deepThinkMode ? 'DeepThink Active: General reasoning allowed + distinct document citations' : 'Strict RAG Active: Only answers using verified document evidence'}
        >
          {deepThinkMode ? (
            <>
              <Brain className="h-3.5 w-3.5 text-violet-300" />
              <span className="hidden sm:inline">DeepThink ON</span>
              <span className="sm:hidden">DeepThink</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Strict RAG</span>
              <span className="sm:hidden">Strict</span>
            </>
          )}
        </button>

        {uploadStage ? (
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2 ${
            uploadStage.startsWith('Error:') ? 'text-rose-400' : 'text-indigo-300 animate-pulse'
          }`}>
            {uploadStage.startsWith('Error:') ? (
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            )}
            <span className="hidden md:inline">{uploadStage}</span>
          </span>
        ) : (
          <button
            onClick={onUploadClick}
            disabled={uploading}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>Upload PDF</span>
          </button>
        )}

        {hasMessages && (
          <div className="hidden lg:flex items-center pl-2 border-l border-white/10">
            <button
              onClick={onExportChatPDF}
              disabled={headerActionLoading}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-500/10"
              title="Export conversation to formatted PDF"
            >
              {headerActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" /> : <Download className="h-3.5 w-3.5 text-cyan-400" />}
              <span>Export Chat to PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
