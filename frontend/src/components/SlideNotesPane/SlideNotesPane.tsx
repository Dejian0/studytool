import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startGenerateNotes,
  fetchGenerateNotesStatus,
  fetchNote,
} from '../../api/notes';
import type { GenerateStatus } from '../../types';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { getSlideSection } from '../../utils/parseSlideNotes';

interface Props {
  course: string;
  filename: string;
  page: number;
}

function notesFilename(pdfName: string): string {
  return pdfName.replace(/\.pdf$/i, '') + '_lecture_notes.md';
}

export default function SlideNotesPane({ course, filename, page }: Props) {
  const queryClient = useQueryClient();
  const [model, setModel] = useState('gpt-5-mini');
  const noteFile = notesFilename(filename);

  const { data: status } = useQuery<GenerateStatus>({
    queryKey: ['generateStatus', 'notes', course, filename],
    queryFn: () => fetchGenerateNotesStatus(course, filename),
    refetchInterval: (query) =>
      query.state.data?.status === 'running' ? 2000 : false,
  });

  const { data: noteData, isLoading: noteLoading } = useQuery({
    queryKey: ['note', course, noteFile],
    queryFn: () => fetchNote(course, noteFile),
    enabled: status?.status === 'completed',
  });

  const generateMutation = useMutation({
    mutationFn: () => startGenerateNotes(course, filename, model),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['generateStatus', 'notes', course, filename],
      });
    },
  });

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const isIdle = !status || status.status === 'idle';

  const progress =
    isRunning && status.total_slides > 0
      ? Math.round((status.current_slide / status.total_slides) * 100)
      : 0;

  const slideSection = useMemo(() => {
    if (!noteData?.content) return null;
    return getSlideSection(noteData.content, page);
  }, [noteData?.content, page]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4 shrink-0 text-zinc-400"
        >
          <path
            fillRule="evenodd"
            d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Slide {page} Notes
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {isCompleted && (
          <>
            {noteLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
                <span className="ml-2 text-sm text-zinc-500">Loading...</span>
              </div>
            ) : slideSection ? (
              <div className="p-4">
                <MarkdownRenderer content={slideSection} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  No notes for slide {page}.
                </p>
              </div>
            )}
          </>
        )}

        {isRunning && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12">
            <Spinner />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Generating notes... Slide {status.current_slide} of{' '}
              {status.total_slides}
            </p>
            {status.total_slides > 0 && (
              <div className="w-full max-w-xs">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-xs text-zinc-400">
                  {progress}%
                </p>
              </div>
            )}
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-400">
                {status?.error || 'Generation failed.'}
              </p>
            </div>
            <button
              onClick={() => generateMutation.mutate()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {isIdle && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12">
            <p className="max-w-xs text-center text-sm text-zinc-500 dark:text-zinc-400">
              Generate lecture notes to see per-slide explanations here.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">
                Model:
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <option value="gpt-5.2">gpt-5.2</option>
                <option value="gpt-5-mini">gpt-5-mini</option>
                <option value="gpt-5-nano">gpt-5-nano</option>
              </select>
            </div>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Starting...' : 'Generate Notes'}
            </button>
            {generateMutation.isError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {(generateMutation.error as Error).message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="size-5 animate-spin text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}
