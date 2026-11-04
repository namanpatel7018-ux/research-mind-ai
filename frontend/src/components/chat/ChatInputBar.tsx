import React from 'react';
import { X, Plus, FileText, ImagePlus, Camera, Brain, Loader2, ArrowUp } from 'lucide-react';

interface ChatInputBarProps {
  input: string;
  loading: boolean;
  activeFile: string | null;
  imagePreview: string | null;
  deepThinkMode: boolean;
  showAttachMenu: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChangeInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onClearImage: () => void;
  onToggleAttachMenu: () => void;
  onToggleDeepThink: () => void;
  onSend: () => void;
  onSelectUploadDocument: () => void;
  onSelectUploadImage: () => void;
  onSelectUseCamera: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  input,
  loading,
  activeFile,
  imagePreview,
  deepThinkMode,
  showAttachMenu,
  textareaRef,
  onChangeInput,
  onKeyDown,
  onClearImage,
  onToggleAttachMenu,
  onToggleDeepThink,
  onSend,
  onSelectUploadDocument,
  onSelectUploadImage,
  onSelectUseCamera,
}) => {
  return (
    <div className="shrink-0 p-3 sm:p-4 bg-gradient-to-t from-slate-100 via-slate-50/90 to-transparent dark:from-[#040816] dark:via-[#040816]/90 dark:to-transparent">
      {imagePreview && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="relative">
            <img
              src={imagePreview}
              alt="preview"
              className="h-12 w-12 rounded-xl object-cover ring-2 ring-indigo-500/40"
            />
            <button
              onClick={onClearImage}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-400 shadow-sm"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-2.5 border border-slate-300 dark:border-white/10 bg-white dark:bg-[#080D1D]/90 focus-within:border-indigo-500 dark:focus-within:border-indigo-400/50 shadow-md dark:shadow-2xl transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onChangeInput}
          onKeyDown={onKeyDown}
          placeholder={
            activeFile
              ? `Ask question regarding "${activeFile}"…`
              : 'Ask ResearchMind AI anything or query your corpus…'
          }
          disabled={loading}
          rows={1}
          style={{ resize: 'none', minHeight: '48px' }}
          className="w-full bg-transparent px-3 pt-1 pb-1 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:opacity-40 leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1 px-1 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={onToggleAttachMenu}
                title="Attach document, image, or photo"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-11 left-0 z-40 w-44 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B1124] p-1.5 shadow-xl dark:shadow-2xl backdrop-blur-2xl">
                  <button
                    onClick={onSelectUploadDocument}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <span>Upload Document</span>
                  </button>
                  <button
                    onClick={onSelectUploadImage}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <ImagePlus className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                    <span>Upload Image</span>
                  </button>
                  <button
                    onClick={onSelectUseCamera}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <Camera className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                    <span>Use Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* DeepThink toggle pill */}
            <button
              onClick={onToggleDeepThink}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                deepThinkMode
                  ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-600/20 text-violet-700 dark:text-violet-200 font-semibold'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Brain className="h-3.5 w-3.5" style={{ color: deepThinkMode ? '#7C3AED' : '#64748B' }} />
              <span className="text-[11px]">DeepThink {deepThinkMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
              Press Enter ↵ to send
            </span>
            <button
              onClick={onSend}
              disabled={(!input.trim() && !imagePreview) || loading}
              className="glass-button-primary flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-glow-indigo disabled:opacity-30 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
