import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import GradientASCII from './components/GradientASCII';
import { User as UserIcon, ExternalLink } from 'lucide-react';
import { supabase } from './utils/supabase';
import type { User } from '@supabase/supabase-js';

import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ChatPage } from './pages/ChatPage';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDark, setIsDark] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [simulateFailure, setSimulateFailure] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Supabase Auth listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Extract current session ID if on /chat/:sessionId route
  const pathParts = location.pathname.split('/');
  const currentSessionId = pathParts[1] === 'chat' && pathParts[2] ? pathParts[2] : 'new';

  const handleNewChat = () => {
    const freshId = crypto.randomUUID();
    navigate(`/chat/${freshId}`);
  };
  const chatPage = authReady ? (
    <ChatPage
      simulateFailure={simulateFailure}
      userId={user?.id}
      onChatSaved={() => setHistoryVersion((version) => version + 1)}
    />
  ) : null;

  return (
    <div className="relative flex flex-col h-[100dvh] w-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {/* Animated GradientASCII Background across the entire screen */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
        <GradientASCII
          colors={["#be0638", "#ff5e79", "#fc6f81", "#fff1f2"]}
          shape="rise"
          characters=" =+xX0S8#@"
          cellSize={22}
          density={0.8}
          glyphOpacity={0.67}
          depthOfField={0.47}
          flicker={0.15}
          scale={1.35}
          flow={1.25}
          gradientOpacity={0.84}
          grain={0.15}
          variation={15}
          scrambleRadius={0.16}
        />
      </div>

      {/* Floating / Collapsible Sidebar with Real Routing */}
      <Sidebar
        key={user?.id ?? 'guest'}
        historyVersion={historyVersion}
        onNewChat={handleNewChat}
        sessionId={currentSessionId}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onOpenAuth={() => navigate('/')}
        user={user}
      />

      {/* Top right user status pill */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20">
        {!authReady ? null : user ? (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-none border border-black bg-white px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs text-black font-matrix shadow-lg">
            <span className="h-2 w-2 rounded-none bg-[#be0638] animate-pulse flex-shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[140px] font-bold">{user.email}</span>
          </div>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-none border border-black bg-white px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs text-black font-matrix shadow-lg transition-all hover:bg-[#be0638] hover:text-white"
          >
            <UserIcon className="h-3.5 w-3.5 text-[#be0638]" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* Main Routed Area */}
      <div className="relative z-10 flex flex-1 flex-col h-full w-full min-w-0 bg-transparent">
        {/* Settings modal */}
        {showSettings && (
          <Settings
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            simulateFailure={simulateFailure}
            onSimulateFailureChange={setSimulateFailure}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Routes View */}
        <Routes>
          {/* Route 1: / -> Official Landing / Homepage */}
          <Route path="/" element={<HomePage user={user} authReady={authReady} />} />

          {/* Route 2: /about -> Dedicated About BrainCell & Developer Rishu */}
          <Route path="/about" element={<AboutPage />} />

          {/* Route 3: /chat/:sessionId -> Chat Session with URL ID */}
          <Route path="/chat/:sessionId" element={chatPage} />
          <Route path="/chat" element={chatPage} />

          {/* Fallback to Home */}
          <Route path="*" element={<HomePage user={user} authReady={authReady} />} />
        </Routes>

        <footer className="w-full shrink-0 px-3 sm:px-4 py-2 font-matrix text-[9px] text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span>© 2026 BrainCell Inc.</span>
              <span aria-hidden="true">·</span>
              <span>Crafted by Rishu</span>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <button
                onClick={() => navigate('/')}
                className="hover:underline"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/about')}
                className="hover:underline"
              >
                About BrainCell
              </button>
              <span className="hidden xs:inline">Terms of Use</span>
            </nav>

            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <span>Twitter/X</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
