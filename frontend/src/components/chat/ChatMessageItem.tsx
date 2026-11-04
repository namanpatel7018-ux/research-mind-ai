import React from 'react';
import { Atom, Check, Copy, Bookmark, Download, Loader2 } from 'lucide-react';
import { formatMarkdown } from '../../lib/formatMarkdown';
import { RAGRetrievalCard } from '../ui/RAGRetrievalCard';
import { CitationSource, RetrievalStats, UsageStats, UsedChunkDetail } from '../../lib/api';

export interface ChatMessageData {
  role: 'user' | 'ai';
  text: string;
  image?: string;
  mode?: string;
  provider?: string;
  fallback_used?: boolean;
  sources?: (CitationSource | string)[];
  retrieval?: RetrievalStats;
  usage?: UsageStats;
  used_chunks_detail?: UsedChunkDetail[];
}

interface ChatMessageItemProps {
  message: ChatMessageData;
  index: number;
  userAvatarLetter: string;
  copiedMsgIdx: number | null;
  savedMsgIdx: number | null;
  actionLoadingIdx: number | null;
  actionType: 'pdf' | 'save' | null;
  onCopyAnswer: (text: string, idx: number) => void;
  onSaveAnswer: (text: string, sources: any[] | undefined, idx: number) => void;
  onExportPDF: (text: string, idx: number) => void;
  onOpenSource: (filename: string, page: number, section?: string, evidence?: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message: m,
  index: i,
  userAvatarLetter,
  copiedMsgIdx,
  savedMsgIdx,
  actionLoadingIdx,
  actionType,
  onCopyAnswer,
  onSaveAnswer,
  onExportPDF,
  onOpenSource,
}) => {
  return (
    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {m.role === 'ai' && (
        <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-400 text-white shadow-glow-indigo text-xs font-bold">
          <Atom className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[88%] rounded-3xl p-5 text-sm leading-relaxed transition-all ${
          m.role === 'user'
            ? 'border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-[#0D152F] dark:bg-gradient-to-br dark:from-indigo-950/70 dark:to-violet-950/50 text-slate-900 dark:text-slate-100 shadow-sm dark:shadow-glass-md rounded-tr-md whitespace-pre-wrap'
            : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D1222] text-slate-900 dark:text-slate-100 shadow-md dark:shadow-2xl rounded-tl-md'
        }`}
      >
        {m.image && (
          <img src={m.image} alt="attached" className="mb-3 max-h-56 rounded-2xl object-cover border border-slate-200 dark:border-white/10" />
        )}

        {m.role === 'user' ? (
          <div>{m.text}</div>
        ) : (
          <>
            {/* AI Provider & Mode Badge */}
            <div className="mb-3 flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/10 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-slate-900 dark:text-white tracking-tight">ResearchMind AI</span>
                <span className="rounded-md bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-semibold">
                  {m.mode === 'deepthink' ? 'DeepThink Reasoning' : 'Strict Grounded RAG'}
                </span>
                {m.provider && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                    · {m.provider}
                  </span>
                )}
              </div>
            </div>

            {/* Formatted Markdown Content */}
            <div className="prose-research text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(m.text) }} />
            </div>

            {/* Answer Actions Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
              <button
                onClick={() => onCopyAnswer(m.text, i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
                title="Copy answer markdown"
              >
                {copiedMsgIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedMsgIdx === i ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => onSaveAnswer(m.text, m.sources, i)}
                disabled={actionLoadingIdx === i && actionType === 'save'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition disabled:opacity-50 cursor-pointer shadow-sm"
                title="Save this answer to Document Library"
              >
                {savedMsgIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
                <span>{savedMsgIdx === i ? 'Saved to Library' : 'Save Answer'}</span>
              </button>

              <button
                onClick={() => onExportPDF(m.text, i)}
                disabled={actionLoadingIdx === i && actionType === 'pdf'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-500/10"
                title="Export this answer to formatted PDF"
              >
                {actionLoadingIdx === i && actionType === 'pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                )}
                <span>Export PDF</span>
              </button>
            </div>

            {/* RAG Retrieval Details & Citations */}
            <RAGRetrievalCard
              sources={m.sources}
              retrieval={m.retrieval}
              usage={m.usage}
              usedChunksDetail={m.used_chunks_detail}
              onOpenSource={onOpenSource}
            />
          </>
        )}
      </div>

      {m.role === 'user' && (
        <div className="ml-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-200 text-xs font-semibold">
          {userAvatarLetter}
        </div>
      )}
    </div>
  );
};
