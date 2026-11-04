import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, FileText, LayoutGrid, Search,
  Clock, ArrowRight, BookOpen, FileCheck, Presentation,
  Database, Layers, Activity, Sparkles, UploadCloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getActivityHistory, listFiles, listConversations, getSavedAnswers,
  ActivityRecord, UploadedFile, Conversation, SavedAnswer
} from '../lib/api';

/**
 * Returns a precise greeting based on the current real-time hour of the day:
 * - 05:00 to 11:59: Good morning
 * - 12:00 to 16:59: Good afternoon
 * - 17:00 to 04:59: Good evening
 * Strictly limited to these three real-time greetings (no Good night).
 */
function getRealTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
}

export function DashboardHomePage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic real-time greeting that stays accurate if left open
  const [greeting, setGreeting] = useState(() => getRealTimeGreeting());

  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getRealTimeGreeting());
    }, 30000); // sync every 30 seconds
    return () => clearInterval(timer);
  }, []);

  const rawName = user?.full_name?.trim() || user?.email?.split('@')[0] || '';
  const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).split(' ')[0] : 'Researcher';

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [acts, fList, cList, answers] = await Promise.all([
          getActivityHistory().catch(() => []),
          listFiles().catch(() => []),
          listConversations().catch(() => []),
          getSavedAnswers().catch(() => []),
        ]);
        setActivities(acts || []);
        setFiles(fList || []);
        setConversations(cList || []);
        setSavedAnswers(answers || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const totalPages = files.reduce((acc, f) => acc + (f.page_count || 1), 0);
  const totalChunks = files.reduce((acc, f) => acc + (f.chunk_count || 0), 0);

  return (
    <div className="flex flex-col gap-5 p-3.5 sm:p-6 pb-12">
      
      {/* ── 1. Top Header Banner (Uniform with other pages) ─────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 sm:py-4.5 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {greeting}, {firstName}
            </h1>
            <span className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Session
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Intelligent literature synthesis, grounded citation lineage, and vector analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/dashboard/chat"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>AI Research Chat</span>
          </Link>

          <Link
            to="/dashboard/library"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
          >
            <UploadCloud className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Upload Papers</span>
          </Link>
        </div>
      </section>

      {/* ── 2. Real-Time KPI Metrics ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 sm:p-5 backdrop-blur-md transition-all shadow-sm dark:shadow-lg hover:border-indigo-400/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Indexed Papers</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">{files.length}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">PDFs</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">{totalPages} pages indexed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 sm:p-5 backdrop-blur-md transition-all shadow-sm dark:shadow-lg hover:border-cyan-400/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vector Chunks</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">{totalChunks}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">embeddings</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Qdrant hybrid search</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 sm:p-5 backdrop-blur-md transition-all shadow-sm dark:shadow-lg hover:border-violet-400/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conversations</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">{conversations.length}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">threads</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Persisted research history</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 sm:p-5 backdrop-blur-md transition-all shadow-sm dark:shadow-lg hover:border-emerald-400/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saved Findings</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">{savedAnswers.length}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">notes</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">Ready for export</p>
        </div>
      </section>

      {/* ── 3. Research Modules Grid ──────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Research Engines &amp; Workspaces
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Select any engine to begin</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: AI Chat */}
          <Link
            to="chat"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-indigo-500/50 dark:hover:border-indigo-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                AI Research Chat
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Conversational literature analysis with strict grounded citations &amp; page verification.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 font-medium">
              <span>Start Chatting</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: AI Summary Engine */}
          <Link
            to="ai-summary"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-cyan-500/50 dark:hover:border-cyan-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition">
                AI Summary Engine
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Generate structured executive summaries, findings, and methodology breakdowns.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 font-semibold">
              <span>Summarize Paper</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 3: Literature Review */}
          <Link
            to="literature-review"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-amber-500/50 dark:hover:border-amber-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
                <Search className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition">
                Literature Review
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Synthesize multiple papers into thematic comparative matrices and research gap tables.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 font-semibold">
              <span>Synthesize Review</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 4: Paper Comparison */}
          <Link
            to="comparison"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-emerald-500/50 dark:hover:border-emerald-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                Compare Papers
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Side-by-side contrast of models, dataset architectures, and benchmark results.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 font-semibold">
              <span>Compare Papers</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 5: Convert to PPT */}
          <Link
            to="convert-ppt"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-orange-500/50 dark:hover:border-orange-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition">
                <Presentation className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-300 transition">
                Convert to PPT
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Transform topics and papers into structured presentation slide decks automatically.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-300 font-semibold">
              <span>Generate Deck</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 6: Quiz Generator */}
          <Link
            to="quiz"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-violet-500/50 dark:hover:border-violet-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition">
                Quiz Generator
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Generate adaptive exam questions with answer keys to test retention and revision.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-300 font-semibold">
              <span>Take Quiz</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 7: Generate PDF */}
          <Link
            to="generate-pdf"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-blue-500/50 dark:hover:border-blue-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
                <FileCheck className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
                Generate PDF
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Compile notes and evidence summaries into publication-ready formatted PDFs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 font-semibold">
              <span>Export PDF</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 8: Document Library */}
          <Link
            to="library"
            className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 hover:border-teal-500/50 dark:hover:border-teal-400/40 hover:shadow-md dark:hover:shadow-glow p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm dark:shadow-lg"
          >
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300 transition">
                Document Library
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">
                Upload PDFs, preview embedded pages, inspect chunks, and manage stored findings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-300 font-semibold">
              <span>View Library</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── 4. Recent Research Activity ─────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-4 sm:p-5 shadow-sm dark:shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 dark:border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Recent Workspace Activity
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Real-time log</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-6 w-6 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
            No recent activity recorded yet. Start by uploading a PDF or querying the AI Research Chat!
          </div>
        ) : (
          <div className="space-y-1.5">
            {activities.slice(0, 5).map((act, index) => {
              // Semantic badge color based on activity type for clean visual hierarchy
              const badgeStyles: Record<string, string> = {
                LITERATURE: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
                QUIZ_COMPLETED: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
                QUIZ: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
                SUMMARY: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
                CHAT: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
                UPLOAD: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
              };
              const badgeClass = badgeStyles[act.type] || 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25';

              return (
                <div
                  key={act.id || index}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-white/[0.04] bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-3.5 py-2.5 transition text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`w-32 shrink-0 text-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${badgeClass}`}>
                      {act.type}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{act.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0 pl-2">
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
