import type { ChatMessage, ChatRequest, ChatResponse, HealthResponse } from '../types/chat';
import { supabase } from '../utils/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function accountHeaders(userId?: string): Promise<Record<string, string>> {
  if (!userId) return {};
  let { data: { session }, error } = await supabase.auth.getSession();

  // If token is expired or expiring soon, try refreshing it
  if (session) {
    const isExpired = session.expires_at ? (session.expires_at * 1000) < (Date.now() + 60000) : false;
    if (isExpired) {
      const refreshResult = await supabase.auth.refreshSession();
      if (!refreshResult.error && refreshResult.data.session) {
        session = refreshResult.data.session;
      }
    }
  }

  if (error || !session || session.user.id !== userId) {
    // Session is invalid - sign out cleanly so UI resets
    await supabase.auth.signOut().catch(() => {});
    throw new Error('Your session expired. Please sign in again.');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface SavedChat {
  session_id: string;
  title: string;
  updated_at: string;
}

export async function listSavedChats(userId: string, signal: AbortSignal): Promise<SavedChat[]> {
  const headers = await accountHeaders(userId);
  const response = await fetch(`${API_BASE}/sessions`, { headers, signal });
  if (!response.ok) throw new Error('Could not load saved chats.');
  return (await response.json()).sessions;
}

export async function deleteSavedChat(userId: string, sessionId: string): Promise<void> {
  const headers = await accountHeaders(userId);
  const response = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Could not delete this chat. Reopen the sidebar and try again.');
}

export async function sendMessage(
  request: ChatRequest,
  simulateFailure?: string,
  userId?: string,
): Promise<ChatResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...await accountHeaders(userId),
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
    if (res.status === 401) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error('Your session expired. Please sign in again.');
    }
    const errorBody = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorBody.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { signal });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function getSessionMessages(sessionId: string, signal: AbortSignal, userId?: string): Promise<ChatMessage[]> {
  const headers = await accountHeaders(userId);
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`, { signal, headers });
  if (res.status === 404) return [];
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorBody.detail || `HTTP ${res.status}`);
  }
  const { messages } = await res.json();
  if (!Array.isArray(messages)) throw new Error('Invalid chat history response');
  return messages;
}
