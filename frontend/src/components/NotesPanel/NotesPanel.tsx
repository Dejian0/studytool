import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startGenerateNotes,
  startGeneratePrinciples,
  fetchGenerateNotesStatus,
  fetchGeneratePrinciplesStatus,
  fetchNote,
} from '../../api/notes';
import type { GenerateStatus } from '../../types';
import MarkdownRenderer from '../common/MarkdownRenderer';
import ModelSelect from '../common/ModelSelect';

interface Props {
  course: string;
  filename: string;
  type: 'notes' | 'principles';
}

function notesFilename(pdfName: string): string {
  const stem = pdfName.replace(/\.pdf$/i, '');
  return `${stem}_lecture_notes.md`;
}

function principlesFilename(pdfName: string): string {
  const stem = pdfName.replace(/\.pdf$/i, '');
  return `${stem}_core_principles.md`;
}

export default function NotesPanel({ course, filename, type }: Props) {
  const queryClient = useQueryClient();
  const [model, setModel] = useState('gpt-5-mini');

  const noteFile = type === 'notes' ? notesFilename(filename) : principlesFilename(filename);
  const statusFn = type === 'notes' ? fetchGenerateNotesStatus : fetchGeneratePrinciplesStatus;

  const { data: status } = useQuery<GenerateStatus>({
    queryKey: ['generateStatus', type, course, filename],
    queryFn: () => statusFn(course, filename),
    refetchInterval: (query) => {
      return query.state.data?.status === 'running' ? 2000 : false;
    },
  });

  const { data: noteData, isLoading: noteLoading } = useQuery({
    queryKey: ['note', course, noteFile],
    queryFn: () => fetchNote(course, noteFile),
    enabled: status?.status === 'completed',
  });

  const generateNotesMutation = useMutation({
    mutationFn: ({ force }: { force?: boolean } = {}) =>
      startGenerateNotes(course, filename, model, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generateStatus', 'notes', course, filename] });
      queryClient.invalidateQueries({ queryKey: ['note', course] });
    },
  });

  const generatePrinciplesMutation = useMutation({
    mutationFn: () => startGeneratePrinciples(course, filename, model),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['generateStatus', 'principles', course, filename],
      });
    },
  });

  const isPending = type === 'notes' ? generateNotesMutation.isPending : generatePrinciplesMutation.isPending;
  const mutationError = type === 'notes' ? generateNotesMutation.error : generatePrinciplesMutation.error;

  function handleGenerate(force = false) {
    if (type === 'notes') {
      generateNotesMutation.mutate({ force });
    } else {
      generatePrinciplesMutation.mutate();
    }
  }

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isIdle = !status || status.status === 'idle';

  const progress =
    isRunning && status.total_slides > 0
      ? Math.round((status.current_slide / status.total_slides) * 100)
      : 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {isCompleted && (
        <>
          {type === 'notes' && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Model:</label>
              <ModelSelect
                value={model}
                onChange={setModel}
                className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
              <button
                onClick={() => {
                  if (!confirm('Regenerate lecture notes from scratch? This will replace the existing notes.')) return;
                  generateNotesMutation.mutate({ force: true });
                }}
                disabled={generateNotesMutation.isPending}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                  <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                </svg>
                {generateNotesMutation.isPending ? 'Starting...' : 'Regenerate'}
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto p-6">
            {noteLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
                <span className="ml-2 text-zinc-500">Loading notes...</span>
              </div>
            ) : noteData ? (
              <MarkdownRenderer content={noteData.content} />
            ) : (
              <p className="text-zinc-500">Notes file not found.</p>
            )}
          </div>
        </>
      )}

      {isRunning && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <Spinner />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {type === 'notes'
              ? `Generating notes... Slide ${status.current_slide} of ${status.total_slides}`
              : 'Generating core principles...'}
          </p>
          {type === 'notes' && status.total_slides > 0 && (
            <div className="w-full max-w-md">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-zinc-400">{progress}%</p>
            </div>
          )}
        </div>
      )}

      {isFailed && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">
              {status?.error || 'Generation failed.'}
            </p>
          </div>
          <button
            onClick={() => handleGenerate()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}

      {isIdle && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
              {type === 'notes' ? 'Generate Lecture Notes' : 'Generate Core Principles'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              {type === 'notes'
                ? 'Generate detailed, professor-quality explanations for every slide in this lecture.'
                : 'Extract the core principles, key equations, and concepts from the lecture notes.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Model:</label>
            <ModelSelect
              value={model}
              onChange={setModel}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            />
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending
              ? 'Starting...'
              : type === 'notes'
                ? 'Generate Lecture Notes'
                : 'Generate Core Principles'}
          </button>

          {type === 'principles' && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Requires lecture notes to be generated first.
            </p>
          )}

          {mutationError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {(mutationError as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="size-6 animate-spin text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}
