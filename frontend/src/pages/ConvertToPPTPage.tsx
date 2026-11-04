import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Presentation, Sparkles, CheckCircle2 } from 'lucide-react';
import { convertToPPT, listFiles, UploadedFile } from '../lib/api';

const SLIDE_OPTIONS = [4, 6, 8, 10, 12, 15];

export function ConvertToPPTPage() {
  const [files, setFiles]         = useState<UploadedFile[]>([]);
  const [mode, setMode]           = useState<'topic' | 'document'>('topic');
  const [topic, setTopic]         = useState('');
  const [selected, setSelected]   = useState('');
  const [numSlides, setNumSlides] = useState(8);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  useEffect(() => {
    listFiles()
      .then((f) => {
        setFiles(f);
        if (f.length > 0) setSelected(f[0].filename);
      })
      .catch(() => {});
  }, []);

  const canGenerate =
    !loading && (mode === 'topic' ? topic.trim().length > 2 : !!selected);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setDone(false);
    try {
      const blob = await convertToPPT(
        mode === 'topic' ? topic.trim() : '',
        mode === 'document' ? selected : undefined,
        numSlides,
      );

      // Trigger browser download
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const name = mode === 'topic'
        ? topic.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 40)
        : selected.replace(/\.[^.]+$/, '');
      link.href     = url;
      link.download = `${name}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e: any) {
      const detail = e?.response?.data
        ? await e.response.data.text?.().catch(() => '')
        : '';
      let msg = 'Something went wrong.';
      try { msg = JSON.parse(detail)?.detail ?? msg; } catch {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-3.5 sm:p-5">
      {/* ── 1. Top Header Banner ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <Presentation className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Convert to PPT</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Generate structured academic presentation decks from topics or indexed papers</p>
          </div>
        </div>
      </div>

      {/* ── 2. Main Generation Panel ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-5 sm:p-6 shadow-sm dark:shadow-2xl min-h-0 transition-colors">
        {/* Mode toggle */}
        <div className="flex gap-2.5">
          {(['topic', 'document'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setDone(false); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                mode === m
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {m === 'topic'
                ? <><Sparkles className="h-4 w-4 text-amber-400" /> Free Topic</>
                : <><FileText  className="h-4 w-4 text-cyan-400" /> From Document</>}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#060A15] p-5 transition-colors">
          {mode === 'topic' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Presentation Topic
              </label>
              <input
                value={topic}
                onChange={(e) => { setTopic(e.target.value); setDone(false); }}
                placeholder="e.g. Introduction to Machine Learning, Climate Change Impacts…"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0C1221] px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Source Document
              </label>
              {files.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No documents found. Upload a PDF from the AI Chat page first.
                </p>
              ) : (
                <select
                  value={selected}
                  onChange={(e) => { setSelected(e.target.value); setDone(false); }}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0C1221] px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm cursor-pointer"
                >
                  {files.map((f) => (
                    <option key={f.filename} value={f.filename}>{f.filename}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Slide count */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Number of Slides
            </label>
            <div className="flex flex-wrap gap-2">
              {SLIDE_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNumSlides(n)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    numSlides === n
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0C1221] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 disabled:opacity-40 transition cursor-pointer"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating presentation…</>
            : <><Sparkles className="h-4 w-4" /> Generate &amp; Download PPT</>}
        </button>

        {/* Status */}
        {error && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {done && !error && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Your presentation was generated and downloaded successfully.
          </div>
        )}

        {/* How it works */}
        {!loading && !done && !error && (
          <div className="mt-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0C1221] p-4.5 transition-colors">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>Choose a free topic or pick an uploaded document as the source.</li>
              <li>Select how many slides you want (4–15).</li>
              <li>Groq AI generates structured slide content with citations.</li>
              <li>A polished academic <strong className="text-slate-900 dark:text-slate-200">.pptx</strong> file downloads automatically to your device.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
