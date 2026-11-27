import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/chat';
import { getSessionMessages, sendMessage } from '../services/api';

export function useChat(sessionId: string, userId?: string, onChatSaved?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const sending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    getSessionMessages(sessionId, controller.signal, userId)
      .then((history) => {
        if (!controller.signal.aborted) setMessages(history);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError('Could not load chat history. Reload to try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRestoring(false);
      });

    return () => controller.abort();
  }, [sessionId, userId]);

  async function send(message: string, systemPrompt: string, simulateFailure?: string, preferredKeyId?: string) {
    const content = message.trim();
    const prompt = systemPrompt.trim();
    if (!content || isRestoring || sending.current) return;

    sending.current = true;
    setIsLoading(true);
    setMessages((previous) => [...previous, { role: 'user', content }]);

    try {
      const response = await sendMessage(
        {
          session_id: sessionId,
          message: content,
          ...(prompt ? { system_prompt: prompt } : {}),
          ...(preferredKeyId ? { preferred_key_id: preferredKeyId } : {}),
        },
        simulateFailure || undefined,
        userId,
      );
      setMessages((previous) => [...previous, {
        role: 'assistant',
        content: response.reply,
        metadata: response.metadata,
      }]);
      if (userId) onChatSaved?.();
    } catch (error) {
      setMessages((previous) => [...previous, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An unexpected error occurred',
        isError: true,
      }]);
    } finally {
      sending.current = false;
      setIsLoading(false);
    }
  }

  return { messages, isLoading, isRestoring, historyError, send };
}
