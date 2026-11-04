import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Loader2, Plus, Trash2, Upload, Library,
  ExternalLink, CheckCircle2, Bookmark, MessageSquare,
  Sparkles, BookOpen, Search, Download,
  Eye, Calendar, Filter, X, Copy, Check, FileCheck, Layers
} from 'lucide-react';
import {
  listFiles, uploadResearchFile, deleteDocument, UploadedFile,
  getSavedAnswers, deleteSavedAnswer, SavedAnswer,
  listConversations, Conversation,
  getSummaryHistory, SummaryRecord,
  getLiteratureHistory, LiteratureRecord
} from '../lib/api';
import { DocumentViewerModal } from '../components/ui/DocumentViewerModal';
import { formatMarkdown } from '../lib/formatMarkdown';

type TabType = 'all' | 'documents' | 'saved_answers' | 'chats' | 'summaries' | 'literature';

export function LibraryPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Data sets
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [summaries, setSummaries] = useState<SummaryRecord[]>([]);
  const [literatureReviews, setLiteratureReviews] = useState<LiteratureRecord[]>([]);

  // Modals & States
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{ filename: string; page: number } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<SavedAnswer | null>(null);
  const [modalCopied, setModalCopied] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [f, sa, c, s, lit] = await Promise.all([
        listFiles().catch(() => []),
        getSavedAnswers().catch(() => []),
        listConversations().catch(() => []),
        getSummaryHistory().catch(() => []),
        getLiteratureHistory().catch(() => [])
      ]);
      setFiles(f);
      setSavedAnswers(sa);
      setConversations(c);
      setSummaries(s);
      setLiteratureReviews(lit);
    } catch (err) {
      console.error('Failed to load library resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.name.match(/\.(pdf|docx|txt|md)$/i)) return;
    setUploading(true);
    setUploadStage('Uploading document to secure workspace...');
    try {
      setTimeout(() => setUploadStage('Parsing pages with PyMuPDF...'), 400);
      setTimeout(() => setUploadStage('Generating structure-aware chunks...'), 900);
      setTimeout(() => setUploadStage('Indexing vectors into Qdrant...'), 1400);
      const res = await uploadResearchFile(file);
      setUploadStage(`Successfully indexed! ${res.page_count}p, ${res.chunk_count} chunks.`);
      loadAll();
      setTimeout(() => setUploadStage(''), 3500);
    } catch (err: any) {
      setUploadStage(`Error: ${err?.response?.data?.detail ?? 'Failed to index file.'}`);
      setTimeout(() => setUploadStage(''), 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete "${filename}" and purge its vector index?`)) return;
    setDeletingId(filename);
    try {
      await deleteDocument(filename);
      setFiles(f => f.filter(item => item.filename !== filename));
    } catch (err) {
      alert('Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAnswer = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this saved answer from your library?')) return;
    setDeletingId(id);
    try {
      await deleteSavedAnswer(id);
      setSavedAnswers(sa => sa.filter(item => item.id !== id));
      if (selectedAnswer?.id === id) setSelectedAnswer(null);
    } catch (err) {
      alert('Failed to delete saved answer.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filtered views based on search query
  const q = searchQuery.toLowerCase().trim();

  const filteredFiles = useMemo(() => files.filter(f => !q || f.filename.toLowerCase().includes(q)), [files, q]);
  const filteredAnswers = useMemo(() => savedAnswers.filter(a => !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)), [savedAnswers, q]);
  const filteredChats = useMemo(() => conversations.filter(c => !q || c.title.toLowerCase().includes(q)), [conversations, q]);
  const filteredSummaries = useMemo(() => summaries.filter(s => !q || s.document_name.toLowerCase().includes(q)), [summaries, q]);
  const filteredLitReviews = useMemo(() => literatureReviews.filter(l => !q || (l.document_names && l.document_names.some(d => d.toLowerCase().includes(q)))), [literatureReviews, q]);
  const totalItemCount = files.length + savedAnswers.length + conversations.length + summaries.length + literatureReviews.length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-3.5 sm:p-5">
      
      {/* ── 1. Top Header Banner ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100/90 via-white/85 to-slate-100/90 dark:from-[#080E24]/90 dark:via-[#0C1535]/85 dark:to-[#080E24]/90 px-5 sm:px-6 py-4 shadow-md dark:shadow-2xl backdrop-blur-2xl shrink-0 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 shadow-glow-indigo">
            <Library className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white tracking-tight">Personal Research Library</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {totalItemCount} total assets indexed · Isolated to your authenticated workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {uploadStage && (
            <span className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium animate-pulse px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{uploadStage}</span>
            </span>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 transition cursor-pointer"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>{uploading ? 'Ingesting…' : 'Upload Document'}</span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* ── 2. Category Tabs & Search Controls ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Assets', count: totalItemCount },
            { id: 'documents', label: 'Documents', count: files.length },
            { id: 'saved_answers', label: 'Saved Answers', count: savedAnswers.length },
            { id: 'chats', label: 'Threads', count: conversations.length },
            { id: 'summaries', label: 'Summaries', count: summaries.length },
            { id: 'literature', label: 'Literature Reviews', count: literatureReviews.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                  : 'bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search within your library…"
            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0A0D16] pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm"
          />
        </div>
      </div>

      {/* ── 3. Main Content Panel ─────────────────────────────────────── */}
      <div className="glass-panel flex-1 overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-2xl min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <span className="text-xs">Synchronizing your research assets…</span>
          </div>
        ) : totalItemCount === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-glow-indigo">
              <Library className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-white">Your library is currently empty</p>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">Upload research papers, PDF files, or query the AI assistant to save research answers.</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="glass-button-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-glow-indigo cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Upload Document
            </button>
          </div>
        ) : (
          <div className="space-y-7">
            {/* 1. Saved Answers Section */}
            {(activeTab === 'all' || activeTab === 'saved_answers') && filteredAnswers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  <Bookmark className="h-4 w-4" />
                  <span>Saved AI Answers ({filteredAnswers.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAnswers.map(ans => (
                    <div
                      key={ans.id}
                      onClick={() => setSelectedAnswer(ans)}
                      className="glass-card-interactive group flex flex-col justify-between rounded-2xl p-4.5 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-white group-hover:text-indigo-200 truncate">
                            {ans.title}
                          </span>
                          <button
                            onClick={e => handleDeleteAnswer(ans.id, e)}
                            title="Remove saved answer"
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-sans">
                          {ans.content.replace(/[#*`_]/g, '')}
                        </p>
                      </div>
                      <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">{new Date(ans.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 text-indigo-400 font-semibold group-hover:text-indigo-300 transition">
                          <Eye className="h-3.5 w-3.5" /> Read Full
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Documents Section */}
            {(activeTab === 'all' || activeTab === 'documents') && filteredFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <FileText className="h-4 w-4" />
                  <span>Corpus Documents ({filteredFiles.length})</span>
                </div>
                <div className="grid gap-2.5">
                  {filteredFiles.map(f => (
                    <div
                      key={f.filename}
                      onClick={() => setViewerDoc({ filename: f.filename, page: 1 })}
                      className="glass-card-interactive flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-200">
                            {f.filename}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                            <span>{formatSize(f.size)}</span>
                            {f.page_count ? <span>· {f.page_count} pages</span> : null}
                            {f.chunk_count ? <span>· {f.chunk_count} vector chunks</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexed in Qdrant
                        </span>
                        <button
                          onClick={e => handleDeleteDocument(f.filename, e)}
                          disabled={deletingId === f.filename}
                          title="Delete document and purge vectors"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          {deletingId === f.filename ? <Loader2 className="h-4 w-4 animate-spin text-rose-400" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Threads / Chats Section */}
            {(activeTab === 'all' || activeTab === 'chats') && filteredChats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
                  <MessageSquare className="h-4 w-4" />
                  <span>Research Threads ({filteredChats.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredChats.map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate('/dashboard/chat')}
                      className="glass-card-interactive group rounded-2xl p-4 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-violet-200">
                        {c.title}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                        <span className="font-mono">{new Date(c.updated_at).toLocaleDateString()}</span>
                        <span className="text-violet-400 font-semibold group-hover:text-violet-300 transition">Open Thread →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Summaries Section */}
            {(activeTab === 'all' || activeTab === 'summaries') && filteredSummaries.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Generated Summaries ({filteredSummaries.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSummaries.map(s => (
                    <div
                      key={s.id}
                      onClick={() => navigate('/dashboard/ai-summary')}
                      className="glass-card-interactive group rounded-2xl p-4 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-200">
                        {s.document_name}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                        <span className="font-mono">{new Date(s.created_at).toLocaleDateString()}</span>
                        <span className="text-cyan-400 font-semibold group-hover:text-cyan-300 transition">View Summary →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Literature Reviews Section */}
            {(activeTab === 'all' || activeTab === 'literature') && filteredLitReviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <BookOpen className="h-4 w-4" />
                  <span>Literature Reviews ({filteredLitReviews.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredLitReviews.map(lit => (
                    <div
                      key={lit.id}
                      onClick={() => navigate('/dashboard/literature-review')}
                      className="glass-card-interactive group rounded-2xl p-4 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-200">
                        {(lit.document_names && lit.document_names.join(', ')) || 'Literature Review'}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                        <span className="font-mono">{new Date(lit.created_at).toLocaleDateString()} · {lit.document_names?.length || 0} papers</span>
                        <span className="text-amber-400 font-semibold group-hover:text-amber-300 transition">Open Review →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. Saved Answer Detail Modal ───────────────────────────────── */}
      {selectedAnswer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4">
          <div className="flex flex-col max-h-[85vh] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#090F24]/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4 bg-slate-50 dark:bg-[#0C142E]/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                  <Bookmark className="h-4 w-4" />
                </div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">{selectedAnswer.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAnswer(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 text-xs sm:text-sm text-slate-900 dark:text-slate-200 space-y-4 leading-relaxed">
              <div
                className="prose-research"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(selectedAnswer.content) }}
              />

              {selectedAnswer.sources && selectedAnswer.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-mono">Sources Cited</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnswer.sources.map((s, idx) => (
                      <span key={idx} className="rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                        {typeof s === 'string' ? s : `${s.document_name} (Page ${s.page_number})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 px-6 py-3.5 bg-slate-50 dark:bg-[#0C142E]/90">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Saved on {new Date(selectedAnswer.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAnswer.content);
                    setModalCopied(true);
                    setTimeout(() => setModalCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-sm"
                >
                  {modalCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{modalCopied ? 'Copied' : 'Copy Content'}</span>
                </button>
                <button
                  onClick={() => setSelectedAnswer(null)}
                  className="glass-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-glow-indigo cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Document Viewer Modal ───────────────────────────────────── */}
      {viewerDoc && (
        <DocumentViewerModal
          filename={viewerDoc.filename}
          initialPage={viewerDoc.page}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  );
}
