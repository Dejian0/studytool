import { useState, useEffect } from 'react';
import type { ChatContext } from '../../types';

interface Props {
  context: ChatContext;
  onUpdate: (context: ChatContext) => void;
}

export default function ContextIndicator({ context, onUpdate }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!context.cropped_image_base64) {
      setThumbUrl(null);
      return;
    }
    const url = `data:image/png;base64,${context.cropped_image_base64}`;
    setThumbUrl(url);
  }, [context.cropped_image_base64]);

  const items: { label: string; onRemove?: () => void; thumb?: string | null }[] = [];

  items.push({ label: `Slide ${context.page} notes` });

  if (context.selected_text) {
    const preview =
      context.selected_text.length > 50
        ? context.selected_text.slice(0, 50) + '\u2026'
        : context.selected_text;
    items.push({
      label: `"${preview}"`,
      onRemove: () => onUpdate({ ...context, selected_text: null }),
    });
  }

  if (context.cropped_image_base64) {
    items.push({
      label: 'Cropped region',
      thumb: thumbUrl,
      onRemove: () => onUpdate({ ...context, cropped_image_base64: null }),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          {item.thumb && (
            <img src={item.thumb} alt="" className="h-4 w-4 rounded object-cover" />
          )}
          <span className="max-w-[160px] truncate">{item.label}</span>
          {item.onRemove && (
            <button
              onClick={item.onRemove}
              className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
