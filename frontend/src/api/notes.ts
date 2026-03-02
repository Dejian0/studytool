import { apiFetch } from './client';
import type { GenerateStatus, NoteContent } from '../types';

export function startGenerateNotes(
  course: string,
  filename: string,
  model = 'gpt-4o',
  force = false,
): Promise<{ status: string }> {
  return apiFetch(
    `/generate-notes/${encodeURIComponent(course)}/${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, force }),
    },
  );
}

export function fetchGenerateNotesStatus(
  course: string,
  filename: string,
): Promise<GenerateStatus> {
  return apiFetch(
    `/generate-notes/${encodeURIComponent(course)}/${encodeURIComponent(filename)}/status`,
  );
}

export function fetchGeneratePrinciplesStatus(
  course: string,
  filename: string,
): Promise<GenerateStatus> {
  return apiFetch(
    `/generate-principles/${encodeURIComponent(course)}/${encodeURIComponent(filename)}/status`,
  );
}

export function startGeneratePrinciples(
  course: string,
  filename: string,
  model = 'gpt-4o',
): Promise<{ status: string }> {
  return apiFetch(
    `/generate-principles/${encodeURIComponent(course)}/${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    },
  );
}

export function fetchNotes(course: string): Promise<string[]> {
  return apiFetch(`/courses/${encodeURIComponent(course)}/notes`);
}

export function fetchNote(course: string, filename: string): Promise<NoteContent> {
  return apiFetch(
    `/courses/${encodeURIComponent(course)}/notes/${encodeURIComponent(filename)}`,
  );
}
