import { useCallback, useRef, useState } from 'react';

interface Props {
  onResize: (fraction: number) => void;
  min?: number;
  max?: number;
}

export default function ResizeHandle({ onResize, min = 0.25, max = 0.75 }: Props) {
  const [dragging, setDragging] = useState(false);
  const parentRef = useRef<HTMLElement | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const handle = e.currentTarget;
      const parent = handle.parentElement;
      if (!parent) return;
      parentRef.current = parent;

      handle.setPointerCapture(e.pointerId);
      setDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!parentRef.current) return;
      const rect = parentRef.current.getBoundingClientRect();
      const raw = (e.clientX - rect.left) / rect.width;
      const clamped = Math.min(max, Math.max(min, raw));
      onResize(clamped);
    },
    [onResize, min, max],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      parentRef.current = null;
      setDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    [],
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={dragging ? handlePointerMove : undefined}
      onPointerUp={dragging ? handlePointerUp : undefined}
      className={`group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center
        ${dragging ? 'bg-blue-500/30' : 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700'}`}
    >
      <div className="flex flex-col gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 w-1 rounded-full ${
              dragging
                ? 'bg-blue-500'
                : 'bg-zinc-400 group-hover:bg-zinc-500 dark:bg-zinc-600 dark:group-hover:bg-zinc-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
