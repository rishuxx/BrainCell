export interface ChatMetadata {
  resolution_source: 'LIVE_INFERENCE' | 'LLM_CACHE';
  model: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  key_id: string | null;
  fallback_attempts: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  metadata?: ChatMetadata;
  isError?: boolean;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  system_prompt?: string;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  metadata: ChatMetadata;
}

export interface HealthResponse {
  status: string;
  keys_configured: number;
  cache_enabled: boolean;
}

export interface ErrorResponse {
  detail: string;
}
