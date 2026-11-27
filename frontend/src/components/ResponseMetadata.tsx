import type { ChatMetadata } from '../types/chat';
import { Zap, Database, Clock, Cpu, ArrowRightLeft, Key, AlertTriangle } from 'lucide-react';

interface ResponseMetadataProps {
  metadata: ChatMetadata;
}

export function ResponseMetadata({ metadata }: ResponseMetadataProps) {
  const isCache = metadata.resolution_source === 'LLM_CACHE';

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-matrix text-[9px] text-gray-400/80 tracking-tight select-none opacity-85">
      {/* Source (LIVE_INFERENCE / LLM_CACHE) */}
      <span
        data-testid="meta-source"
        className={`inline-flex items-center gap-0.5 transition-colors ${
          isCache ? 'text-emerald-400' : 'text-pink-400'
        }`}
      >
        {isCache ? <Database className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
        {metadata.resolution_source}
      </span>

      <span className="text-gray-600">·</span>

      {/* Model */}
      <span
        data-testid="meta-model"
        className="inline-flex items-center gap-0.5 text-gray-400"
      >
        <Cpu className="h-2.5 w-2.5 text-gray-500" />
        {metadata.model}
      </span>

      <span className="text-gray-600">·</span>

      {/* Latency */}
      <span
        data-testid="meta-latency"
        className="inline-flex items-center gap-0.5 text-gray-400"
      >
        <Clock className="h-2.5 w-2.5 text-gray-500" />
        {metadata.latency_ms} ms
      </span>

      <span className="text-gray-600">·</span>

      {/* In Tokens */}
      <span className="inline-flex items-center gap-0.5 text-gray-400">
        <ArrowRightLeft className="h-2.5 w-2.5 text-gray-500" />
        In: <span data-testid="meta-input-tokens">{metadata.input_tokens}</span>
      </span>

      {/* Out Tokens */}
      <span className="inline-flex items-center gap-0.5 text-gray-400">
        Out: <span data-testid="meta-output-tokens">{metadata.output_tokens}</span>
      </span>

      {/* Key ID if present */}
      {metadata.key_id && (
        <>
          <span className="text-gray-600">·</span>
          <span className="inline-flex items-center gap-0.5 text-amber-400/85">
            <Key className="h-2.5 w-2.5" />
            {metadata.key_id}
          </span>
        </>
      )}

      {/* Fallback Attempts if > 0 */}
      {metadata.fallback_attempts > 0 && (
        <>
          <span className="text-gray-600">·</span>
          <span className="inline-flex items-center gap-0.5 text-rose-400">
            <AlertTriangle className="h-2.5 w-2.5" />
            {metadata.fallback_attempts} fallback(s)
          </span>
        </>
      )}
    </div>
  );
}
