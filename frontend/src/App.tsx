import { useState, useEffect, useRef } from 'react';
import { useChat } from './hooks/useChat';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { Bot, Sparkles } from 'lucide-react';

function App() {
  const { messages, isLoading, sessionId, systemPrompt, setSystemPrompt, send, newChat } = useChat();
  const [isDark, setIsDark] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (message: string, simFailure?: string) => {
    send(message, simFailure);
  };

  const starterPrompts = [
    'What is the capital of France?',
    'Explain quantum computing in simple terms',
    'Write a haiku about programming',
    'What are the benefits of TypeScript?',
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        onNewChat={newChat}
        sessionId={sessionId}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Settings panel */}
        {showSettings && (
          <Settings
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            simulateFailure={simulateFailure}
            onSimulateFailureChange={setSimulateFailure}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full pt-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Lyftr AI Chat
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                  Ask me anything. I'll respond with detailed answers, complete with metadata about how your request was processed.
                </p>

                {/* Starter prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {starterPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt, simulateFailure)}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm
                                 text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm
                                 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages */
              <>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          simulateFailure={simulateFailure}
        />
      </div>
    </div>
  );
}

export default App;
