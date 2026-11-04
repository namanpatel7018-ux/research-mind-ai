import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutDashboard,
  Award,
  Clock,
  Check,
  X,
  MinusCircle,
  HelpCircle,
  FileDown,
  Target,
  Sparkles,
  AlertCircle,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { InteractiveQuizQuestion } from '../../lib/api';
import { CircularProgress } from './CircularProgress';

interface QuizResultViewProps {
  questions: InteractiveQuizQuestion[];
  userAnswers: Record<number, number | null>;
  score: number;
  total: number;
  passMarkPercent?: number; // default 40
  timeSpentSeconds?: number;
  onRetake: () => void;
  onBackToDashboard: () => void;
  onNewQuiz?: () => void;
  quizTitle?: string;
  onExportPDF?: () => void;
  isExporting?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  questions,
  userAnswers,
  score,
  total,
  passMarkPercent = 40,
  timeSpentSeconds = 0,
  onRetake,
  onBackToDashboard,
  onNewQuiz,
  quizTitle = 'Academic Research Examination',
  onExportPDF,
  isExporting = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');

  // Immediately ensure main scroll container is reset to top so summary is visible
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const percentage = Math.round((score / total) * 100);
  const isPassed = percentage >= passMarkPercent;

  let wrongCount = 0;
  let skippedCount = 0;

  questions.forEach((q, idx) => {
    const selected = userAnswers[idx];
    if (selected === null || selected === undefined) {
      skippedCount++;
    } else if (selected !== q.correctAnswerIndex) {
      wrongCount++;
    }
  });

  const correctPercent = Math.round((score / total) * 100);
  const wrongPercent = Math.round((wrongCount / total) * 100);
  const skippedPercent = 100 - correctPercent - wrongPercent;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Filter questions for the review section
  const filteredQuestions = questions
    .map((q, originalIndex) => {
      const selected = userAnswers[originalIndex] ?? null;
      const isCorrect = selected === q.correctAnswerIndex;
      const isSkipped = selected === null;
      return {
        question: q,
        originalIndex,
        selected,
        isCorrect,
        isSkipped,
      };
    })
    .filter((item) => {
      if (filter === 'correct') return item.isCorrect;
      if (filter === 'wrong') return !item.isCorrect;
      return true;
    });

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-6 p-3.5 sm:p-6 pb-20 w-full scroll-smooth relative"
    >

      {/* ── 1. PROMINENT TOP SUMMARY CARD ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel-elevated relative overflow-hidden rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-white/10 w-full"
      >
        {/* Ambient background glow */}
        <div
          className={`absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isPassed ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />

        {/* Header Pill & Quiz Title */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Examination Completed
              </span>
              <h3 className="font-display text-sm font-bold text-white line-clamp-1">
                {quizTitle}
              </h3>
            </div>
          </div>

          {/* Pass / Fail Status Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide border shadow-sm ${
              isPassed
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-glow-emerald'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-glow-rose'
            }`}
          >
            {isPassed ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Passed Exam (Criteria: ≥ {passMarkPercent}%)</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-rose-400" />
                <span>Did Not Pass (Required: ≥ {passMarkPercent}%)</span>
              </>
            )}
          </div>
        </div>

        {/* Central Score Highlight: "X / Y Questions Correct" */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-1">
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Target className="h-3.5 w-3.5 text-violet-400" />
                <span>Overall Performance Result</span>
              </div>

              {/* HUGE Prominent Display: Correct / Total */}
              <div className="flex items-baseline justify-center sm:justify-start gap-2.5">
                <span
                  className={`font-display text-4xl sm:text-6xl font-black font-mono tracking-tight ${
                    isPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {score}
                </span>
                <span className="font-display text-2xl sm:text-3xl font-bold text-slate-500 font-mono">
                  / {total}
                </span>
                <span className="ml-1 text-base sm:text-lg font-bold text-slate-200">
                  Questions Correct
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isPassed
                ? `Congratulations! You answered ${score} out of ${total} questions correctly (${percentage}% accuracy). Review your question analysis below.`
                : `You answered ${score} out of ${total} questions correctly (${percentage}% accuracy). Take a look at the comprehensive answer key and explanations below to strengthen weak concepts.`}
            </p>

            {/* Tri-color Segmented Score Bar */}
            <div className="space-y-1.5 pt-2 max-w-xl">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-white/5 flex">
                {score > 0 && (
                  <div
                    style={{ width: `${correctPercent}%` }}
                    className="h-full bg-emerald-500 shadow-sm"
                    title={`Correct: ${score}`}
                  />
                )}
                {wrongCount > 0 && (
                  <div
                    style={{ width: `${wrongPercent}%` }}
                    className="h-full bg-rose-500 shadow-sm"
                    title={`Wrong: ${wrongCount}`}
                  />
                )}
                {skippedCount > 0 && (
                  <div
                    style={{ width: `${skippedPercent}%` }}
                    className="h-full bg-slate-600 shadow-sm"
                    title={`Skipped: ${skippedCount}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span className="text-emerald-400 font-semibold">{score} Correct ({correctPercent}%)</span>
                <span className="text-rose-400 font-semibold">{wrongCount} Wrong ({wrongPercent}%)</span>
                {skippedCount > 0 && <span className="text-slate-400">{skippedCount} Skipped</span>}
              </div>
            </div>
          </div>

          {/* Right Circular Progress Ring */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <CircularProgress percentage={percentage} passed={isPassed} size={140} strokeWidth={11} />
          </div>
        </div>

        {/* 4 Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Correct</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-2xl font-black text-white font-mono">{score}</span>
              <span className="text-xs text-slate-400 font-mono">/ {total}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.08] p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-rose-400 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Wrong</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-2xl font-black text-white font-mono">{wrongCount}</span>
              <span className="text-xs text-slate-400 font-mono">/ {total}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-500/25 bg-slate-500/[0.08] p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
              <MinusCircle className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Skipped</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-2xl font-black text-white font-mono">{skippedCount}</span>
              <span className="text-xs text-slate-400 font-mono">/ {total}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.08] p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-violet-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Duration</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-2xl font-black text-white font-mono">
                {formatDuration(timeSpentSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Retake Quiz, New Assessment, Back to Dashboard, Export PDF */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRetake}
              className="glass-button-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-glow-violet hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake Quiz (Reshuffle)</span>
            </button>

            {onNewQuiz && (
              <button
                type="button"
                onClick={onNewQuiz}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 text-violet-400" />
                <span>New Assessment</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              disabled={isExporting}
              className={`flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-2.5 text-xs sm:text-sm font-bold text-violet-200 hover:bg-violet-600/30 shadow-glow-violet transition-all cursor-pointer ${
                isExporting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                  <span>Compiling PDF Report…</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-violet-300" />
                  <span>Export PDF Report</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* ── 2. FULL ANSWER REVIEW SECTION ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Review Header & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h3 className="font-display text-base font-bold text-white">Full Answer Review</h3>
            <span className="text-xs text-slate-400">({questions.length} Questions Evaluated)</span>
          </div>

          {/* Filter Tabs: All | Correct | Wrong */}
          <div className="flex rounded-xl bg-[#050916] p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                filter === 'correct'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Correct ({score})
            </button>
            <button
              type="button"
              onClick={() => setFilter('wrong')}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all cursor-pointer ${
                filter === 'wrong'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Wrong ({wrongCount + skippedCount})
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {filteredQuestions.map((item) => {
            const { question: q, originalIndex, selected, isCorrect, isSkipped } = item;
            const userLetter = selected !== null ? OPTION_LETTERS[selected] : null;
            const correctLetter = OPTION_LETTERS[q.correctAnswerIndex];

            return (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`glass-panel rounded-2xl p-5 sm:p-6 space-y-4 border ${
                  isCorrect
                    ? 'border-emerald-500/25 hover:border-emerald-500/40'
                    : isSkipped
                    ? 'border-slate-500/25'
                    : 'border-rose-500/25 hover:border-rose-500/40'
                }`}
              >
                {/* Header: Question Number, Subtitle, Status Tag, Marks */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-violet-300 bg-violet-500/15 border border-violet-500/30 rounded-lg px-2.5 py-1">
                      Question #{originalIndex + 1}
                    </span>
                    {q.subtitle && (
                      <span className="text-xs text-slate-400 font-medium">{q.subtitle}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {isCorrect ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        <Check className="h-3 w-3 text-emerald-400" />
                        Correct
                      </span>
                    ) : isSkipped ? (
                      <span className="flex items-center gap-1 rounded-full bg-slate-500/15 border border-slate-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                        <MinusCircle className="h-3 w-3 text-slate-400" />
                        Not answered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                        <X className="h-3 w-3 text-rose-400" />
                        Wrong
                      </span>
                    )}

                    {/* Marks Earned */}
                    <span className="rounded-lg bg-white/[0.05] border border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                      {isCorrect ? `${q.marks || 1}/${q.marks || 1} Mark` : `0/${q.marks || 1} Marks`}
                    </span>
                  </div>
                </div>

                {/* Question Body */}
                <h4 className="font-display text-sm sm:text-base font-semibold text-white leading-relaxed">
                  {q.question}
                </h4>

                {/* All 4 Options with Visual Color Coding */}
                <div className="space-y-2 pt-1">
                  {q.options.map((optText, optIdx) => {
                    const isTheCorrectOption = optIdx === q.correctAnswerIndex;
                    const isTheUserWrongChoice = !isCorrect && selected === optIdx;

                    let cardClass = 'border-white/10 bg-white/[0.02] text-slate-300';
                    let letterClass = 'bg-white/[0.06] text-slate-400 border-white/10';
                    let icon = null;

                    if (isTheCorrectOption) {
                      cardClass = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/40';
                      letterClass = 'bg-emerald-600 text-white shadow-sm';
                      icon = <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
                    } else if (isTheUserWrongChoice) {
                      cardClass = 'border-rose-500/60 bg-rose-500/15 text-rose-100 ring-1 ring-rose-500/40';
                      letterClass = 'bg-rose-600 text-white shadow-sm';
                      icon = <XCircle className="h-4 w-4 text-rose-400 shrink-0" />;
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-colors ${cardClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold border ${letterClass}`}
                          >
                            {OPTION_LETTERS[optIdx]}
                          </span>
                          <span className="font-medium">{optText}</span>
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>

                {/* Labels: Your Answer vs Correct Answer */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Your answer:</span>
                    {userLetter ? (
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          isCorrect ? 'text-emerald-300 bg-emerald-500/10' : 'text-rose-300 bg-rose-500/10'
                        }`}
                      >
                        Option {userLetter} ({q.options[selected!]})
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">None (Skipped)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Correct answer:</span>
                    <span className="font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Option {correctLetter} ({q.options[q.correctAnswerIndex]})
                    </span>
                  </div>
                </div>

                {/* Academic Explanation Box */}
                {q.explanation && (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3.5 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-violet-300 font-semibold">
                      <HelpCircle className="h-3.5 w-3.5 text-violet-400" />
                      <span>AI Academic Rationale:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-5">{q.explanation}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
