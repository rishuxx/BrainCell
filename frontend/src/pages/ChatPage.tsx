import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { getHealth, listSavedChats } from '../services/api';
import type { KeyOption } from '../types/chat';

interface ChatPageProps {
  systemPrompt: string;
  simulateFailure: string;
  userId?: string;
  onChatSaved: () => void;
}

export function ChatPage({ systemPrompt, simulateFailure, userId, onChatSaved }: ChatPageProps) {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [resumeError, setResumeError] = useState(false);

  useEffect(() => {
    if (routeSessionId) return;
    if (!userId) {
      navigate(`/chat/${crypto.randomUUID()}`, { replace: true });
      return;
    }
    const controller = new AbortController();
    setResumeError(false);
    listSavedChats(userId, controller.signal)
      .then((chats) => {
        if (controller.signal.aborted) return;
        const sessionId = chats[0]?.session_id ?? crypto.randomUUID();
        navigate(`/chat/${encodeURIComponent(sessionId)}`, { replace: true });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResumeError(true);
      });
    return () => controller.abort();
  }, [routeSessionId, navigate, userId]);

  return routeSessionId
    ? <ChatSession key={`${userId ?? 'guest'}:${routeSessionId}`} sessionId={routeSessionId} systemPrompt={systemPrompt} simulateFailure={simulateFailure} userId={userId} onChatSaved={onChatSaved} />
    : resumeError
      ? <p role="alert" className="p-4 text-center">Could not load your chats. Reload to retry, or start a New Chat from the sidebar.</p>
      : <p role="status" className="p-4 text-center">Loading your chats…</p>;
}

function ChatSession({ sessionId, systemPrompt, simulateFailure, userId, onChatSaved }: ChatPageProps & { sessionId: string }) {
  const { messages, isLoading, isRestoring, historyError, send } = useChat(sessionId, userId, onChatSaved);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [keyOptions, setKeyOptions] = useState<KeyOption[]>([]);
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then(({ key_options }) => {
        if (!controller.signal.aborted) setKeyOptions(key_options ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (message: string) => {
    void send(message, systemPrompt, simulateFailure, selectedKey);
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden w-full">
      {isRestoring && <p role="status" className="p-4 text-center">Loading chat history…</p>}
      {historyError && <p role="alert" className="p-4 text-center">{historyError}</p>}
      {messages.length === 0 ? (
        /* Empty State inside active chat session */
        <div className="flex flex-1 flex-col items-center justify-center px-3 sm:px-4 w-full h-full pb-6 sm:pb-8 overflow-hidden">
          <div className="flex flex-col items-center max-w-2xl w-full text-center my-auto">
            <img
              src="/Brain.svg"
              alt="BrainCell Brain"
              className="h-12 w-12 sm:h-14 sm:w-14 mb-2 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            />
            <h1 className="text-2xl sm:text-3xl font-matrix font-bold tracking-normal text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] mb-1">
              BrainCell
            </h1>
            <p className="text-gray-400 text-[11px] font-mono tracking-wide opacity-75 mb-6 max-w-sm">
              Session: <span className="text-[#be0638] font-bold">{sessionId.slice(0, 8)}...</span>
            </p>

            <ChatInput
              onSend={handleSend}
              isLoading={isLoading || isRestoring}
              keyOptions={keyOptions}
              selectedKey={selectedKey}
              onSelectKey={setSelectedKey}
              isHero={true}
            />
          </div>
        </div>
      ) : (
        /* Messages conversation thread */
        <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-8 overscroll-contain">
            <div className="mx-auto max-w-3xl space-y-4 pt-8 sm:pt-0">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              {isLoading && (
                <div role="status" className="mb-4 px-3 py-3">
                  <span className="sr-only">BrainCell is replying</span>
                  <div className="reply-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating bottom input */}
          <div className="p-2 sm:p-4 bg-transparent pb-3 sm:pb-4 flex-shrink-0">
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading}
              keyOptions={keyOptions}
              selectedKey={selectedKey}
              onSelectKey={setSelectedKey}
              isHero={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
