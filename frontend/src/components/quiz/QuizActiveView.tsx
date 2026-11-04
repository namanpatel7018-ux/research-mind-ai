import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { InteractiveQuizQuestion } from '../../lib/api';

interface QuizActiveViewProps {
  questions: InteractiveQuizQuestion[];
  currentIndex: number;
  userAnswers: Record<number, number | null>; // question index -> option index (0..3)
  onSelectOption: (questionIndex: number, optionIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpTo: (index: number) => void;
  onSubmit: () => void;
  timeLeftSeconds: number | null; // null if timer disabled
  totalDurationSeconds?: number;
  quizTitle?: string;
  isSubmitting?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizActiveView: React.FC<QuizActiveViewProps> = ({
  questions,
  currentIndex,
  userAnswers,
  onSelectOption,
  onNext,
  onPrev,
  onJumpTo,
  onSubmit,
  timeLeftSeconds,
  quizTitle = 'Academic Research Examination',
  isSubmitting = false,
}) => {
  const currentQuestion = questions[currentIndex];
  const selectedOptionIndex = userAnswers[currentIndex] ?? null;
  const isAnswered = selectedOptionIndex !== null;
  const isLastQuestion = currentIndex === questions.length - 1;

  // Format MM:SS for countdown timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard accessibility
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Keys 1..4 or A..D to pick option
      if (['1', 'a', 'A'].includes(e.key)) {
        e.preventDefault();
        onSelectOption(currentIndex, 0);
      } else if (['2', 'b', 'B'].includes(e.key)) {
        e.preventDefault();
        onSelectOption(currentIndex, 1);
      } else if (['3', 'c', 'C'].includes(e.key)) {
        e.preventDefault();
        onSelectOption(currentIndex, 2);
      } else if (['4', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
        onSelectOption(currentIndex, 3);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isAnswered) {
          e.preventDefault();
          if (isLastQuestion) {
            onSubmit();
          } else {
            onNext();
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          e.preventDefault();
          onPrev();
        }
      }
    },
    [currentIndex, isAnswered, isLastQuestion, onNext, onPrev, onSelectOption, onSubmit]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const answeredCount = Object.values(userAnswers).filter((v) => v !== null).length;

  return (
    <div className="flex flex-col gap-4 p-3.5 sm:p-6 pb-20 w-full">
      {/* ── Top Quiz Status Header ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 py-3.5 shadow-md dark:shadow-2xl backdrop-blur-2xl transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-600 dark:text-violet-300 shadow-glow-violet">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">
              {quizTitle}
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Interactive Assessment Mode • One question at a time
            </p>
          </div>
        </div>

        {/* Timer Badge (if active) */}
        {timeLeftSeconds !== null && (
          <div
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 border font-mono text-xs font-semibold tracking-wider transition-all ${
              timeLeftSeconds <= 60
                ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 animate-pulse'
                : 'border-violet-300 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-200'
            }`}
          >
            <Clock className={`h-4 w-4 ${timeLeftSeconds <= 60 ? 'text-rose-500 dark:text-rose-400' : 'text-violet-600 dark:text-violet-400'}`} />
            <span>Time Remaining: {formatTime(timeLeftSeconds)}</span>
          </div>
        )}
      </div>

      {/* ── Progress & Question Meta ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/90 p-4 sm:p-5 space-y-3 shadow-sm dark:shadow-2xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-violet-700 dark:text-violet-300 text-sm">
              Question {currentIndex + 1}
            </span>
            <span className="text-slate-500">of {questions.length}</span>
            <span className="rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/5 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
              {currentQuestion.marks || 1} Mark
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <span>Answered:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900/90 border border-slate-300 dark:border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 shadow-glow-violet"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* Question Nav Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {questions.map((_, idx) => {
            const isCurr = idx === currentIndex;
            const isDone = userAnswers[idx] !== null && userAnswers[idx] !== undefined;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onJumpTo(idx)}
                aria-label={`Jump to question ${idx + 1}`}
                className={`h-7 min-w-7 rounded-lg text-[11px] font-mono font-semibold transition-all flex items-center justify-center cursor-pointer ${
                  isCurr
                    ? 'border border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-600/30 scale-105'
                    : isDone
                    ? 'border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                    : 'border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Question Card ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/90 p-5 sm:p-7 space-y-6 flex flex-col justify-between min-h-0 shadow-sm dark:shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Category / Subtitle */}
            {currentQuestion.subtitle && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/25 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                <HelpCircle className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                <span>{currentQuestion.subtitle}</span>
              </div>
            )}

            {/* Question Text */}
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight">
              {currentQuestion.question}
            </h3>

            {/* 4 Multiple-Choice Options Styled as Radio Cards */}
            <div className="space-y-3 pt-1" role="radiogroup" aria-label="Question options">
              {currentQuestion.options.map((optionText, optIdx) => {
                const isSelected = selectedOptionIndex === optIdx;
                const letter = OPTION_LETTERS[optIdx];

                return (
                  <label
                    key={optIdx}
                    onClick={() => onSelectOption(currentIndex, optIdx)}
                    className={`group relative flex items-center justify-between gap-4 rounded-xl border p-4 sm:p-4.5 cursor-pointer transition-all duration-200 select-none ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-600/15 shadow-sm ring-1 ring-violet-500/60'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Letter Indicator */}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-mono font-bold transition-all ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-violet-400/40 group-hover:text-violet-700 dark:group-hover:text-white'
                        }`}
                      >
                        {letter}
                      </span>

                      {/* Option Text */}
                      <span
                        className={`text-xs sm:text-sm font-medium leading-relaxed transition-colors ${
                          isSelected ? 'text-violet-950 dark:text-white font-semibold' : 'text-slate-800 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white'
                        }`}
                      >
                        {optionText}
                      </span>
                    </div>

                    {/* Radio Button Custom Visual */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        Key [{optIdx + 1}]
                      </span>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-violet-500 bg-violet-600'
                            : 'border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 group-hover:border-violet-400'
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white shadow-sm" />}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Bottom Navigation Controls ─────────────────────────────── */}
        <div className="pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          {/* Previous Button */}
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {/* Hint for keyboard */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Keys [1-4] or [A-D] to pick • [Enter] for Next</span>
          </div>

          {/* Next or Submit Button */}
          {isLastQuestion ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!isAnswered || isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-glow-emerald disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Evaluating Assessment…' : 'Submit Assessment'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!isAnswered}
              className="glass-button-primary flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-glow-violet disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
