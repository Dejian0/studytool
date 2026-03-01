import { useState } from 'react';

interface Props {
  selectedText: string;
  onCopy: () => void;
  onClear: () => void;
}

export default function SelectionToolbar({ selectedText, onCopy, onClear }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayText =
    selectedText.length > 120 ? selectedText.slice(0, 120) + '\u2026' : selectedText;

  return (
    <div
      className="absolute bottom-6 left-1/2 z-20 flex max-w-lg -translate-x-1/2 items-center gap-3 rounded-lg border border-zinc-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/95"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="min-w-0 flex-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
        {displayText}
      </p>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={handleCopy}
          className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>

        <button
          disabled
          className="cursor-not-allowed rounded-md bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
          title="Coming in Phase 7"
        >
          Ask AI
        </button>

        <button
          onClick={onClear}
          className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
          title="Clear selection"
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
