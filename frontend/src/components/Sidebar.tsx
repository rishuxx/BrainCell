import { useState } from 'react';
import { Plus, Moon, Sun, MessageSquare, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
  sessionId: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
}

export function Sidebar({ onNewChat, sessionId, isDark, onToggleTheme, onToggleSettings }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300
                   dark:border-gray-700 dark:bg-gray-900 ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        {!collapsed && (
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Lyftr AI
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm
                     text-gray-700 transition-colors hover:bg-gray-200
                     dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Start new chat"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Current session */}
      {!collapsed && (
        <div className="mt-4 flex-1 overflow-y-auto px-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-200/50 px-3 py-2 text-sm text-gray-700
                          dark:bg-gray-700/50 dark:text-gray-300">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Session: {sessionId.slice(0, 8)}...</span>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="mt-auto space-y-1 p-3">
        <button
          onClick={onToggleSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600
                     hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button
          onClick={onToggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600
                     hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </div>
  );
}
