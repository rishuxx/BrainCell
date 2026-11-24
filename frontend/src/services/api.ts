import type { ChatRequest, ChatResponse, HealthResponse } from '../types/chat';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function sendMessage(
  request: ChatRequest,
  simulateFailure?: string,
): Promise<ChatResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (simulateFailure) {
    headers['X-Simulate-Failure'] = simulateFailure;
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorBody.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function getSessionMessages(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorBody.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
