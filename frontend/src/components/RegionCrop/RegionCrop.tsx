import { useState, useCallback, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Props {
  renderedWidth: number;
  renderedHeight: number;
  imgElement: HTMLImageElement;
  onCropComplete: (blob: Blob) => void;
}

const MIN_DRAG_PX = 5;

export default function RegionCrop({
  renderedWidth,
  renderedHeight,
  imgElement,
  onCropComplete,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const origin = useRef<Point>({ x: 0, y: 0 });
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const toLocal = useCallback(
    (e: React.PointerEvent): Point => {
      const b = overlayRef.current!.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(e.clientX - b.left, renderedWidth)),
        y: Math.max(0, Math.min(e.clientY - b.top, renderedHeight)),
      };
    },
    [renderedWidth, renderedHeight],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      origin.current = toLocal(e);
      setRect(null);
    },
    [toLocal],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const p = toLocal(e);
      const o = origin.current;
      setRect({
        x: Math.min(o.x, p.x),
        y: Math.min(o.y, p.y),
        w: Math.abs(p.x - o.x),
        h: Math.abs(p.y - o.y),
      });
    },
    [toLocal],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const p = toLocal(e);
      const o = origin.current;
      const x = Math.min(o.x, p.x);
      const y = Math.min(o.y, p.y);
      const w = Math.abs(p.x - o.x);
      const h = Math.abs(p.y - o.y);

      setRect(null);

      if (w < MIN_DRAG_PX || h < MIN_DRAG_PX) return;

      const sx = imgElement.naturalWidth / renderedWidth;
      const sy = imgElement.naturalHeight / renderedHeight;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * sx);
      canvas.height = Math.round(h * sy);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        imgElement,
        Math.round(x * sx),
        Math.round(y * sy),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      canvas.toBlob((blob) => {
        if (blob) onCropComplete(blob);
      }, 'image/png');
    },
    [toLocal, imgElement, renderedWidth, renderedHeight, onCropComplete],
  );

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {rect && rect.w > 0 && rect.h > 0 && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-blue-500 bg-blue-500/20"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
          }}
        />
      )}
    </div>
  );
}
