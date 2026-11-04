import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Sparkles, BookOpen, Layers, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { generatePDF, listFiles, UploadedFile, downloadBlob } from '../lib/api';

const DOC_TYPES = [
  {
    value: 'report',
    label: 'Research Report',
    icon: Layers,
    description: 'Comprehensive structured academic report with executive summary, methodology, and citations.',
    badge: 'Comprehensive',
  },
  {
    value: 'summary',
    label: 'Executive Summary',
    icon: Sparkles,
    description: 'High-level synthesis condensing findings, key takeaways, and core metrics.',
    badge: 'Concise',
  },
  {
    value: 'notes',
    label: 'Study Notes',
    icon: BookOpen,
    description: 'Structured revision notes organized with core definitions, formulas, and bulleted takeaways.',
    badge: 'Educational',
  },
  {
    value: 'literature_review',
    label: 'Literature Review',
    icon: FileText,
    description: 'Rigorous scholarly review examining themes, methodology critique, and future directions.',
    badge: 'Academic',
  },
];

export function GeneratePDFPage() {
  const [files, setFiles]       = useState<UploadedFile[]>([]);
  const [mode, setMode]         = useState<'topic' | 'document'>('topic');
  const [topic, setTopic]       = useState('');
  const [selected, setSelected] = useState('');
  const [docType, setDocType]   = useState('report');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  useEffect(() => {
    listFiles()
      .then((f) => {
        setFiles(f);
        if (f.length > 0) setSelected(f[0].filename);
      })
      .catch(() => {});
  }, []);

  const canGenerate = !loading && (mode === 'topic' ? topic.trim().length > 2 : !!selected);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setDone(false);
    try {
      const blob = await generatePDF(
        mode === 'topic' ? topic.trim() : '',
        mode === 'document' ? selected : undefined,
        docType,
      );

      const name = mode === 'topic'
        ? topic.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 40)
        : selected.replace(/\.[^.]+$/, '');
      downloadBlob(blob, `${docType}_${name || 'document'}.pdf`);
      setDone(true);
    } catch (e: any) {
      let msg = 'Something went wrong during PDF generation.';
      try {
        const text = await e?.response?.data?.text?.();
        msg = JSON.parse(text)?.detail ?? msg;
      } catch {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-5 p-3.5 sm:p-6 pb-20 custom-scrollbar">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-space-800/90 dark:via-space-900/90 dark:to-space-850/90 p-6 sm:p-8 backdrop-blur-xl shadow-md dark:shadow-2xl transition-colors">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent-violet/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-cyan/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-accent-violet shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 dark:bg-accent-violet/20 border border-indigo-200 dark:border-accent-violet/30 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-indigo-700 dark:text-accent-violet">
                  Export Engine
                </span>
                <span className="rounded-full bg-cyan-100 dark:bg-accent-cyan/20 border border-cyan-200 dark:border-accent-cyan/30 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-cyan-700 dark:text-accent-cyan">
                  Vector-Grounded
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                Generate Publication PDF
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Transform research queries or grounded document collections into beautifully styled publication-grade PDF documents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Configuration Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/90 p-6 sm:p-8 space-y-7 shadow-sm dark:shadow-2xl">
        {/* Source Mode Toggle */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">
            1. Select Research Source
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setMode('topic'); setError(''); setDone(false); }}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 ${
                mode === 'topic'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-accent-violet/15 text-indigo-950 dark:text-white shadow-sm'
                  : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${mode === 'topic' ? 'bg-indigo-100 dark:bg-accent-violet/25 text-indigo-700 dark:text-accent-violet' : 'bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Free AI Research Topic</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Explore any scientific subject or prompt with AI synthesis</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setMode('document'); setError(''); setDone(false); }}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 ${
                mode === 'document'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-accent-cyan/15 text-cyan-950 dark:text-white shadow-sm'
                  : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${mode === 'document' ? 'bg-cyan-100 dark:bg-accent-cyan/25 text-cyan-700 dark:text-accent-cyan' : 'bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">From Uploaded Document</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Synthesize directly from your library&apos;s indexed papers</p>
              </div>
            </button>
          </div>
        </div>

        {/* Input Field */}
        <div className="space-y-2.5">
          {mode === 'topic' ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Research Topic or Question
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); setDone(false); }}
                  placeholder="e.g., Quantum Error Correction with Topological Qubits, Multi-Agent RAG Orchestration..."
                  className="w-full rounded-xl border border-white/10 bg-space-900/80 px-4 py-3.5 text-sm text-white placeholder-slate-500 shadow-inner focus:border-accent-violet/60 focus:outline-none focus:ring-1 focus:ring-accent-violet/50 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Provide a specific theme, title, or hypothesis for targeted depth.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Target Source Document
              </label>
              {files.length === 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300 flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>No documents found in your library. Please upload papers via Research Chat or Library first.</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selected}
                    onChange={(e) => { setSelected(e.target.value); setDone(false); }}
                    className="w-full rounded-xl border border-white/10 bg-space-900/80 px-4 py-3.5 text-sm text-white focus:border-accent-cyan/60 focus:outline-none focus:ring-1 focus:ring-accent-cyan/50 transition cursor-pointer"
                  >
                    {files.map((f) => (
                      <option key={f.filename} value={f.filename} className="bg-space-900 text-white">
                        {f.filename} ({f.chunk_count} indexed chunks)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Format Cards */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            3. Document Structure &amp; Format
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {DOC_TYPES.map(({ value, label, icon: Icon, description, badge }) => {
              const active = docType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDocType(value)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-accent-violet/10 shadow-sm'
                      : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${active ? 'bg-indigo-100 dark:bg-accent-violet/20 text-indigo-700 dark:text-accent-violet' : 'bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-sm font-semibold ${active ? 'text-indigo-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {label}
                      </span>
                    </div>
                    <span className="rounded-md bg-slate-200/60 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-white/5">
                      {badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generation Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {mode === 'topic'
              ? 'AI will research, cross-reference, and compile a PDF export.'
              : `Grounding compilation strictly to: ${selected || 'selected file'}.`}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-violet to-accent-indigo px-6 py-3 text-sm font-semibold text-white shadow-glow-sm hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synthesizing PDF Document...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate &amp; Download PDF
                <ArrowRight className="h-4 w-4 opacity-70" />
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">PDF Synthesis Error</p>
              <p className="mt-0.5 text-rose-300/90">{error}</p>
            </div>
          </div>
        )}

        {done && !error && (
          <div className="flex items-center gap-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-200">Publication PDF Generated Successfully!</p>
              <p className="text-emerald-300/80">Your PDF document was automatically compiled and downloaded to your device.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

