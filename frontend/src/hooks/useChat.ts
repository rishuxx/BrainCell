import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ChatResponse } from '../types/chat';
import { sendMessage } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [systemPrompt, setSystemPrompt] = useState('');
  const sessionIdRef = useRef(sessionId);

  const send = useCallback(
    async (message: string, simulateFailure?: string) => {
      if (!message.trim() || isLoading) return;

      const currentSessionId = sessionIdRef.current;

      // Add user message
      const userMsg: ChatMessage = { role: 'user', content: message.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const response: ChatResponse = await sendMessage(
          {
            session_id: currentSessionId,
            message: message.trim(),
            ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
          },
          simulateFailure || undefined,
        );

        // If session changed while waiting, discard stale response
        if (sessionIdRef.current !== currentSessionId) return;

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.reply,
          metadata: response.metadata,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error: any) {
        // If session changed while waiting, discard stale response
        if (sessionIdRef.current !== currentSessionId) return;

        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: error.message || 'An unexpected error occurred',
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        if (sessionIdRef.current === currentSessionId) {
          setIsLoading(false);
        }
      }
    },
    [isLoading, systemPrompt],
  );

  const newChat = useCallback(() => {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    sessionIdRef.current = newId;
    setMessages([]);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    sessionId,
    systemPrompt,
    setSystemPrompt,
    send,
    newChat,
  };
}
