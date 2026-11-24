import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../types/chat';
import { ResponseMetadata } from './ResponseMetadata';
import { User, Bot, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] flex items-start gap-2">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4" data-testid={isError ? undefined : 'assistant-message'}>
      <div className="max-w-[75%] flex items-start gap-2">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isError ? 'bg-red-500' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
        }`}>
          {isError ? (
            <AlertCircle className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
        <div>
          <div
            className={`rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm ${
              isError
                ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                : 'bg-white text-gray-900 border border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
            }`}
          >
            {isError ? (
              <p className="text-sm">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          {!isError && message.metadata && (
            <ResponseMetadata metadata={message.metadata} />
          )}
        </div>
      </div>
    </div>
  );
}
