import { useState, useEffect } from 'react';

interface Props {
  imageBlob: Blob;
  onCancel: () => void;
  onAskAI?: () => void;
}

export default function CropPreview({ imageBlob, onCancel, onAskAI }: Props) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(imageBlob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  return (
    <div
      className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-zinc-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/95"
      onClick={(e) => e.stopPropagation()}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Cropped region"
          className="max-h-24 rounded border border-zinc-200 dark:border-zinc-700"
        />
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onAskAI}
          disabled={!onAskAI}
          className={
            onAskAI
              ? 'rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-purple-700'
              : 'cursor-not-allowed rounded-md bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500'
          }
        >
          Ask AI about this
        </button>

        <button
          onClick={onCancel}
          className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
          title="Cancel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
