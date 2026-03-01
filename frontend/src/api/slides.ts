import { apiFetch } from './client';
import type { PageText } from '../types';

export function fetchPageCount(course: string, filename: string): Promise<{ count: number }> {
  return apiFetch(`/slides/${encodeURIComponent(course)}/${encodeURIComponent(filename)}/page-count`);
}

export function slideImageUrl(course: string, filename: string, page: number, dpi = 150): string {
  return `/api/slides/${encodeURIComponent(course)}/${encodeURIComponent(filename)}/page/${page}/image?dpi=${dpi}`;
}

export function fetchPageText(course: string, filename: string, page: number): Promise<PageText> {
  return apiFetch(`/slides/${encodeURIComponent(course)}/${encodeURIComponent(filename)}/page/${page}/text`);
}
