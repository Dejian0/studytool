import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPageCount, slideImageUrl } from '../../api/slides';
import ErrorMessage from '../ErrorMessage';

interface Props {
  course: string;
  filename: string;
}

export default function SlideViewer({ course, filename }: Props) {
  const [page, setPage] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pageInput, setPageInput] = useState('1');

  const { data: pageCountData, isError, error, refetch } = useQuery({
    queryKey: ['pageCount', course, filename],
    queryFn: () => fetchPageCount(course, filename),
  });

  const totalPages = pageCountData?.count ?? 0;

  // Reset to page 1 when switching files
  useEffect(() => {
    setPage(1);
    setPageInput('1');
  }, [course, filename]);

  // Keep input in sync with page
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goTo = useCallback(
    (p: number) => {
      if (totalPages === 0) return;
      const clamped = Math.max(1, Math.min(p, totalPages));
      setPage(clamped);
      setImageLoaded(false);
    },
    [totalPages],
  );

  const prev = useCallback(() => goTo(page - 1), [goTo, page]);
  const next = useCallback(() => goTo(page + 1), [goTo, page]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next]);

  function handlePageInputSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) goTo(n);
  }

  const imgSrc = totalPages > 0 ? slideImageUrl(course, filename, page) : '';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Slide image area */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-zinc-200/50 p-4 dark:bg-zinc-900/50">
        {isError ? (
          <div className="max-w-sm">
            <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />
          </div>
        ) : totalPages > 0 ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="size-8 animate-spin text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                </svg>
              </div>
            )}
            <img
              key={`${course}-${filename}-${page}`}
              src={imgSrc}
              alt={`${filename} - Page ${page}`}
              onLoad={() => setImageLoaded(true)}
              className={`max-h-full max-w-full rounded shadow-lg transition-opacity ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              draggable={false}
            />
          </>
        ) : (
          <p className="text-zinc-400 dark:text-zinc-600">Loading slide...</p>
        )}
      </div>

      {/* Navigation bar */}
      {totalPages > 0 && (
        <nav className="flex items-center justify-center gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={prev}
            disabled={page <= 1}
            className="rounded p-1 text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Page</span>
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(page))}
              className="w-12 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-center text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-zinc-500 dark:text-zinc-400">of {totalPages}</span>
          </form>

          <button
            onClick={next}
            disabled={page >= totalPages}
            className="rounded p-1 text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          <span className="ml-2 truncate text-xs text-zinc-400 dark:text-zinc-600">{filename}</span>
        </nav>
      )}
    </div>
  );
}
