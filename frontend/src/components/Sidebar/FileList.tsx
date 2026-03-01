import { useQuery } from '@tanstack/react-query';
import { fetchCourseFiles } from '../../api/courses';
import ErrorMessage from '../ErrorMessage';

interface Props {
  course: string;
  selected: string | null;
  onSelect: (file: string) => void;
}

export default function FileList({ course, selected, onSelect }: Props) {
  const { data: files = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['files', course, 'slides'],
    queryFn: () => fetchCourseFiles(course, 'slides'),
  });

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
                className={`w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  f === selected
                    ? 'bg-blue-600/10 font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-red-500/70">
                    <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
                  </svg>
                  {f}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
