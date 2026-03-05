import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCourses, createCourse, fetchCourseFiles, deleteFile, uploadFiles } from '../../api/courses';
import ErrorMessage from '../ErrorMessage';

interface Props {
  selectedCourse: string | null;
  onSelectCourse: (course: string) => void;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  onDeleteFile?: (file: string) => void;
}

export default function CourseTree({
  selectedCourse,
  onSelectCourse,
  selectedFile,
  onSelectFile,
  onDeleteFile,
}: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (selectedCourse) {
      setExpanded((prev) => {
        if (prev.has(selectedCourse)) return prev;
        return new Set(prev).add(selectedCourse);
      });
    }
  }, [selectedCourse]);

  const { data: courses = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  });

  const createMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      onSelectCourse(data.name);
      setName('');
      setShowForm(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) createMutation.mutate(trimmed);
  }

  function toggleExpand(course: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(course)) next.delete(course);
      else next.add(course);
      return next;
    });
  }

  function handleCourseClick(course: string) {
    onSelectCourse(course);
    toggleExpand(course);
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
            disabled={createMutation.isPending || !name.trim()}
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
          {courses.map((c) => {
            const isSelected = c === selectedCourse;
            const isExpanded = expanded.has(c);
            return (
              <li key={c}>
                <button
                  onClick={() => handleCourseClick(c)}
                  className={`flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-600/10 font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`size-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  >
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{c}</span>
                </button>

                {isExpanded && (
                  <CourseFiles
                    course={c}
                    selectedFile={isSelected ? selectedFile : null}
                    onSelectCourse={onSelectCourse}
                    onSelect={onSelectFile}
                    onDelete={onDeleteFile}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CourseFiles({
  course,
  selectedFile,
  onSelectCourse,
  onSelect,
  onDelete,
}: {
  course: string;
  selectedFile: string | null;
  onSelectCourse: (course: string) => void;
  onSelect: (file: string) => void;
  onDelete?: (file: string) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadMutation = useMutation({
    mutationFn: (uploadedFiles: File[]) => uploadFiles(course, 'slides', uploadedFiles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', course, 'slides'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  function handleDelete(e: React.MouseEvent, filename: string) {
    e.stopPropagation();
    if (!confirm(`Delete "${filename}" and its associated notes?`)) return;
    deleteMutation.mutate(filename);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length > 0) uploadMutation.mutate(pdfs);
  }

  if (isError) {
    return (
      <div className="pl-6 pr-1 pt-1">
        <ErrorMessage message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return <p className="py-1 pl-7 text-xs text-zinc-500">Loading...</p>;
  }

  const addButton = (
    <li>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="flex w-full items-center gap-1.5 rounded py-1 pl-7 pr-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        {uploadMutation.isPending ? 'Uploading...' : 'Add slides'}
      </button>
      {uploadMutation.isError && (
        <p className="pl-7 text-xs text-red-500">{(uploadMutation.error as Error).message}</p>
      )}
    </li>
  );

  return (
    <ul className="space-y-0.5 py-0.5">
      {files.map((f) => (
        <li key={f}>
          <button
            onClick={() => { onSelectCourse(course); onSelect(f); }}
            title={f}
            className={`group w-full truncate rounded py-1 pl-7 pr-2 text-left text-sm transition-colors ${
              f === selectedFile
                ? 'bg-blue-600/10 font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0 text-red-500/70">
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
      {addButton}
    </ul>
  );
}