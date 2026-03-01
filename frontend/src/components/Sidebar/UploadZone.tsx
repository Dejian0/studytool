import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFiles } from '../../api/courses';

interface Props {
  course: string;
}

export default function UploadZone({ course }: Props) {
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<'slides' | 'exams'>('slides');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (files: File[]) => uploadFiles(course, folder, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', course] });
    },
  });

  // Auto-clear the success message after 3 seconds
  useEffect(() => {
    if (!mutation.isSuccess) return;
    const t = setTimeout(() => mutation.reset(), 3000);
    return () => clearTimeout(t);
  }, [mutation.isSuccess]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      if (pdfs.length > 0) mutation.mutate(pdfs);
    },
    [mutation],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Upload
      </h3>

      <div className="mb-2 flex gap-2 text-sm">
        {(['slides', 'exams'] as const).map((f) => (
          <label key={f} className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="folder"
              checked={folder === f}
              onChange={() => setFolder(f)}
              className="accent-blue-600"
            />
            <span className="capitalize text-zinc-600 dark:text-zinc-400">{f}</span>
          </label>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-3 py-4 text-center text-sm transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
            : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {mutation.isPending ? (
          <span>Uploading...</span>
        ) : (
          <span>Drop PDFs here or click to browse</span>
        )}
      </div>

      {mutation.isError && (
        <p className="mt-1 text-xs text-red-500">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
          Uploaded {mutation.data.uploaded.length} file(s)
        </p>
      )}
    </div>
  );
}
