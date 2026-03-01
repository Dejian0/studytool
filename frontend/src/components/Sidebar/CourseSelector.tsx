import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCourses, createCourse } from '../../api/courses';
import ErrorMessage from '../ErrorMessage';

interface Props {
  selected: string | null;
  onSelect: (course: string) => void;
}

export default function CourseSelector({ selected, onSelect }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const { data: courses = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  });

  const mutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      onSelect(data.name);
      setName('');
      setShowForm(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) mutation.mutate(trimmed);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Courses
        </h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title="New course"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-2 flex gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Course name"
            autoFocus
            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !name.trim()}
            className="rounded bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}

      {isError ? (
        <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="py-2 text-sm text-zinc-500">Loading...</p>
      ) : courses.length === 0 ? (
        <p className="py-2 text-sm text-zinc-500">No courses yet</p>
      ) : (
        <ul className="space-y-0.5">
          {courses.map((c) => (
            <li key={c}>
              <button
                onClick={() => onSelect(c)}
                className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  c === selected
                    ? 'bg-blue-600/10 font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
