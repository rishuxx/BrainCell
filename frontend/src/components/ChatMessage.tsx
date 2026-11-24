import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { ChatMessage as ChatMessageType } from '../types/chat';
import { ResponseMetadata } from './ResponseMetadata';
import { remarkSectionLabels } from './remarkSectionLabels';
import { AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

const markdownComponents: import('react-markdown').Components = {
  table({ node: _node, ...props }) {
    return (
      <div className="markdown-table" role="region" aria-label="Response table" tabIndex={0}>
        <table {...props} />
      </div>
    );
  },
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[85%] sm:max-w-[75%]">
          {/* Claude-style user pill */}
          <div className="rounded-2xl bg-[#2a2b2f]/90 border border-white/10 px-4 py-2.5 text-gray-100 shadow-md">
            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start mb-6" data-testid={isError ? undefined : 'assistant-message'}>
      <div className="w-full max-w-none">
        {/* Assistant Response: Clean typography with natural spacing */}
        <div className="text-gray-100">
          {isError ? (
            <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-950/20 px-3.5 py-2.5 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <p>{message.content}</p>
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks, remarkSectionLabels]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Technical Metadata below response: Matrix font */}
        {!isError && message.metadata && (
          <ResponseMetadata metadata={message.metadata} />
        )}
      </div>
    </div>
  );
}
