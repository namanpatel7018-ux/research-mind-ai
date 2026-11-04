import { useState } from 'react';
import {
  ChevronDown, ChevronUp, FileText, CheckCircle2,
  ExternalLink, Copy, Check, Layers, Cpu, Compass
} from 'lucide-react';
import { CitationSource, RetrievalStats, UsageStats, UsedChunkDetail } from '../../lib/api';

interface RAGRetrievalCardProps {
  sources?: (CitationSource | string)[];
  retrieval?: RetrievalStats;
  usage?: UsageStats;
  usedChunksDetail?: UsedChunkDetail[];
  onOpenSource?: (filename: string, page: number, section?: string, evidence?: string) => void;
}

export function RAGRetrievalCard({
  sources = [],
  retrieval,
  usage,
  usedChunksDetail = [],
  onOpenSource,
}: RAGRetrievalCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showChunks, setShowChunks] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Normalize sources
  const normalizedSources: CitationSource[] = sources.map(s => {
    if (typeof s === 'string') {
      return {
        document_id: s,
        document_name: s,
        page_number: 1,
        section: 'General',
        chunk_id: s,
        evidence: '',
      };
    }
    return s;
  });

  const handleCopyEvidence = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const hasSources = normalizedSources.length > 0;
  const hasRetrieval = Boolean(retrieval);

  if (!hasSources && !hasRetrieval) return null;

  return (
    <div className="mt-3.5 flex flex-col gap-3">
      {/* ── 1. SOURCES / EVIDENCE CARDS ────────── */}
      {hasSources && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Grounded Evidence & Citations ({normalizedSources.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {normalizedSources.map((source, i) => (
              <div
                key={i}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#080E20]/90 p-3 hover:border-indigo-400/50 hover:bg-slate-100 dark:hover:bg-[#0C142E] transition-all duration-200 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={source.document_name}>
                        {source.document_name}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 font-mono">
                      P. {source.page_number}
                    </span>
                  </div>

                  {source.section && source.section !== 'General' && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 truncate">
                      Section: <span className="text-slate-800 dark:text-slate-300 font-medium">{source.section}</span>
                    </p>
                  )}

                  {source.evidence && (
                    <p className="text-[11px] text-slate-800 dark:text-slate-200 italic line-clamp-2 leading-relaxed bg-white dark:bg-black/40 rounded-lg p-2 border border-slate-200 dark:border-white/5 font-serif">
                      "{source.evidence}"
                    </p>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5 text-[11px]">
                  {source.evidence ? (
                    <button
                      onClick={() => handleCopyEvidence(source.evidence, i)}
                      className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedIdx === i ? 'Copied' : 'Copy Quote'}</span>
                    </button>
                  ) : <div />}

                  {onOpenSource && (
                    <button
                      onClick={() => onOpenSource(source.document_name, source.page_number, source.section, source.evidence)}
                      className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 transition rounded-md px-1.5 py-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 cursor-pointer"
                    >
                      <span>Verify Page {source.page_number}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. RETRIEVAL DETAILS (Collapsed drawer) ─ */}
      {hasRetrieval && (
        <div className="border-t border-slate-200 dark:border-white/10 pt-1 text-xs">
          <button
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition py-1 group cursor-pointer"
          >
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
            )}
            <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
              Vector Retrieval Diagnostics
            </span>
            {retrieval?.query_type && (
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 rounded-md px-1.5 py-0.5 font-mono">
                {retrieval.query_type}
              </span>
            )}
          </button>

          {showDetails && (
            <div className="mt-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#060B18]/90 p-3.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-3 animate-in fade-in-50 duration-150 backdrop-blur-md shadow-sm">
              {/* Pipeline funnel metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400">Total In Document</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">{retrieval?.total_chunks ?? 0} chunks</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400">Retrieved</p>
                  <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-300 mt-0.5 font-mono">{retrieval?.retrieved_chunks ?? 0} chunks</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400">Reranked</p>
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-300 mt-0.5 font-mono">{retrieval?.reranked_chunks ?? 0} chunks</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-2.5">
                  <p className="text-slate-500 dark:text-slate-400">Synthesized</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 mt-0.5 font-mono">{retrieval?.used_chunks ?? 0} chunks</p>
                </div>
              </div>

              {/* Pipeline methods and timing */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/5 text-[10px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Pipeline:</span>
                  {(retrieval?.methods || [
                    'Dense Semantic Search',
                    'BM25 Lexical Search',
                    'Reciprocal Rank Fusion',
                    'Reranking'
                  ]).map((m, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 px-2 py-0.5 text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 dark:text-emerald-400" />
                      {m}
                    </span>
                  ))}
                </div>

                {usage && usage.latency_ms > 0 && (
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px] bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                    {(usage.latency_ms / 1000).toFixed(2)}s · {usage.total_tokens} tokens
                  </span>
                )}
              </div>

              {/* Grounded chunks inspector */}
              {usedChunksDetail.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                  <button
                    onClick={() => setShowChunks(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition font-medium cursor-pointer"
                  >
                    <Layers className="h-3 w-3" />
                    <span>{showChunks ? 'Hide' : 'Inspect'} {usedChunksDetail.length} Grounded Chunks</span>
                    {showChunks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showChunks && (
                    <div className="mt-2.5 space-y-2 max-h-52 overflow-y-auto pr-1">
                      {usedChunksDetail.map((chunk, cIdx) => (
                        <div
                          key={cIdx}
                          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 p-2.5 text-[10px] text-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 mb-1">
                            <span className="font-semibold">Chunk #{cIdx + 1} · {chunk.document_name} · Page {chunk.page_number}</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">Score: {chunk.score}</span>
                          </div>
                          <p className="line-clamp-2 text-slate-600 dark:text-slate-400 leading-relaxed font-mono">{chunk.text_snippet}</p>
                          {onOpenSource && (
                            <button
                              onClick={() => onOpenSource(chunk.document_name, chunk.page_number, chunk.section, chunk.text_snippet)}
                              className="mt-1.5 text-[10px] text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <span>View chunk context in Viewer</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
