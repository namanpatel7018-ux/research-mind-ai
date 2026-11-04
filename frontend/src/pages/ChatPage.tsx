import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import mermaid from 'mermaid';
import { Atom } from 'lucide-react';
import {
  sendChat,
  uploadResearchFile,
  listFiles,
  UploadedFile,
  listConversations,
  getConversation,
  deleteConversation,
  Conversation,
  saveAnswer,
  generatePDF,
  downloadBlob,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { DocumentViewerModal } from '../components/ui/DocumentViewerModal';
import {
  ChatSidebar,
  ChatHeader,
  ChatEmptyState,
  ChatMessageItem,
  ChatInputBar,
  CameraModal,
  ChatMessageData,
} from '../components/chat';

/**
 * Returns a precise greeting based on the current real-time hour of the day:
 * - 05:00 to 11:59: Good Morning
 * - 12:00 to 16:59: Good Afternoon
 * - 17:00 to 04:59: Good Evening
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

export function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic real-time greeting (Good Morning, Good Afternoon, Good Evening)
  const [greeting, setGreeting] = useState(() => getRealTimeGreeting());

  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getRealTimeGreeting());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepThinkMode, setDeepThinkMode] = useState(false); // false = STRICT RAG, true = DEEPTHINK
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [viewerDoc, setViewerDoc] = useState<{
    filename: string;
    page: number;
    section?: string;
    evidence?: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const [actionLoadingIdx, setActionLoadingIdx] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'pdf' | 'save' | null>(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [savedMsgIdx, setSavedMsgIdx] = useState<number | null>(null);
  const [headerActionLoading, setHeaderActionLoading] = useState<boolean>(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Mermaid with a polished dark theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: {
        darkMode: true,
        background: '#070D1E',
        primaryColor: '#6366F1',
        primaryTextColor: '#F8FAFC',
        primaryBorderColor: '#4F46E5',
        lineColor: '#94A3B8',
        secondaryColor: '#1E293B',
        tertiaryColor: '#0F172A',
      },
    });
  }, []);

  // Run mermaid rendering for unrendered diagrams whenever messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        mermaid
          .run({
            querySelector: '.mermaid',
          })
          .catch((err) => {
            console.debug('Mermaid run notice:', err);
          });
      } catch (err) {
        console.debug('Mermaid execution notice:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [messages]);

  // Load user's files and conversations
  const loadConversations = async () => {
    try {
      const convs = await listConversations();
      setConversations(convs);
      return convs;
    } catch {
      return [];
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setLoading(true);
    try {
      const fullConv = await getConversation(convId);
      setActiveConvId(fullConv.id);
      if (fullConv.active_file) setActiveFile(fullConv.active_file);
      setDeepThinkMode(fullConv.mode === 'deepthink');

      const loadedMsgs: ChatMessageData[] = (fullConv.messages || []).map((m) => ({
        role: m.role,
        text: m.text,
        image: m.image,
        mode: m.mode,
        provider: m.provider,
        sources: m.sources,
        retrieval: m.retrieval,
        usage: m.usage,
        used_chunks_detail: m.used_chunks_detail,
      }));
      setMessages(loadedMsgs);
    } catch {
      // Failed to load conversation
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listFiles()
      .then((f) => {
        setFiles(f);
        if (f.length > 0 && !activeFile) setActiveFile(f[f.length - 1].filename);
      })
      .catch(() => {});

    loadConversations().then((convs) => {
      if (convs.length > 0 && !activeConvId) {
        handleSelectConversation(convs[0].id);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!showCamera) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    setCameraError('');
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError('Camera access denied.'));
  }, [showCamera]);

  const handleCopyAnswer = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const handleSaveAnswer = async (text: string, sources: any[] | undefined, idx: number) => {
    try {
      setActionLoadingIdx(idx);
      setActionType('save');
      const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      const title = lines[0]?.slice(0, 50) || 'Saved Research Answer';
      await saveAnswer({
        title,
        content: text,
        conversation_id: activeConvId || undefined,
        sources: sources || [],
      });
      setSavedMsgIdx(idx);
      setTimeout(() => setSavedMsgIdx(null), 2500);
    } catch (err) {
      console.error('Failed to save answer:', err);
      alert('Failed to save answer to Library.');
    } finally {
      setActionLoadingIdx(null);
      setActionType(null);
    }
  };

  const handleExportPDFFromAnswer = async (text: string, idx: number) => {
    try {
      setActionLoadingIdx(idx);
      setActionType('pdf');
      const firstLine = text.split('\n')[0].replace(/^[#\s*]+/, '').slice(0, 45) || 'Research Report';
      const blob = await generatePDF(firstLine, activeFile || undefined, 'chat_answer', text);
      downloadBlob(blob, `${firstLine.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF from this answer.');
    } finally {
      setActionLoadingIdx(null);
      setActionType(null);
    }
  };

  const handleExportFullChatPDF = async () => {
    if (messages.length === 0) return;
    try {
      setHeaderActionLoading(true);
      const chatContent = messages
        .map((m) => (m.role === 'user' ? `## Question:\n${m.text}` : `## Answer:\n${m.text}`))
        .join('\n\n---\n\n');
      const title = conversations.find((c) => c.id === activeConvId)?.title || 'Research Mind Chat Report';
      const blob = await generatePDF(title, activeFile || undefined, 'chat_export', chatContent);
      downloadBlob(blob, `${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to export conversation PDF:', err);
      alert('Failed to export PDF from conversation.');
    } finally {
      setHeaderActionLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
    setImagePreview(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(convId);
      setConversations((c) => c.filter((item) => item.id !== convId));
      if (activeConvId === convId) {
        handleNewChat();
      }
    } catch {
      // Failed to delete
    }
  };

  const grow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const t = e.target;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 200) + 'px';
  };

  const handlePdfUpload = async (file: File) => {
    if (!file.name.match(/\.(pdf|docx|txt|md)$/i)) return;
    setUploading(true);
    setUploadStage('Extracting document pages & structure...');
    try {
      setTimeout(() => setUploadStage('Creating structure-aware chunks...'), 400);
      setTimeout(() => setUploadStage('Generating embeddings & indexing vectors...'), 900);
      const res = await uploadResearchFile(file);
      setUploadStage(`Document indexed! ${res.page_count} pages, ${res.chunk_count} chunks.`);
      const updated = await listFiles();
      setFiles(updated);
      setActiveFile(res.filename);
      setTimeout(() => setUploadStage(''), 3500);
    } catch (err: any) {
      setUploadStage(`Error: ${err?.response?.data?.detail ?? 'Failed to index document.'}`);
      setTimeout(() => setUploadStage(''), 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = (e) => setImagePreview(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    c.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setImagePreview(c.toDataURL('image/jpeg'));
    setShowCamera(false);
  };

  const activateFeature = (label: string) => {
    if (label === 'AI Summarize') {
      navigate('/dashboard/ai-summary');
      return;
    }
    const prompts: Record<string, string> = {
      'AI Detector':
        'Analyse the following text for likely AI-generated patterns. Give a cautious assessment, specific signals, and ways to improve originality:\n\n',
      'AI Podcast...':
        'Create a concise educational podcast script on this topic, with a host intro, clear sections, and a closing summary:\n\n',
      'Text to Speech':
        'Explain this topic clearly in a natural, listener-friendly style suitable for text-to-speech:\n\n',
      'AI Image...':
        'Write a detailed image-generation prompt for this idea, including subject, composition, lighting, style, and aspect ratio:\n\n',
    };
    setInput(prompts[label] ?? '');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !imagePreview) || loading) return;

    const currentMode = deepThinkMode ? 'deepthink' : 'strict';
    const requestText = imagePreview ? `${text}\n[image attached]` : text;

    setMessages((m) => [
      ...m,
      { role: 'user', text: text || '(image)', image: imagePreview ?? undefined, mode: currentMode },
    ]);
    setInput('');
    setImagePreview(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    const history = messages.slice(-4).map((m) => ({ role: m.role, text: m.text }));

    try {
      const res = await sendChat(
        requestText,
        activeFile ?? undefined,
        undefined,
        history,
        activeConvId ?? undefined,
        currentMode
      );

      if (res.conversation_id && res.conversation_id !== activeConvId) {
        setActiveConvId(res.conversation_id);
        loadConversations();
      }

      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: res.answer,
          mode: currentMode,
          provider: res.provider,
          fallback_used: res.fallback_used,
          sources: res.sources,
          retrieval: res.retrieval,
          usage: res.usage,
          used_chunks_detail: res.used_chunks_detail,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'ai', text: `Error: ${e?.response?.data?.detail ?? 'Something went wrong.'}` },
      ]);
    } finally {
      setLoading(false);
      loadConversations();
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const rawName = user?.full_name?.trim() || user?.email?.split('@')[0] || '';
  const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1).split(' ')[0] : 'there';
  const isEmpty = messages.length === 0 && !loading;

  // Group conversations by date
  const groupedConvs = useMemo(() => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    for (const c of conversations) {
      try {
        const t = new Date(c.updated_at).getTime();
        if (t >= startOfToday) today.push(c);
        else if (t >= startOfYesterday) yesterday.push(c);
        else older.push(c);
      } catch {
        older.push(c);
      }
    }
    return { today, yesterday, older };
  }, [conversations]);

  return (
    <div className="flex h-full gap-3 overflow-hidden p-3.5 sm:p-5">
      {/* ── 1. Recent Chats History Drawer ─────────────────────────────── */}
      <ChatSidebar
        showHistory={showHistory}
        conversations={conversations}
        groupedConvs={groupedConvs}
        activeConvId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* ── 2. Primary Workspace Chat Card ─────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/80 backdrop-blur-2xl shadow-xl dark:shadow-2xl min-h-0">
        {/* Top Command Toolbar */}
        <ChatHeader
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          activeFile={activeFile}
          onSelectActiveFile={(val) => setActiveFile(val)}
          files={files}
          deepThinkMode={deepThinkMode}
          onToggleDeepThink={() => setDeepThinkMode((v) => !v)}
          uploadStage={uploadStage}
          uploading={uploading}
          onUploadClick={() => fileRef.current?.click()}
          hasMessages={messages.length > 0}
          onExportChatPDF={handleExportFullChatPDF}
          headerActionLoading={headerActionLoading}
        />

        {/* Camera Modal */}
        <CameraModal
          showCamera={showCamera}
          cameraError={cameraError}
          videoRef={videoRef}
          onCapture={capturePhoto}
          onClose={() => setShowCamera(false)}
        />

        {/* ── 3. EMPTY STATE: Intelligence Greeting ────────────────────── */}
        {isEmpty && (
          <ChatEmptyState
            greeting={greeting}
            firstName={firstName}
            deepThinkMode={deepThinkMode}
            onSelectPrompt={(prompt) => {
              setInput(prompt);
              textareaRef.current?.focus();
            }}
            onSelectFeature={activateFeature}
          />
        )}

        {/* ── 4. CHAT MESSAGE STREAM ───────────────────────────────────── */}
        {!isEmpty && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
            {messages.map((m, i) => (
              <ChatMessageItem
                key={i}
                message={m}
                index={i}
                userAvatarLetter={(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                copiedMsgIdx={copiedMsgIdx}
                savedMsgIdx={savedMsgIdx}
                actionLoadingIdx={actionLoadingIdx}
                actionType={actionType}
                onCopyAnswer={handleCopyAnswer}
                onSaveAnswer={handleSaveAnswer}
                onExportPDF={handleExportPDFFromAnswer}
                onOpenSource={(filename, page, section, evidence) => {
                  setViewerDoc({ filename, page, section, evidence });
                }}
              />
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-400 text-white shadow-glow-indigo">
                  <Atom className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="glass-panel rounded-2xl px-4 py-3 text-xs text-slate-300 flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>Synthesizing vector chunks & citing evidence…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* ── 5. COMPOSER BAR (FLOATING GLASS) ─────────────────────────── */}
        <ChatInputBar
          input={input}
          loading={loading}
          activeFile={activeFile}
          imagePreview={imagePreview}
          deepThinkMode={deepThinkMode}
          showAttachMenu={showAttachMenu}
          textareaRef={textareaRef}
          onChangeInput={grow}
          onKeyDown={onKey}
          onClearImage={() => setImagePreview(null)}
          onToggleAttachMenu={() => setShowAttachMenu((v) => !v)}
          onToggleDeepThink={() => setDeepThinkMode((v) => !v)}
          onSend={send}
          onSelectUploadDocument={() => {
            setShowAttachMenu(false);
            fileRef.current?.click();
          }}
          onSelectUploadImage={() => {
            setShowAttachMenu(false);
            imageRef.current?.click();
          }}
          onSelectUseCamera={() => {
            setShowAttachMenu(false);
            setShowCamera(true);
          }}
        />

        {/* Hidden inputs */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handlePdfUpload(f);
            e.target.value = '';
          }}
        />
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImageFile(f);
            e.target.value = '';
          }}
        />

        {viewerDoc && (
          <DocumentViewerModal
            filename={viewerDoc.filename}
            initialPage={viewerDoc.page}
            section={viewerDoc.section}
            evidence={viewerDoc.evidence}
            onClose={() => setViewerDoc(null)}
          />
        )}
      </div>
    </div>
  );
}
