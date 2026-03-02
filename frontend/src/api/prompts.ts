import { apiFetch } from './client';

export function fetchPrompts(): Promise<string[]> {
  return apiFetch<string[]>('/prompts');
}

export function fetchPrompt(name: string): Promise<{ name: string; content: string }> {
  return apiFetch(`/prompts/${encodeURIComponent(name)}`);
}

export function updatePrompt(name: string, content: string): Promise<{ name: string; content: string }> {
  return apiFetch(`/prompts/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}
