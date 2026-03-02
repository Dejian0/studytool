import type { ChatContext, ChatMessage, Providers } from '../types';
import { apiFetch } from './client';

export function fetchProviders(): Promise<Providers> {
  return apiFetch<Providers>('/providers');
}

export interface SendChatOptions {
  model: string;
  system_prompt: string;
  message: string;
  context: ChatContext;
  history: ChatMessage[];
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function sendChatMessage(opts: SendChatOptions): Promise<void> {
  const { model, system_prompt, message, context, history, onChunk, onDone, onError, signal } = opts;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, system_prompt, message, context, history }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    onError(body.detail || res.statusText);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError('No response stream');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const payload = trimmed.slice(6);
      if (payload === '[DONE]') {
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          onError(parsed.error);
          return;
        }
        if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  onDone();
}
