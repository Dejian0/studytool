import { apiFetch } from './client';

export function fetchCourses(): Promise<string[]> {
  return apiFetch<string[]>('/courses');
}

export function createCourse(name: string): Promise<{ name: string }> {
  return apiFetch('/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function fetchCourseFiles(course: string, folder: 'slides' | 'exams'): Promise<string[]> {
  return apiFetch<string[]>(`/courses/${encodeURIComponent(course)}/files/${folder}`);
}

export async function uploadFiles(course: string, folder: string, files: File[]): Promise<{ uploaded: string[] }> {
  const form = new FormData();
  for (const f of files) {
    form.append('files', f);
  }
  return apiFetch(`/courses/${encodeURIComponent(course)}/upload/${folder}`, {
    method: 'POST',
    body: form,
  });
}
