import type { ChatMetadata } from '../types/chat';
import { Zap, Database, Clock, Cpu, ArrowRightLeft, Key, AlertTriangle } from 'lucide-react';

interface ResponseMetadataProps {
  metadata: ChatMetadata;
}

export function ResponseMetadata({ metadata }: ResponseMetadataProps) {
  const isCache = metadata.resolution_source === 'LLM_CACHE';

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <span
        data-testid="meta-source"
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
          isCache
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        }`}
      >
        {isCache ? <Database className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
        {metadata.resolution_source}
      </span>

      <span
        data-testid="meta-model"
        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      >
        <Cpu className="h-3 w-3" />
        {metadata.model}
      </span>

      <span
        data-testid="meta-latency"
        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      >
        <Clock className="h-3 w-3" />
        {metadata.latency_ms} ms
      </span>

      <span
        data-testid="meta-input-tokens"
        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      >
        <ArrowRightLeft className="h-3 w-3" />
        In: {metadata.input_tokens}
      </span>

      <span
        data-testid="meta-output-tokens"
        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      >
        Out: {metadata.output_tokens}
      </span>

      {metadata.key_id && (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Key className="h-3 w-3" />
          {metadata.key_id}
        </span>
      )}

      {metadata.fallback_attempts > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          <AlertTriangle className="h-3 w-3" />
          {metadata.fallback_attempts} fallback(s)
        </span>
      )}
    </div>
  );
}
