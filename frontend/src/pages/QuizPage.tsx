import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  generateQuiz,
  generateQuizJSON,
  listFiles,
  UploadedFile,
  downloadBlob,
  submitQuizResult,
  InteractiveQuizQuestion,
  exportQuizReportPDF,
} from '../lib/api';
import { shuffleQuestions } from '../data/sampleQuestions';
import {
  QuizActiveView,
  QuizResultView,
  QuizConfigView,
  QuizMode,
  QuestionSource,
} from '../components/quiz';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

type QuizScreenState = 'config' | 'playing' | 'result';

const STORAGE_KEY = 'researchmind_active_quiz_v1';

export function QuizPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // ── Mode & Screen Navigation ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<QuizMode>('interactive');
  const [screenState, setScreenState] = useState<QuizScreenState>('config');

  // ── Configuration State ────────────────────────────────────────────────
  const [sourceType, setSourceType] = useState<QuestionSource>('custom_topic');
  const [topic, setTopic] = useState('Deep Learning & RAG Architectures');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [passMarkPercent, setPassMarkPercent] = useState(40);
  const [timerMinutes, setTimerMinutes] = useState(10); // 10 min default
  const [includeAnswersPDF, setIncludeAnswersPDF] = useState(false);

  // ── In-Flight Quiz State ───────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState<InteractiveQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [quizTitle, setQuizTitle] = useState('Artificial Intelligence Assessment');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  // ── Loading & Async States ─────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [error, setError] = useState('');
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Load uploaded files from library
  useEffect(() => {
    listFiles()
      .then((f) => {
        setFiles(f);
        if (f.length > 0) setSelectedDoc(f[0].filename);
      })
      .catch(() => {});
  }, []);

  // Check for saved quiz attempt in sessionStorage on initial mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.questions && parsed.questions.length > 0) {
          setHasSavedSession(true);
        }
      }
    } catch {}
  }, []);

  // Calculate final score
  const calculateScore = useCallback(() => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      const selected = userAnswers[idx];
      if (selected === q.correctAnswerIndex) {
        score += q.marks || 1;
      }
    });
    return score;
  }, [quizQuestions, userAnswers]);

  // Submit quiz
  const handleSubmitQuiz = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const finalScore = calculateScore();
    const total = quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
    const percentage = Math.round((finalScore / total) * 100);
    const passed = percentage >= passMarkPercent;

    // Build structured answer records for backend saving
    const answersRecord = quizQuestions.map((q, idx) => {
      const selected = userAnswers[idx] ?? null;
      return {
        questionId: q.id,
        question: q.question,
        selectedOption: selected,
        correctOption: q.correctAnswerIndex,
        isCorrect: selected === q.correctAnswerIndex,
        explanation: q.explanation,
      };
    });

    try {
      await submitQuizResult({
        userId: user?.email || 'researcher@example.com',
        score: finalScore,
        total,
        percentage,
        passed,
        timeSpentSeconds,
        topic: quizTitle,
        answers: answersRecord,
      });
      toast.success(`Assessment submitted! Score: ${finalScore}/${total} (${percentage}%)`);
    } catch (err) {
      // Still show results even if network fails
      console.warn('Could not persist quiz record to server:', err);
    } finally {
      sessionStorage.removeItem(STORAGE_KEY);
      setSubmitting(false);
      setScreenState('result');
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [
    submitting,
    calculateScore,
    quizQuestions,
    userAnswers,
    passMarkPercent,
    user?.email,
    timeSpentSeconds,
    quizTitle,
    toast,
  ]);

  const handleAutoSubmitOnTimeout = useCallback(() => {
    toast.warning('Time limit expired! Auto-submitting assessment now…');
    handleSubmitQuiz();
  }, [toast, handleSubmitQuiz]);

  // Timer countdown hook
  useEffect(() => {
    if (screenState === 'playing' && timeLeftSeconds !== null) {
      timerRef.current = window.setInterval(() => {
        setTimeSpentSeconds((prev) => prev + 1);
        setTimeLeftSeconds((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [screenState, timeLeftSeconds, handleAutoSubmitOnTimeout]);

  // Persist playing state to sessionStorage
  useEffect(() => {
    if (screenState === 'playing' && quizQuestions.length > 0) {
      try {
        const payload = {
          questions: quizQuestions,
          currentIndex,
          userAnswers,
          quizTitle,
          passMarkPercent,
          timerMinutes,
          timeLeftSeconds,
          timeSpentSeconds,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    }
  }, [
    screenState,
    quizQuestions,
    currentIndex,
    userAnswers,
    quizTitle,
    passMarkPercent,
    timerMinutes,
    timeLeftSeconds,
    timeSpentSeconds,
  ]);

  // Restore saved quiz session
  const handleResumeSession = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setQuizQuestions(p.questions || []);
        setCurrentIndex(p.currentIndex || 0);
        setUserAnswers(p.userAnswers || {});
        setQuizTitle(p.quizTitle || 'Resumed Assessment');
        setPassMarkPercent(p.passMarkPercent || 40);
        setTimerMinutes(p.timerMinutes || 0);
        setTimeLeftSeconds(p.timeLeftSeconds ?? null);
        setTimeSpentSeconds(p.timeSpentSeconds || 0);
        setScreenState('playing');
        setHasSavedSession(false);
        toast.info('Resumed previous quiz progress.');
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      setHasSavedSession(false);
    }
  };

  const handleDiscardSavedSession = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setHasSavedSession(false);
    toast.info('Cleared previously saved session.');
  };

  // ── Launching an Interactive Quiz ──────────────────────────────────────
  const handleStartInteractiveQuiz = async () => {
    setError('');
    setLoading(true);

    try {
      let questionsToLoad: InteractiveQuizQuestion[] = [];
      let calculatedTitle = 'AI & Deep Learning Assessment';
      const questionCount = Math.max(3, Math.min(50, Number(numQuestions) || 10));

      if (sourceType === 'custom_topic') {
        // Generate live questions via AI JSON endpoint
        calculatedTitle = `Quiz: ${topic.trim()}`;
        const res = await generateQuizJSON(topic.trim(), undefined, questionCount);
        if (!res.questions || res.questions.length === 0) {
          throw new Error('AI could not formulate questions for this topic. Please try again.');
        }
        questionsToLoad = res.questions.map((q, idx) => ({
          id: idx + 1,
          subtitle: q.subtitle || 'AI Generated MCQ',
          question: q.question,
          options: q.options,
          correctAnswerIndex: ['A', 'B', 'C', 'D'].indexOf(q.correct) >= 0 ? ['A', 'B', 'C', 'D'].indexOf(q.correct) : 0,
          marks: 1,
          explanation: q.explanation || 'Detailed AI academic rationale.',
        }));
      } else if (sourceType === 'document_corpus') {
        // Generate live questions from uploaded PDF/document
        if (!selectedDoc) throw new Error('Please select an indexed document from your library.');
        calculatedTitle = `Exam: ${selectedDoc.replace(/\.[^.]+$/, '')}`;
        const res = await generateQuizJSON(topic || selectedDoc, selectedDoc, questionCount);
        if (!res.questions || res.questions.length === 0) {
          throw new Error('Failed to extract questions from document.');
        }
        questionsToLoad = res.questions.map((q, idx) => ({
          id: idx + 1,
          subtitle: q.subtitle || selectedDoc,
          question: q.question,
          options: q.options,
          correctAnswerIndex: ['A', 'B', 'C', 'D'].indexOf(q.correct) >= 0 ? ['A', 'B', 'C', 'D'].indexOf(q.correct) : 0,
          marks: 1,
          explanation: q.explanation || 'Detailed AI document citation rationale.',
        }));
      }

      setQuizQuestions(questionsToLoad);
      setQuizTitle(calculatedTitle);
      setCurrentIndex(0);
      setUserAnswers({});
      setTimeSpentSeconds(0);
      setTimeLeftSeconds(timerMinutes > 0 ? timerMinutes * 60 : null);
      setScreenState('playing');
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success(`Loaded ${questionsToLoad.length} questions. You may begin!`);
    } catch (err: any) {
      let msg = 'Failed to load quiz. Please try again.';
      try {
        const text = await err?.response?.data?.text?.();
        msg = JSON.parse(text)?.detail ?? msg;
      } catch {
        if (err.message) msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Quiz Navigation Handlers ───────────────────────────────────────────
  const handleSelectOption = (qIdx: number, optIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    if (index >= 0 && index < quizQuestions.length) {
      setCurrentIndex(index);
    }
  };

  // Retake quiz (re-shuffles questions)
  const handleRetake = () => {
    const reshuffled = shuffleQuestions(quizQuestions);
    setQuizQuestions(reshuffled);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeSpentSeconds(0);
    setTimeLeftSeconds(timerMinutes > 0 ? timerMinutes * 60 : null);
    sessionStorage.removeItem(STORAGE_KEY);
    setScreenState('playing');
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    toast.info('Questions reshuffled. Good luck!');
  };

  // Back to Dashboard / Config
  const handleBackToDashboard = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/dashboard');
  };

  // Start a fresh new quiz configuration
  const handleNewQuiz = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setScreenState('config');
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // ── Certified Evaluation PDF Report Export Handler ─────────────────────
  const handleExportResultPDF = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    try {
      const finalScore = calculateScore();
      const total = quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
      const percentage = Math.round((finalScore / total) * 100);
      const passed = percentage >= passMarkPercent;
      const candidateName =
        (user as any)?.name ||
        (user as any)?.full_name ||
        (user?.email ? user.email.split('@')[0] : 'Researcher');

      const questionItems = quizQuestions.map((q, idx) => {
        const sel = userAnswers[idx] ?? null;
        return {
          id: q.id,
          subtitle: q.subtitle || '',
          question: q.question,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          marks: q.marks || 1,
          explanation: q.explanation || '',
          selectedOption: sel,
          isCorrect: sel === q.correctAnswerIndex,
        };
      });

      const blob = await exportQuizReportPDF({
        quizTitle,
        candidateName,
        score: finalScore,
        total,
        percentage,
        passed,
        passMarkPercent,
        timeSpentSeconds,
        questions: questionItems,
      });

      const safeName = quizTitle.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 40) || 'assessment';
      downloadBlob(blob, `assessment_report_${safeName}.pdf`);
      toast.success('Certified evaluation report compiled and downloaded!');
    } catch (err: any) {
      console.error('Failed to export PDF report:', err);
      toast.error('Failed to compile PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // ── PDF Generator Handler (Preserves original export capability) ───────
  const handleGeneratePDF = async () => {
    setLoading(true);
    setError('');
    setPdfDone(false);
    try {
      const questionCount = Math.max(3, Math.min(50, Number(numQuestions) || 10));
      const blob = await generateQuiz(
        sourceType === 'custom_topic' ? topic.trim() : '',
        sourceType === 'document_corpus' ? selectedDoc : undefined,
        questionCount,
        includeAnswersPDF
      );

      const name =
        sourceType === 'custom_topic'
          ? topic.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 40)
          : (selectedDoc || 'assessment').replace(/\.[^.]+$/, '');
      downloadBlob(blob, `quiz_${name || 'assessment'}.pdf`);
      setPdfDone(true);
      toast.success('Quiz PDF compiled and downloaded.');
    } catch (e: any) {
      let msg = 'Failed to generate PDF.';
      try {
        const text = await e?.response?.data?.text?.();
        msg = JSON.parse(text)?.detail ?? msg;
      } catch {}
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: PLAYING SCREEN (1 Question at a time)
  // ─────────────────────────────────────────────────────────────────────────
  if (screenState === 'playing') {
    return (
      <QuizActiveView
        questions={quizQuestions}
        currentIndex={currentIndex}
        userAnswers={userAnswers}
        onSelectOption={handleSelectOption}
        onNext={handleNext}
        onPrev={handlePrev}
        onJumpTo={handleJumpTo}
        onSubmit={handleSubmitQuiz}
        timeLeftSeconds={timeLeftSeconds}
        quizTitle={quizTitle}
        isSubmitting={submitting}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: RESULT SCREEN (Top Summary + Full Review)
  // ─────────────────────────────────────────────────────────────────────────
  if (screenState === 'result') {
    const finalScore = calculateScore();
    const total = quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);

    return (
      <QuizResultView
        questions={quizQuestions}
        userAnswers={userAnswers}
        score={finalScore}
        total={total}
        passMarkPercent={passMarkPercent}
        timeSpentSeconds={timeSpentSeconds}
        onRetake={handleRetake}
        onBackToDashboard={handleBackToDashboard}
        onNewQuiz={handleNewQuiz}
        quizTitle={quizTitle}
        onExportPDF={handleExportResultPDF}
        isExporting={exportingPDF}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: CONFIG & LAUNCHER SCREEN (Inside the Portal)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <QuizConfigView
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      hasSavedSession={hasSavedSession}
      onResumeSession={handleResumeSession}
      onDiscardSavedSession={handleDiscardSavedSession}
      sourceType={sourceType}
      setSourceType={setSourceType}
      topic={topic}
      setTopic={setTopic}
      files={files}
      selectedDoc={selectedDoc}
      setSelectedDoc={setSelectedDoc}
      numQuestions={numQuestions}
      setNumQuestions={setNumQuestions}
      passMarkPercent={passMarkPercent}
      setPassMarkPercent={setPassMarkPercent}
      timerMinutes={timerMinutes}
      setTimerMinutes={setTimerMinutes}
      includeAnswersPDF={includeAnswersPDF}
      setIncludeAnswersPDF={setIncludeAnswersPDF}
      loading={loading}
      error={error}
      pdfDone={pdfDone}
      onStartInteractive={handleStartInteractiveQuiz}
      onGeneratePDF={handleGeneratePDF}
    />
  );
}
