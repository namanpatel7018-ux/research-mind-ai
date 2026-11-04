import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, ShieldCheck, Mail, LogOut, ArrowRight, Sparkles,
  ExternalLink, Settings, Copy, Check, Lock, Cpu,
  Database, FileText, CheckCircle2, Layers, MessageSquare,
  BookOpen, Laptop, Moon, Sun, Key, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { listFiles, listConversations, getSavedAnswers, UploadedFile, Conversation, SavedAnswer } from '../lib/api';
import { useToast } from '../components/ui/Toast';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, systemTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Load user workspace stats
  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const [fList, cList, aList] = await Promise.all([
          listFiles().catch(() => []),
          listConversations().catch(() => []),
          getSavedAnswers().catch(() => []),
        ]);
        if (mounted) {
          setFiles(fList || []);
          setConversations(cList || []);
          setSavedAnswers(aList || []);
        }
      } catch (e) {
        console.error('Failed to load profile stats:', e);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const totalPages = files.reduce((acc, f) => acc + (f.page_count || 1), 0);
  const totalChunks = files.reduce((acc, f) => acc + (f.chunk_count || 0), 0);

  const handleCopyEmail = () => {
    if (!user?.email) return;
    navigator.clipboard.writeText(user.email);
    setCopiedEmail(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyId = () => {
    const idToCopy = user?.email ? `usr_${btoa(user.email).slice(0, 12).toLowerCase()}` : 'usr_auth_pro';
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    toast.success('Researcher ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out of session.');
    navigate('/login', { replace: true });
  };

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Researcher';
  const displayHandle = user?.email?.split('@')[0]?.toLowerCase() || 'researcher';
  const initial = (displayName || 'R')[0].toUpperCase();

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar pb-16">
      
      {/* ── 1. Top Header Banner (Uniform across all screens) ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Researcher Profile &amp; Security Credentials
              </h1>
              <span className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified Identity
              </span>
              <span className="rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-mono">
                PRO Tier
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Review authenticated credentials, active session tokens, research privileges, and workspace analytics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Settings &amp; Preferences</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── 2. Main Content Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── LEFT COLUMN: Identity & Credentials Card ──────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Identity Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-6 shadow-sm dark:shadow-xl backdrop-blur-xl transition-colors space-y-6">
            
            {/* Avatar & Core Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-slate-100 dark:border-white/10">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-cyan-500/20 p-1 shadow-lg flex items-center justify-center">
                {user?.picture ? (
                  <img src={user.picture} alt="Profile" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-300 font-display">
                    {initial}
                  </span>
                )}
                <div className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0A1024]" title="Active & Authenticated" />
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </h2>
                  <span className="rounded-md bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    PRO
                  </span>
                </div>
                
                <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  @{displayHandle}
                </p>

                <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email || 'Authenticated Researcher'}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 rounded transition cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Credential Attributes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Account Role</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Principal AI Researcher</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Security State</span>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verified &amp; Encrypted</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Authentication Protocol</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">JWT SHA-256 Bearer</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Researcher ID</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <span>{user?.email ? `usr_${btoa(user.email).slice(0, 10).toLowerCase()}` : 'usr_auth_pro'}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 rounded transition cursor-pointer"
                    title="Copy Full ID"
                  >
                    {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/dashboard/settings"
                className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Edit Profile &amp; Preferences in Settings</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Device & Environment Diagnostics Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-5 shadow-sm dark:shadow-xl backdrop-blur-xl transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                <Laptop className="h-4 w-4 text-indigo-500" />
                <span>Active Device &amp; OS Detection</span>
              </div>
              <span className="rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                Live Sensor
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Selected Theme</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white capitalize">
                  {theme === 'system' ? <Laptop className="h-3.5 w-3.5 text-indigo-500" /> : theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-cyan-500" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
                  <span>{theme} Mode</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">OS Hardware Mode</span>
                <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                  {systemTheme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  <span>{systemTheme} Mode</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Research Mind AI continuously monitors your operating system’s color scheme query. When set to <strong className="text-slate-800 dark:text-slate-200">System Auto</strong>, the workspace adapts instantaneously when you toggle Windows/macOS theme settings.
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Privileges, Compute & Workspace ─────────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Compute & Research Privileges Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-6 shadow-sm dark:shadow-xl backdrop-blur-xl transition-colors space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Research Privileges &amp; AI Compute Stack
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Authorized permissions across vector stores, neural models, and synthesis pipelines
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                Full Read/Write
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Vector Storage Engine</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Qdrant Vector RAG with isolated collection indexing, dense embeddings &amp; cosine similarity ranking.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Index permissions active</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">LLM Reasoning Stack</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Google Gemini 2.0 Flash + Groq Llama 3.3 70B with strict academic grounding and hallucination guardrails.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Sub-second inference active</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Citation Lineage Engine</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Mathematical proof &amp; multi-source cross-verification with exact PDF page-number anchors.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Strict grounding active</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Export &amp; Publication Suite</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Unlimited synthesis export to PowerPoint (.pptx), publication PDFs, and formatted Markdown.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Export pipeline enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Workspace Activity Counters */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1024]/80 p-6 shadow-sm dark:shadow-xl backdrop-blur-xl transition-colors space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Workspace Analytics
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Real-time indices and persistent research assets associated with your researcher identity
                </p>
              </div>
              <Link
                to="/dashboard"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Full Dashboard</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Indexed Papers</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{files.length}</span>
                  <span className="text-[10px] text-slate-500">PDFs</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{totalPages} pages total</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Vector Chunks</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{totalChunks}</span>
                  <span className="text-[10px] text-slate-500">chunks</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Vector embeddings</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Conversations</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{conversations.length}</span>
                  <span className="text-[10px] text-slate-500">threads</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Persisted chats</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Saved Findings</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{savedAnswers.length}</span>
                  <span className="text-[10px] text-slate-500">notes</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Ready for export</p>
              </div>
            </div>

            {/* Quick Engine Jump Tiles */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Launch Research Workspace
              </span>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Link
                  to="/dashboard/chat"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                  <span>AI Chat</span>
                </Link>

                <Link
                  to="/dashboard/ai-summary"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:border-cyan-500/40 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <FileText className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Summary</span>
                </Link>

                <Link
                  to="/dashboard/literature-review"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Layers className="h-3.5 w-3.5 text-amber-500" />
                  <span>Lit Review</span>
                </Link>

                <Link
                  to="/dashboard/library"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Library</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
