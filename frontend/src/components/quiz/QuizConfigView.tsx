import React from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  Play,
  Download,
  Settings2,
  Sliders,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { UploadedFile } from '../../lib/api';

export type QuizMode = 'interactive' | 'pdf_export';
export type QuestionSource = 'custom_topic' | 'document_corpus';

const QUESTION_COUNT_PRESETS = [5, 10, 15, 20, 25, 30];

const TIMER_OPTIONS = [
  { label: 'No Timer', value: 0 },
  { label: '5 Mins', value: 5 },
  { label: '10 Mins', value: 10 },
  { label: '15 Mins', value: 15 },
  { label: '20 Mins', value: 20 },
  { label: '30 Mins', value: 30 },
];

const PASS_MARK_OPTIONS = [40, 50, 60, 75];

interface QuizConfigViewProps {
  activeTab: QuizMode;
  setActiveTab: (tab: QuizMode) => void;
  hasSavedSession: boolean;
  onResumeSession: () => void;
  onDiscardSavedSession: () => void;
  sourceType: QuestionSource;
  setSourceType: (src: QuestionSource) => void;
  topic: string;
  setTopic: (t: string) => void;
  files: UploadedFile[];
  selectedDoc: string;
  setSelectedDoc: (doc: string) => void;
  numQuestions: number;
  setNumQuestions: (n: number) => void;
  passMarkPercent: number;
  setPassMarkPercent: (p: number) => void;
  timerMinutes: number;
  setTimerMinutes: (m: number) => void;
  includeAnswersPDF: boolean;
  setIncludeAnswersPDF: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error: string;
  pdfDone: boolean;
  onStartInteractive: () => void;
  onGeneratePDF: () => void;
}

export const QuizConfigView: React.FC<QuizConfigViewProps> = ({
  activeTab,
  setActiveTab,
  hasSavedSession,
  onResumeSession,
  onDiscardSavedSession,
  sourceType,
  setSourceType,
  topic,
  setTopic,
  files,
  selectedDoc,
  setSelectedDoc,
  numQuestions,
  setNumQuestions,
  passMarkPercent,
  setPassMarkPercent,
  timerMinutes,
  setTimerMinutes,
  includeAnswersPDF,
  setIncludeAnswersPDF,
  loading,
  error,
  pdfDone,
  onStartInteractive,
  onGeneratePDF,
}) => {
  return (
    <div className="flex flex-col gap-4 p-3.5 sm:p-6 pb-20 w-full">
      {/* ── Top Header Banner ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-600 dark:text-violet-300 shadow-glow-violet">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Interactive Quiz & Examination Portal
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Take structured academic assessments inside the portal with real-time scoring, timers, and comprehensive answer reviews
            </p>
          </div>
        </div>

        {/* Tab switcher: Interactive vs PDF Export */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-[#050916] p-1 border border-slate-200 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('interactive')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold transition-all cursor-pointer ${
              activeTab === 'interactive'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Interactive Portal Exam</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf_export')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold transition-all cursor-pointer ${
              activeTab === 'pdf_export'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF Export</span>
          </button>
        </div>
      </div>

      {/* ── Saved Session Alert (if present) ─────────────────────────── */}
      {hasSavedSession && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 p-4 text-xs text-violet-900 dark:text-violet-200">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <span>You have an unfinished assessment saved in this browser.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResumeSession}
              className="rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white hover:bg-violet-500 shadow-sm cursor-pointer"
            >
              Resume Assessment
            </button>
            <button
              type="button"
              onClick={onDiscardSavedSession}
              className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── Main Configuration Panel ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/90 p-5 sm:p-7 space-y-6 shadow-sm dark:shadow-2xl">
        {/* Source Type Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span>Select Assessment Question Source</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Custom Free Topic */}
            <div
              onClick={() => setSourceType('custom_topic')}
              className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                sourceType === 'custom_topic'
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-600/15 shadow-sm ring-1 ring-violet-500/50'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-violet-300 dark:hover:border-violet-500/30'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <BookOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="font-display text-xs font-bold text-slate-900 dark:text-white">AI Custom Topic</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Formulate an AI-generated exam on any topic, subject matter, or scientific domain on the fly.
              </p>
            </div>

            {/* Option 2: Document Corpus */}
            <div
              onClick={() => setSourceType('document_corpus')}
              className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                sourceType === 'document_corpus'
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-600/15 shadow-sm ring-1 ring-violet-500/50'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-violet-300 dark:hover:border-violet-500/30'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="font-display text-xs font-bold text-slate-900 dark:text-white">Document Corpus</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Generate tailored questions synthesized directly from indexed research papers in your library.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Inputs Based on Source */}
        {sourceType === 'custom_topic' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Topic or Subject Matter
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Reinforcement Learning from Human Feedback (RLHF), Quantum Cryptography…"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-500"
            />
          </div>
        )}

        {sourceType === 'document_corpus' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Source Research Paper from Library
            </label>
            {files.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No documents found. Upload a PDF from the AI Chat or Library first.
              </p>
            ) : (
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                {files.map((f) => (
                  <option key={f.filename} value={f.filename} className="bg-white dark:bg-[#070D1E] text-slate-900 dark:text-white">
                    {f.filename}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Number of Questions Selector */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span>Number of Questions</span>
            </label>
            <span className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2.5 py-0.5 rounded-lg">
              {numQuestions || 3} Questions
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {QUESTION_COUNT_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setNumQuestions(val)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold font-mono transition-all cursor-pointer ${
                  numQuestions === val
                    ? 'border border-violet-500/60 bg-violet-600/30 text-violet-800 dark:text-violet-200 shadow-glow-violet ring-1 ring-violet-500/50'
                    : 'border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-violet-500/30'
                }`}
              >
                {val} Questions
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto sm:ml-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Custom:</span>
              <input
                type="number"
                min={3}
                max={50}
                value={numQuestions || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) {
                    setNumQuestions(0);
                  } else {
                    setNumQuestions(Math.min(50, Math.max(0, val)));
                  }
                }}
                onBlur={() => {
                  if (!numQuestions || numQuestions < 3) {
                    setNumQuestions(5);
                  }
                }}
                className="glass-input w-20 rounded-xl px-2.5 py-1.5 text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none border border-slate-300 dark:border-white/10 focus:border-violet-500"
                placeholder="3-50"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Select a preset or specify how many questions you want generated (3 to 50).
          </p>
        </div>

        {/* Assessment Settings: Pass Mark & Timer */}
        {activeTab === 'interactive' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-white/5">
            {/* Pass Mark Percentage */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Pass Criteria Mark ({passMarkPercent}%)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PASS_MARK_OPTIONS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPassMarkPercent(val)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold font-mono transition-all cursor-pointer ${
                      passMarkPercent === val
                        ? 'border border-emerald-500/50 bg-emerald-600/25 text-emerald-800 dark:text-emerald-200 shadow-sm'
                        : 'border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {val}% Pass
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Limit */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>Exam Timer Limit</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimerMinutes(opt.value)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold font-mono transition-all cursor-pointer ${
                      timerMinutes === opt.value
                        ? 'border border-violet-500/50 bg-violet-600/25 text-violet-800 dark:text-violet-200 shadow-sm'
                        : 'border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PDF Settings (if in PDF mode) */}
        {activeTab === 'pdf_export' && (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIncludeAnswersPDF((v) => !v)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  includeAnswersPDF
                    ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{includeAnswersPDF ? 'Answer Key Included (Verified)' : 'Include Answer Key'}</span>
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {includeAnswersPDF
                  ? 'Correct answers will be highlighted with rationales in the PDF.'
                  : 'PDF questions will be clean for student evaluation.'}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {activeTab === 'interactive' ? (
          <button
            type="button"
            onClick={onStartInteractive}
            disabled={loading || (sourceType === 'custom_topic' && topic.trim().length < 3) || (sourceType === 'document_corpus' && !selectedDoc)}
            className="glass-button-primary flex items-center justify-center gap-2.5 rounded-2xl py-3.5 px-6 text-sm font-bold text-white shadow-glow-violet disabled:opacity-40 transition-all cursor-pointer w-full hover:brightness-110 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Formulating interactive examination…</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>Start Interactive Examination Now</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGeneratePDF}
            disabled={loading || (sourceType === 'custom_topic' && topic.trim().length < 3) || (sourceType === 'document_corpus' && !selectedDoc)}
            className="glass-button-primary flex items-center justify-center gap-2 rounded-2xl py-3.5 px-6 text-sm font-semibold text-white shadow-glow-violet disabled:opacity-40 transition-all cursor-pointer w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating and downloading PDF exam…</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>Generate & Download Quiz PDF</span>
              </>
            )}
          </button>
        )}

        {/* Status Feedbacks */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {pdfDone && !error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Your quiz PDF was compiled and downloaded directly to your computer!</span>
          </div>
        )}

        {/* Feature Highlights Note */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p className="font-display font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
            Interactive Examination Engine Features
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
            <div>• One-question-at-a-time focused reading</div>
            <div>• Keyboard shortcuts [1-4] and [Enter] navigation</div>
            <div>• Randomized question shuffling on every attempt</div>
            <div>• Circular SVG percentage score ring & pass badges</div>
            <div>• Full review with green/red answer highlighting</div>
            <div>• Automatic session resume on page refresh</div>
          </div>
        </div>
      </div>
    </div>
  );
};
