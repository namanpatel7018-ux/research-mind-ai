import React from 'react';
import { Sparkles, FileSearch, Brain } from 'lucide-react';

export function AuthHeroPanel() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between p-10 relative overflow-hidden border-r border-slate-200 dark:border-white/10 bg-gradient-to-br from-indigo-50/90 via-slate-50/80 to-purple-50/90 dark:from-[#090F24]/90 dark:via-[#0E1530]/80 dark:to-[#060A18]/90 transition-colors">
      {/* Subtle inside glow */}
      <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo brand */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30">
          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-[#070D1E] overflow-hidden p-1">
            <img
              src="/logo-icon.png"
              alt="Research Mind AI Logo"
              className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">Research Mind AI</span>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-mono">v2.0</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Autonomous RAG &amp; Scientific Synthesizer</p>
        </div>
      </div>

      {/* Center value prop */}
      <div className="space-y-6 my-auto py-8">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Grounded Academic Intelligence
          </span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Synthesize literature with <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-300 dark:via-purple-300 dark:to-cyan-300 bg-clip-text text-transparent">
              mathematical precision.
            </span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            Chat with multi-thousand page research corpora, generate strict grounded citations, and export publication-ready reports in seconds.
          </p>
        </div>

        {/* Feature pill highlights */}
        <div className="space-y-3">
          {[
            { icon: FileSearch, title: 'Multi-Document Strict RAG', desc: 'Precise chunk citations with page verifications' },
            { icon: Brain, title: 'DeepThink Reasoning', desc: 'Hypothesis testing, synthesis & gap discovery' },
            { icon: Sparkles, title: 'Direct Presentation & PDF Export', desc: 'Auto-structured slide decks and formal reviews' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-white/[0.02] p-3 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-300">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer security badge */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span>Isolated User Store · Encrypted Auth</span>
        </div>
        <span className="font-mono text-[11px]">Qdrant Vector DB</span>
      </div>
    </div>
  );
}
