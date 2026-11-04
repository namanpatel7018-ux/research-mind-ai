import React from 'react';
import { Brain, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { UserSettings } from '../../types/settings';

export const MODEL_OPTIONS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Google Gemini 2.0 Flash',
    badge: 'Recommended',
    desc: 'Optimal balance of reasoning speed and high-precision citations',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro',
    badge: 'High Token',
    desc: 'Extended context reasoning for multi-document synthesis',
  },
  {
    id: 'groq/llama-3.3-70b',
    name: 'Groq Llama 3.3 70B',
    badge: 'Ultra-Fast',
    desc: 'Sub-second inference speed for rapid academic Q&A',
  },
  {
    id: 'cerebras/llama-3.1-8b',
    name: 'Cerebras Llama 3.1 8B',
    badge: 'Low Latency',
    desc: 'Instantaneous retrieval response generation',
  },
];

interface ReasoningTabProps {
  defaultMode: 'strict' | 'deepthink' | 'balanced';
  setDefaultMode: (val: 'strict' | 'deepthink' | 'balanced') => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  maxTokens: number;
  setMaxTokens: (val: number) => void;
  handleSaveSettings: (updates?: Partial<UserSettings>, silent?: boolean) => void;
  toast: any;
}

export function ReasoningTab({
  defaultMode,
  setDefaultMode,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  handleSaveSettings,
  toast,
}: ReasoningTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            AI Reasoning Engine &amp; Retrieval Modes
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Control the tradeoff between strict document grounding and exploratory generative synthesis.
        </p>
      </div>

      {/* Reasoning Mode Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-300">
          Default Answering Strategy
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setDefaultMode('strict');
              handleSaveSettings({ default_mode: 'strict' }, true);
              toast.info('Default mode set to Strict RAG');
            }}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition cursor-pointer ${
              defaultMode === 'strict'
                ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                <ShieldCheck className="h-4 w-4" /> Strict RAG
              </div>
              {defaultMode === 'strict' && <Check className="h-4 w-4 text-emerald-500" />}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Zero speculation. Grounds answers strictly in your indexed PDF vector chunks with line-level quotes.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDefaultMode('deepthink');
              handleSaveSettings({ default_mode: 'deepthink' }, true);
              toast.info('Default mode set to DeepThink');
            }}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition cursor-pointer ${
              defaultMode === 'deepthink'
                ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-violet-700 dark:text-violet-400 text-xs">
                <Brain className="h-4 w-4" /> DeepThink
              </div>
              {defaultMode === 'deepthink' && <Check className="h-4 w-4 text-violet-500" />}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Multi-hop exploratory reasoning. Correlates paper methodology with broader theoretical frameworks.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setDefaultMode('balanced');
              handleSaveSettings({ default_mode: 'balanced' }, true);
              toast.info('Default mode set to Balanced');
            }}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition cursor-pointer ${
              defaultMode === 'balanced'
                ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-cyan-700 dark:text-cyan-400 text-xs">
                <Sparkles className="h-4 w-4" /> Balanced Hybrid
              </div>
              {defaultMode === 'balanced' && <Check className="h-4 w-4 text-cyan-500" />}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Fluid narrative synthesis backed by citations. Recommended for literature reviews and study summaries.
            </p>
          </button>
        </div>
      </div>

      {/* Primary AI Provider Selection */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-300">
          Primary Inference Provider
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSelectedModel(m.id);
                localStorage.setItem('rm_model', m.id);
                toast.info(`Primary model set to ${m.name}`);
              }}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                selectedModel === m.id
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-500'
                  : 'border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 dark:text-white">{m.name}</span>
                <span className="rounded bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-700 dark:text-indigo-400">
                  {m.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Temperature & Token Budget Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Sampling Temperature
            </label>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {temperature.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={temperature}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setTemperature(val);
              localStorage.setItem('rm_temp', val.toString());
            }}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>0.0 (Deterministic)</span>
            <span>0.5 (Balanced)</span>
            <span>1.0 (Creative)</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Max Token Budget
            </label>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {maxTokens} tokens
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[1024, 2048, 4096, 8192].map((tokens) => (
              <button
                key={tokens}
                type="button"
                onClick={() => {
                  setMaxTokens(tokens);
                  localStorage.setItem('rm_max_tokens', tokens.toString());
                }}
                className={`rounded-lg border py-1.5 text-center text-xs font-mono transition cursor-pointer ${
                  maxTokens === tokens
                    ? 'border-indigo-600 bg-indigo-600 text-white font-bold'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tokens}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
