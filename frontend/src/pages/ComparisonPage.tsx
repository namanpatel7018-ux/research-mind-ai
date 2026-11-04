import { useEffect, useState } from 'react';
import {
  History, LayoutGrid, Loader2, Copy, Check, FileText, CheckCircle2,
  ChevronRight, ArrowRight, Layers
} from 'lucide-react';
import { listFiles, compareFiles, getComparisonHistory, UploadedFile, ComparisonRecord } from '../lib/api';
import { formatMarkdown } from '../lib/formatMarkdown';

export function ComparisonPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ComparisonRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listFiles().then((f) => setFiles(f)).catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const h = await getComparisonHistory();
      setHistory(h);
    } catch {}
  };

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
    setResult('');
  };

  const handleCompare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    setResult('');
    try {
      const res = await compareFiles(selected);
      setResult(res.comparison);
      loadHistory();
    } catch (e: any) {
      setResult(`Error: ${e?.response?.data?.detail ?? 'Something went wrong.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-3.5 sm:p-5">
      
      {/* ── 1. Top Header Banner ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-tight">Paper Comparison Matrix</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">Contrast methodologies, experimental results, and limitations side-by-side</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {result && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Matrix'}</span>
            </button>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              showHistory
                ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 shadow-sm'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Saved Comparisons ({history.length})</span>
          </button>
        </div>
      </div>

      {/* ── 2. Content Body ────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {/* Paper Selector Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 overflow-hidden shadow-sm dark:shadow-2xl">
          <div className="border-b border-slate-200 dark:border-white/5 pb-2.5">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Select Papers</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pick 2 or more documents to contrast ({selected.length} chosen)</p>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
            {files.length === 0 ? (
              <p className="mt-4 text-center text-xs text-slate-500">No documents found. Upload PDFs first.</p>
            ) : (
              files.map((f) => {
                const isSelected = selected.includes(f.filename);
                return (
                  <label
                    key={f.filename}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-950 dark:text-white font-medium shadow-sm'
                        : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(f.filename)}
                      className="mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-xs">{f.filename}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {f.page_count ? `${f.page_count}p · ` : ''}{f.chunk_count || 0} chunks
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <button
            onClick={handleCompare}
            disabled={selected.length < 2 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/25 disabled:opacity-40 transition cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutGrid className="h-4 w-4" />}
            <span>Compare {selected.length > 1 ? `(${selected.length}) Papers` : ''}</span>
          </button>
        </aside>

        {/* History drawer when opened */}
        {showHistory && (
          <aside className="glass-panel flex w-64 shrink-0 flex-col gap-3 rounded-2xl p-4 overflow-hidden shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="border-b border-white/5 pb-2">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-emerald-300">Previous Matrices</p>
              <p className="text-[10px] text-slate-500">Restore past side-by-side analyses</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
              {history.length === 0 ? (
                <p className="mt-4 text-center text-xs text-slate-500">No saved comparisons yet.</p>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setResult(h.comparison);
                      setSelected(h.document_names || []);
                    }}
                    className="glass-card-interactive w-full text-left rounded-xl p-3 cursor-pointer"
                  >
                    <p className="font-semibold text-slate-200 text-xs truncate">
                      {h.document_names.join(' vs ') || 'Comparison Matrix'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(h.created_at).toLocaleDateString()} · {h.document_names.length} docs
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Result Area */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-5 sm:p-6 shadow-sm dark:shadow-2xl">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500 dark:text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <LayoutGrid className="h-6 w-6 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Cross-comparing methodologies & evidence chunks…</p>
              <p className="text-xs text-slate-500 font-mono">Synthesizing comparative markdown matrix</p>
            </div>
          )}
          {!loading && !result && (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-center text-slate-500 dark:text-slate-400">
              <LayoutGrid className="h-8 w-8 text-slate-400 dark:text-slate-600 mb-1" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">No comparison active</p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Check at least 2 research papers in the sidebar and click "Compare" to generate a side-by-side academic analysis.
              </p>
            </div>
          )}
          {!loading && result && (
            <div
              className="prose-research text-slate-900 dark:text-slate-200 text-xs sm:text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
