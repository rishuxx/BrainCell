import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Moon, Sun, MessageSquare, Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen, LogIn, LogOut, Trash2, User as UserIcon } from 'lucide-react';
import { supabase } from '../utils/supabase';
import type { User } from '@supabase/supabase-js';
import { deleteSavedChat, listSavedChats, type SavedChat } from '../services/api';

interface SidebarProps {
  onNewChat: () => void;
  sessionId: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
  onOpenAuth: () => void;
  user: User | null;
  historyVersion: number;
}

export function Sidebar({ onNewChat, sessionId, isDark, onToggleTheme, onToggleSettings, onOpenAuth, user, historyVersion }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const userId = user?.id;
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteVersion, setDeleteVersion] = useState(0);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const controller = new AbortController();
    setHistoryStatus('loading');
    listSavedChats(userId, controller.signal)
      .then((chats) => {
        if (controller.signal.aborted) return;
        setSavedChats(chats);
        setHistoryStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryStatus('error');
      });
    return () => controller.abort();
  }, [isOpen, userId, historyVersion, deleteVersion]);

  const handleDelete = async (chat: SavedChat) => {
    if (!userId || deletingId || !window.confirm(`Delete “${chat.title}” and all its messages?`)) return;
    setDeletingId(chat.session_id);
    setDeleteError('');
    try {
      await deleteSavedChat(userId, chat.session_id);
      setSavedChats((chats) => chats.filter((item) => item.session_id !== chat.session_id));
      setDeleteVersion((version) => version + 1);
      if (window.location.pathname === `/chat/${encodeURIComponent(chat.session_id)}`) {
        navigate(`/chat/${crypto.randomUUID()}`, { replace: true });
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this chat.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <>
      {/* Floating Toggle Button when closed - Panel icon only, no brain icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center justify-center rounded-none bg-black/40 backdrop-blur-sm sm:bg-transparent p-2 text-white hover:text-pink-400 transition-colors border border-white/10 sm:border-transparent"
          aria-label="Expand sidebar"
          title="Open Menu"
        >
          <PanelLeftOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </button>
      )}

      {/* Expanded Sidebar Panel - Proper White, Sharp Corners (rounded-none), Matrix Font */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col border-r-2 border-black bg-white text-black font-matrix transition-all duration-300 ease-in-out w-[85vw] max-w-[300px] sm:w-72 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-white">
          <div className="flex items-center gap-2.5">
            <img src="/Brain.svg" alt="BrainCell Logo" className="h-6 w-6 object-contain" />
            <h1 className="text-xl font-matrix font-bold tracking-wider text-black">
              BrainCell
            </h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-none p-1.5 text-gray-700 hover:bg-gray-100 hover:text-[#be0638] transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button - Solid Rose Red with Sharp Corners & Matrix Font */}
        <div className="p-4 pb-2">
          <button
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-none bg-[#be0638] px-4 py-2.5 font-matrix text-xs font-bold tracking-widest text-white transition-all hover:bg-[#d41147]"
            aria-label="Start new chat"
          >
            <Plus className="h-4 w-4 text-white" />
            <span>+ NEW CHAT</span>
          </button>
        </div>

        {/* Active session info - Sharp corners */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="text-[10px] font-matrix uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
            Active Session
          </div>
          <div className="flex items-center gap-2 rounded-none border border-black bg-gray-50 p-2.5 text-xs text-black">
            <MessageSquare className="h-4 w-4 flex-shrink-0 text-[#be0638]" />
            <div className="truncate font-matrix text-[11px]">
              <span className="text-gray-500">ID: </span>
              <span>{sessionId.slice(0, 12)}...</span>
            </div>
          </div>
          {userId && (
            <nav aria-label="Chat history" className="mt-5 space-y-1">
              <h2 className="mb-2 px-0.5 font-matrix text-[10px] uppercase tracking-wider text-gray-500">Chat history</h2>
              {historyStatus === 'loading' && <p role="status" className="text-xs text-gray-600">Loading chats…</p>}
              {historyStatus === 'error' && <p role="alert" className="text-xs text-gray-600">Could not load chats. Reopen the sidebar to retry.</p>}
              {deleteError && <p role="alert" className="text-xs text-rose-800">{deleteError}</p>}
              {historyStatus === 'ready' && savedChats.length === 0 && <p className="text-xs text-gray-600">No saved chats yet.</p>}
              {savedChats.map((chat) => (
                <div key={chat.session_id} className="flex items-center gap-1">
                <button
                  aria-current={chat.session_id === sessionId ? 'page' : undefined}
                  title={chat.title}
                  onClick={() => {
                    navigate(`/chat/${encodeURIComponent(chat.session_id)}`);
                    setIsOpen(false);
                  }}
                  className="min-w-0 flex-1 truncate px-2 py-2 text-left text-xs text-black hover:bg-gray-100 aria-[current=page]:bg-rose-100"
                >
                  {chat.title}
                </button>
                <button
                  type="button"
                  aria-label={`Delete chat: ${chat.title}`}
                  title="Delete chat"
                  disabled={deletingId !== null}
                  onClick={() => void handleDelete(chat)}
                  className="shrink-0 p-2 text-gray-600 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Bottom controls: Settings, Theme, and Sign In at the very bottom */}
        <div className="mt-auto space-y-1.5 p-4 border-t-2 border-black bg-white">
          <button
            onClick={onToggleSettings}
            className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-xs font-matrix tracking-wide text-gray-800 hover:bg-gray-100 hover:text-[#be0638] transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4 text-[#be0638]" />
            <span>Settings & Failover</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="flex w-full items-center gap-2 rounded-none px-3 py-2 text-xs font-matrix tracking-wide text-gray-800 hover:bg-gray-100 hover:text-[#be0638] transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* User Account / Sign In section at bottom */}
          <div className="pt-2 border-t border-gray-200">
            {user ? (
              <div className="flex items-center justify-between rounded-none border border-black bg-gray-50 p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-none bg-[#be0638] text-white">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-matrix font-bold text-black truncate max-w-[130px]">{user.email}</p>
                    <p className="text-[9px] text-[#be0638] font-matrix tracking-wider">Signed in</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="rounded-none p-1 text-gray-600 hover:bg-gray-200 hover:text-[#be0638] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-none bg-[#be0638] px-3 py-2 font-matrix text-xs font-bold tracking-widest text-white transition-all hover:bg-[#d41147]"
              >
                <LogIn className="h-4 w-4" />
                <span>SIGN IN →</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 transition-opacity"
          aria-hidden="true"
        />
      )}
    </>
  );
}
