import React from 'react';
import { Brain, ShieldCheck, Sparkles, PenLine, Cpu, Mic, FlaskConical } from 'lucide-react';

interface ChatEmptyStateProps {
  greeting: string;
  firstName: string;
  deepThinkMode: boolean;
  onSelectPrompt: (prompt: string) => void;
  onSelectFeature: (featureLabel: string) => void;
}

const FEATURES = [
  { icon: PenLine,      label: 'AI Summarize',  color: '#A78BFA' },
  { icon: Cpu,          label: 'AI Detector',   color: '#34D399' },
  { icon: Mic,          label: 'AI Podcast...',  color: '#F472B6' },
  { icon: FlaskConical, label: 'Text to Speech', color: '#FBBF24' },
  { icon: Sparkles,     label: 'AI Image...',    color: '#F97316' },
];

const QUICK_PROMPTS = [
  {
    title: 'Summarize Key Methodologies',
    prompt: 'Summarize the primary methodology, algorithmic framework, and experimental setup used in the uploaded documents.',
  },
  {
    title: 'Extract Quantitative Results',
    prompt: 'List all key quantitative metrics, benchmarks, accuracy scores, and performance comparisons reported in the document.',
  },
  {
    title: 'Identify Limitations & Gaps',
    prompt: 'What limitations, computational constraints, or unaddressed research questions are acknowledged by the authors?',
  },
  {
    title: 'Generate 5 Exam / Quiz Questions',
    prompt: 'Create 5 high-yield multiple-choice examination questions based on the uploaded material, with explanations.',
  },
];

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  greeting,
  firstName,
  deepThinkMode,
  onSelectPrompt,
  onSelectFeature,
}) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl text-center space-y-3 mb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-cyan-500/20 border border-indigo-400/30 shadow-glow-indigo p-2 overflow-hidden">
          <img
            src="/logo-icon.png"
            alt="ResearchMind AI"
            className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.7)]"
          />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {greeting}, {firstName}! What shall we research today?
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Ask targeted academic questions, verify citations in source pages, or contrast scientific methodologies.
        </p>
      </div>

      {/* Mode badge description */}
      <div className="mb-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.03] text-xs text-slate-700 dark:text-slate-300">
        {deepThinkMode ? (
          <>
            <Brain className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
            <span>DeepThink Active: Evaluates broad theories & marks verified citations clearly.</span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Strict RAG Active: Responses guaranteed 100% grounded in your uploaded documents.</span>
          </>
        )}
      </div>

      {/* Quick Prompt Cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.title}
            onClick={() => onSelectPrompt(q.prompt)}
            className="glass-panel text-left p-3.5 rounded-2xl hover:border-indigo-400/40 hover:bg-slate-50 dark:hover:bg-[#0D1530] transition group cursor-pointer border border-slate-200 dark:border-white/10"
          >
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition flex items-center justify-between">
              <span>{q.title}</span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 opacity-60 group-hover:opacity-100" />
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{q.prompt}</p>
          </button>
        ))}
      </div>

      {/* Quick Feature Chips */}
      <div className="flex w-full max-w-2xl items-center justify-center gap-2 overflow-x-auto pb-1">
        {FEATURES.map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            onClick={() => onSelectFeature(label)}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-400/30 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <Icon className="h-3.5 w-3.5" style={{ color }} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
