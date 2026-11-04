import React from 'react';
import { FileText } from 'lucide-react';
import { UserSettings } from '../../types/settings';

interface PresentationTabProps {
  responseStyle: 'structured' | 'academic' | 'concise';
  setResponseStyle: (val: 'structured' | 'academic' | 'concise') => void;
  citationDisplay: 'detailed' | 'subtle' | 'minimal';
  setCitationDisplay: (val: 'detailed' | 'subtle' | 'minimal') => void;
  latexRender: boolean;
  setLatexRender: (val: boolean) => void;
  streamResponse: boolean;
  setStreamResponse: (val: boolean) => void;
  handleSaveSettings: (updates?: Partial<UserSettings>, silent?: boolean) => void;
  toast: any;
}

export function PresentationTab({
  responseStyle,
  setResponseStyle,
  citationDisplay,
  setCitationDisplay,
  latexRender,
  setLatexRender,
  streamResponse,
  setStreamResponse,
  handleSaveSettings,
  toast,
}: PresentationTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Response Formatting &amp; Citation Presentation
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Tailor generated responses to your research standards, thesis formatting, and citation visual density.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Response Structure Format */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-300">
            Default Answer Structure
          </label>
          <select
            value={responseStyle}
            onChange={(e) => {
              const val = e.target.value as any;
              setResponseStyle(val);
              handleSaveSettings({ response_style: val }, true);
              toast.info(`Response format updated to ${val}`);
            }}
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-space-900/90 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-sm"
          >
            <option value="structured">Structured &amp; Formatted (Headings, Steps, Tables)</option>
            <option value="academic">Academic &amp; Rigorous (Deep Theoretical Literature)</option>
            <option value="concise">Concise &amp; Executive (Quick Bullet Points)</option>
          </select>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Controls how answers organize headers, comparative matrices, and takeaways.
          </p>
        </div>

        {/* 2. Citation Density */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-300">
            Citation Evidence Density
          </label>
          <select
            value={citationDisplay}
            onChange={(e) => {
              const val = e.target.value as any;
              setCitationDisplay(val);
              handleSaveSettings({ citation_display: val }, true);
              toast.info(`Citation display set to ${val}`);
            }}
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-space-900/90 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-sm"
          >
            <option value="detailed">Detailed (Document title, page number, verbatim quote snippet)</option>
            <option value="subtle">Subtle (Page pills with instant source viewer modal)</option>
            <option value="minimal">Minimal (Collapsible reference footers)</option>
          </select>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Select how references are highlighted in paragraphs and chat messages.
          </p>
        </div>
      </div>

      {/* Toggles for LaTeX and Code Syntax */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Render LaTeX Mathematical Formulas
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Renders inline and block LaTeX formulas ($...$ and $$...$$) using KaTeX typography.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !latexRender;
              setLatexRender(next);
              localStorage.setItem('rm_latex', next ? 'true' : 'false');
              toast.info(next ? 'LaTeX formulas enabled' : 'LaTeX formulas disabled');
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              latexRender ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                latexRender ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Real-Time Token Streaming</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Streams tokens fluidly with typewriter animation as the LLM reasons.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !streamResponse;
              setStreamResponse(next);
              localStorage.setItem('rm_stream', next ? 'true' : 'false');
              toast.info(next ? 'Token streaming enabled' : 'Token streaming disabled');
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              streamResponse ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                streamResponse ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
