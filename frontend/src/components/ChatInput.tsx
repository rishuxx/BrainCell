import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, simulateFailure?: string) => void;
  isLoading: boolean;
  simulateFailure?: string;
}

export function ChatInput({ onSend, isLoading, simulateFailure }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed, simulateFailure);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl flex items-end gap-2">
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message..."
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm
                     focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                     disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                     dark:focus:border-blue-400 dark:placeholder-gray-400"
          aria-label="Chat message input"
        />
        <button
          data-testid="send-button"
          onClick={handleSend}
          disabled={isLoading || !message.trim()}
          className="flex-shrink-0 rounded-xl bg-blue-600 p-3 text-white transition-colors
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
