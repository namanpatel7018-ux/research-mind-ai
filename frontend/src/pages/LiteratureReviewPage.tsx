import { useEffect, useState } from 'react';
import {
  FileText, History, Loader2, Sparkles, Presentation,
  Download, Copy, Check, BookOpen, Layers, CheckSquare, Square,
  ChevronDown, ChevronUp, Atom
} from 'lucide-react';
import {
  generateLiteratureReview, getLiteratureHistory, listFiles,
  LiteratureRecord, UploadedFile, generatePDF, convertToPPT, downloadBlob
} from '../lib/api';
import { formatMarkdown } from '../lib/formatMarkdown';

export function LiteratureReviewPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [review, setReview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<LiteratureRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sourceCollapsed, setSourceCollapsed] = useState(false);

  const [copied, setCopied] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPptLoading, setExportPptLoading] = useState(false);

  const handleExportPPT = async () => {
    if (!review) return;
    try {
      setExportPptLoading(true);
      const pptTopic = topic.trim() || 'Literature Review Synthesis';
      const blob = await convertToPPT(pptTopic, selected.length > 0 ? selected[0] : undefined, 8, review);
      downloadBlob(blob, `literature_review_${Date.now()}.pptx`);
    } catch (err) {
      console.error('Failed to export PPT:', err);
      alert('Failed to export presentation from literature review.');
    } finally {
      setExportPptLoading(false);
    }
  };

  useEffect(() => {
    listFiles()
      .then(items => {
        setFiles(items);
        setSelected(items.map(item => item.filename));
      })
      .catch(() => setError('Could not load your uploaded documents.'));
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const h = await getLiteratureHistory();
      setHistory(h);
    } catch {}
  };

  const toggleFile = (filename: string) => {
    setSelected(current =>
      current.includes(filename) ? current.filter(name => name !== filename) : [...current, filename]
    );
  };

  const selectAll = () => setSelected(files.map(f => f.filename));
  const deselectAll = () => setSelected([]);

  const generate = async () => {
    if (!selected.length) {
      setError('Select at least one document to analyze.');
      return;
    }
    setLoading(true);
    setError('');
    setReview('');
    try {
      const result = await generateLiteratureReview(selected, topic || undefined);
      setReview(result.review);
      setSourceCollapsed(true);
      loadHistory();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not generate the literature review.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!review) return;
    navigator.clipboard.writeText(review);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!review) return;
    try {
      setExportLoading(true);
      const pdfTopic = topic || 'Academic Literature Review';
      const blob = await generatePDF(pdfTopic, undefined, 'literature_review', review);
      downloadBlob(blob, `literature_review_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF from literature review.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-5 p-3.5 sm:p-6 pb-20 custom-scrollbar">
      {/* ── 1. Header Banner ───────────────────────────────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 p-6 sm:p-7 shadow-md dark:shadow-2xl backdrop-blur-2xl transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 shadow-sm">
              <BookOpen className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">Literature Intelligence</p>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Multi-Document Literature Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Synthesize existing academic studies, construct comparative analysis matrices, and surface identified research gaps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              showHistory
                ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-sm'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Saved Reviews ({history.length})</span>
          </button>
        </div>
      </section>

      {/* ── 2. History Drawer ─────────────────────────────────────────── */}
      {showHistory && (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in-50 duration-200">
          <div className="border-b border-white/5 pb-2.5 mb-3 flex items-center justify-between">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">Previous Literature Syntheses</p>
            <span className="text-[10px] text-slate-500 font-mono">One-click restore</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No saved reviews recorded yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setReview(h.review);
                    setSelected(h.document_names || []);
                    setShowHistory(false);
                    setSourceCollapsed(true);
                  }}
                  className="glass-card-interactive rounded-2xl p-4 text-left cursor-pointer"
                >
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {(h.document_names && h.document_names.join(', ')) || 'Literature Review'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                    {new Date(h.created_at).toLocaleDateString()} · {h.document_names?.length || 0} papers
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. Paper Selection & Input Card ────────────────────────────── */}
      <div className="glass-panel rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
              Source Papers ({selected.length} of {files.length} selected)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {!sourceCollapsed && (
              <>
                <button
                  onClick={selectAll}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={deselectAll}
                  className="text-slate-400 hover:text-slate-300 font-medium transition cursor-pointer"
                >
                  Deselect All
                </button>
                <span className="text-slate-600">|</span>
              </>
            )}
            <button
              onClick={() => setSourceCollapsed(!sourceCollapsed)}
              className="flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
              title={sourceCollapsed ? "Expand source papers" : "Collapse source papers"}
            >
              <span>{sourceCollapsed ? 'Show Selection' : 'Collapse'}</span>
              {sourceCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {sourceCollapsed ? (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="truncate max-w-xl">
              <strong className="text-slate-200">{selected.length} paper{selected.length === 1 ? '' : 's'} included</strong>: {selected.join(', ')}
            </span>
            <button
              onClick={() => setSourceCollapsed(false)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition ml-2 shrink-0 cursor-pointer"
            >
              Modify Selection
            </button>
          </div>
        ) : (
          <>
            {files.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No documents available. Upload PDF papers from AI Chat or Library first.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                {files.map(file => {
                  const isChecked = selected.includes(file.filename);
                  return (
                    <label
                      key={file.filename}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-950 dark:text-white font-medium shadow-sm'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFile(file.filename)}
                        className="accent-indigo-600 cursor-pointer rounded"
                      />
                      <span className="max-w-[220px] truncate">{file.filename}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[260px]">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Optional: Central research topic or problem statement (e.g. 'Deep Learning in Medical Imaging')"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0C1221] px-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm"
                />
              </div>

              <button
                onClick={generate}
                disabled={loading || !selected.length}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 disabled:opacity-40 transition cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Generate Academic Review</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── 4. Output Panel ────────────────────────────────────────────── */}
      <div className="glass-panel rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-200">Synthesized Review Output</h2>
          </div>

          {review && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition cursor-pointer"
                title="Copy markdown review"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={exportLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-500/10"
                title="Export academic report PDF"
              >
                {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" /> : <Download className="h-3.5 w-3.5 text-cyan-400" />}
                <span>Export PDF</span>
              </button>

              <button
                onClick={handleExportPPT}
                disabled={exportPptLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-200 hover:bg-orange-500/20 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-orange-500/10"
                title="Convert to presentation deck (.pptx)"
              >
                {exportPptLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" /> : <Presentation className="h-3.5 w-3.5 text-orange-400" />}
                <span>Convert to PPT</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-glow-indigo">
              <Atom className="h-6 w-6 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <p className="text-sm font-semibold text-slate-200">Analyzing research corpora & cross-referencing findings…</p>
            <p className="text-xs text-slate-500 font-mono">Synthesizing study matrices, methodology profiles, and research gaps</p>
          </div>
        )}

        {!loading && !review && !error && (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-300">Select research papers above and click "Generate Academic Review".</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Produces structured academic study profiles, comparative analysis tables, thematic syntheses, and future research vectors.
            </p>
          </div>
        )}

        {!loading && review && (
          <div
            className="prose-research text-slate-900 dark:text-slate-200 text-xs sm:text-sm leading-relaxed p-5 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-[#050916]/80 border border-slate-200 dark:border-white/5"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(review) }}
          />
        )}
      </div>
    </div>
  );
}