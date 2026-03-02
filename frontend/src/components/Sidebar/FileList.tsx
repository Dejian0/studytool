import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCourseFiles, deleteFile } from '../../api/courses';
import ErrorMessage from '../ErrorMessage';

interface Props {
  course: string;
  selected: string | null;
  onSelect: (file: string) => void;
  onDelete?: (file: string) => void;
}

export default function FileList({ course, selected, onSelect, onDelete }: Props) {
  const queryClient = useQueryClient();
  const { data: files = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['files', course, 'slides'],
    queryFn: () => fetchCourseFiles(course, 'slides'),
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => deleteFile(course, 'slides', filename),
    onSuccess: (_data, filename) => {
      queryClient.invalidateQueries({ queryKey: ['files', course, 'slides'] });
      queryClient.invalidateQueries({ queryKey: ['generateStatus'] });
      queryClient.invalidateQueries({ queryKey: ['note'] });
      onDelete?.(filename);
    },
  });

  function handleDelete(e: React.MouseEvent, filename: string) {
    e.stopPropagation();
    if (!confirm(`Delete "${filename}" and its associated notes?`)) return;
    deleteMutation.mutate(filename);
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Slides
      </h3>

      {isError ? (
        <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="py-2 text-sm text-zinc-500">Loading...</p>
      ) : files.length === 0 ? (
        <p className="py-2 text-sm text-zinc-500">No PDFs uploaded</p>
      ) : (
        <ul className="space-y-0.5">
          {files.map((f) => (
            <li key={f}>
              <button
                onClick={() => onSelect(f)}
                title={f}
                className={`group w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  f === selected
                    ? 'bg-blue-600/10 font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-red-500/70">
                    <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                  </svg>
                  <span className="flex-1 truncate">{f}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleDelete(e, f)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(e as unknown as React.MouseEvent, f); }}
                    className="ml-auto hidden shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-300 hover:text-red-600 group-hover:inline-flex dark:hover:bg-zinc-700 dark:hover:text-red-400"
                    title={`Delete ${f}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                    </svg>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
