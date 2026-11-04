import React from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Conversation } from '../../lib/api';

interface ChatSidebarProps {
  showHistory: boolean;
  conversations: Conversation[];
  groupedConvs: {
    today: Conversation[];
    yesterday: Conversation[];
    older: Conversation[];
  };
  activeConvId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  showHistory,
  conversations,
  groupedConvs,
  activeConvId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}) => {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#070D1E]/80 backdrop-blur-2xl transition-all duration-300 overflow-hidden shadow-md dark:shadow-2xl ${
        showHistory ? 'w-64 shrink-0' : 'w-0 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 p-3.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          <span className="font-display text-xs font-bold text-slate-900 dark:text-white tracking-tight">Recent Threads</span>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-600/25 hover:bg-indigo-100 dark:hover:bg-indigo-600/40 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-200 transition cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3.5">
        {conversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 px-3">
            No saved conversations yet. Query the AI to start a thread!
          </div>
        ) : (
          <>
            {groupedConvs.today.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Today</p>
                <div className="space-y-0.5">
                  {groupedConvs.today.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all duration-150 ${
                        activeConvId === c.id
                          ? 'bg-indigo-50/90 dark:bg-indigo-600/20 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:to-violet-600/20 text-indigo-700 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-500/50 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)] font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1 min-w-0">
                        {activeConvId === c.id && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.9)]" />
                        )}
                        <span className="truncate">{c.title}</span>
                      </div>
                      <button
                        onClick={(e) => onDeleteConversation(c.id, e)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedConvs.yesterday.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Yesterday</p>
                <div className="space-y-0.5">
                  {groupedConvs.yesterday.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all duration-150 ${
                        activeConvId === c.id
                          ? 'bg-indigo-50/90 dark:bg-indigo-600/20 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:to-violet-600/20 text-indigo-700 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-500/50 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)] font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1 min-w-0">
                        {activeConvId === c.id && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.9)]" />
                        )}
                        <span className="truncate">{c.title}</span>
                      </div>
                      <button
                        onClick={(e) => onDeleteConversation(c.id, e)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedConvs.older.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Previous</p>
                <div className="space-y-0.5">
                  {groupedConvs.older.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition-all duration-150 ${
                        activeConvId === c.id
                          ? 'bg-indigo-50/90 dark:bg-indigo-600/20 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:to-violet-600/20 text-indigo-700 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-500/50 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)] font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1 min-w-0">
                        {activeConvId === c.id && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.9)]" />
                        )}
                        <span className="truncate">{c.title}</span>
                      </div>
                      <button
                        onClick={(e) => onDeleteConversation(c.id, e)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
