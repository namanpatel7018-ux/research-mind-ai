import { useEffect, useState } from 'react';
import {
  FileText, Sparkles, Loader2, Copy, Check, Presentation,
  Download, Clock, ChevronRight, Atom, Compass
} from 'lucide-react';
import {
  summarizeFile, getSummaryHistory, listFiles,
  SummaryRecord, UploadedFile, generatePDF, convertToPPT, downloadBlob
} from '../lib/api';
import { formatMarkdown } from '../lib/formatMarkdown';

const FOCUS_OPTIONS = [
  { id: 'general',    label: 'Standard Executive Summary' },
  { id: 'methods',    label: 'Methodology & Technical Architecture' },
  { id: 'results',    label: 'Key Results, Metrics & Benchmarks' },
  { id: 'takeaways',  label: 'Key Takeaways & High-Yield Bullet Points' },
  { id: 'literature', label: 'Background & Literature Review Context' },
];

export function AISummaryPage() {
  const [files, setFiles]                 = useState<UploadedFile[]>([]);
  const [selected, setSelected]           = useState('');
  const [focus, setFocus]                 = useState('general');
  const [customPrompt, setCustomPrompt]   = useState('');
  const [summary, setSummary]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [history, setHistory]             = useState<SummaryRecord[]>([]);
  const [copied, setCopied]               = useState(false);
  const [exportLoading, setExportLoading] = useState<'pdf' | 'ppt' | null>(null);

  useEffect(() => {
    listFiles()
      .then((f) => {
        setFiles(f);
        if (f.length > 0) setSelected(f[0].filename);
      })
      .catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const h = await getSummaryHistory();
      setHistory(h);
    } catch {}
  };

  const handleSummarize = async () => {
    if (!selected) return;
    setLoading(true);
    setSummary('');
    try {
      const res = await summarizeFile(selected, focus, customPrompt || undefined);
      setSummary(res.summary);
      loadHistory();
    } catch (e: any) {
      setSummary(`Error: ${e?.response?.data?.detail ?? 'Something went wrong.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreviousSummary = (item: SummaryRecord) => {
    setSelected(item.document_name);
    setFocus((item as any).focus || 'general');
    setSummary(item.summary);
  };

  const handleCreatePPT = async () => {
    if (!summary || !selected) return;
    try {
      setExportLoading('ppt');
      const docBase = selected.replace(/\.[^.]+$/, '');
      const pptTopic = `Summary: ${docBase}`;
      const blob = await convertToPPT(pptTopic, selected, 8, summary);
      downloadBlob(blob, `${docBase}_summary_presentation.pptx`);
    } catch (e) {
      console.error('Failed to create PPT from summary:', e);
      alert('Failed to generate presentation from summary.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportPDF = async () => {
    if (!summary || !selected) return;
    try {
      setExportLoading('pdf');
      const docBase = selected.replace(/\.[^.]+$/, '');
      const pdfTopic = `Executive Summary: ${selected}`;
      const blob = await generatePDF(pdfTopic, selected, 'summary', summary);
      downloadBlob(blob, `${docBase}_summary.pdf`);
    } catch (e) {
      console.error('Failed to export PDF from summary:', e);
      alert('Failed to generate PDF from summary.');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-3.5 sm:p-5">
      
      {/* ── 1. Top Header Banner ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 shadow-glow-cyan">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">AI Summary Engine</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Question-aware synthesis structured for academic and technical papers</p>
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-sm"
              title="Copy Summary"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleCreatePPT}
              disabled={exportLoading === 'ppt'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-500/10"
              title="Create Presentation from this summary"
            >
              {exportLoading === 'ppt' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" /> : <Presentation className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
              <span>Convert to PPT</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportLoading === 'pdf'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-500/10"
              title="Export Summary as PDF"
            >
              {exportLoading === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600 dark:text-cyan-400" /> : <Download className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />}
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Content & History Split ─────────────────────────────────── */}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {/* Main generation panel */}
        <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 sm:p-5 overflow-hidden shadow-sm dark:shadow-2xl transition-colors">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <FileText className="h-10 w-10 text-slate-400 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-800 dark:text-white">No documents available in library</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Upload PDF papers from the AI Chat or Document Library first.</p>
            </div>
          ) : (
            <>
              {/* Controls Grid */}
              <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Target Document
                    </label>
                    <select
                      value={selected}
                      onChange={(e) => { setSelected(e.target.value); setSummary(''); }}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#080B12] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm cursor-pointer"
                    >
                      {files.map((f) => (
                        <option key={f.filename} value={f.filename}>{f.filename}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Summary Framework
                    </label>
                    <select
                      value={focus}
                      onChange={(e) => setFocus(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#080B12] px-3 py-2 text-xs font-medium text-cyan-700 dark:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 shadow-sm cursor-pointer"
                    >
                      {FOCUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      onClick={handleSummarize}
                      disabled={loading || !selected}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 px-3 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 disabled:opacity-40 transition cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Generate Summary</span>
                    </button>
                  </div>
                </div>

                {/* Optional Custom Instructions Input */}
                <div>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Optional: Custom focus prompt (e.g. 'Extract evaluation metrics and comparison with state-of-the-art models' or 'Formulas for final exam revision')"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#080B12] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm"
                  />
                </div>
              </div>

              {/* Output Content */}
              <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-[#050916]/80 border border-slate-200 dark:border-white/5 p-5 sm:p-6 transition-colors">
                {loading && (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500 dark:text-slate-400">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Atom className="h-6 w-6 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Analyzing document pages &amp; synthesizing structure…</p>
                    <p className="text-xs text-slate-500 font-mono">Filtering high-yield citations with Qdrant vectors</p>
                  </div>
                )}
                {!loading && !summary && (
                  <div className="flex flex-col items-center justify-center h-64 gap-2 text-center text-slate-500 dark:text-slate-400">
                    <Compass className="h-8 w-8 text-slate-400 dark:text-slate-600 mb-1" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Select a paper and summary framework</p>
                    <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                      ResearchMind AI dynamically formats the summary for Research Papers, Study Notes, Methodological Deep Dives, or Rapid Revisions.
                    </p>
                  </div>
                )}
                {!loading && summary && (
                  <div 
                    className="prose-research text-slate-900 dark:text-slate-200 text-xs sm:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(summary) }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Saved Summaries Sidebar */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/80 backdrop-blur-2xl p-4 overflow-hidden shadow-sm dark:shadow-2xl transition-colors">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-slate-200 dark:border-white/5">
            <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="font-display text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Saved Summaries</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No saved summaries recorded yet.</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenPreviousSummary(item)}
                  className="group rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/90 dark:bg-white/[0.03] hover:border-cyan-400/50 hover:bg-slate-100 dark:hover:bg-white/[0.06] p-3 cursor-pointer shadow-sm transition"
                >
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-200">
                    {item.document_name}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    <span className="flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400 font-medium">
                      Open <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
