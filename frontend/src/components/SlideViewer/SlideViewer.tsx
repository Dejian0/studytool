import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPageCount, fetchPageText, slideImageUrl } from '../../api/slides';
import ErrorMessage from '../ErrorMessage';
import TextOverlay from '../TextOverlay/TextOverlay';
import SelectionToolbar from '../TextOverlay/SelectionToolbar';
import RegionCrop from '../RegionCrop/RegionCrop';
import CropPreview from '../RegionCrop/CropPreview';

interface Props {
  course: string;
  filename: string;
  page: number;
  onPageChange: (page: number) => void;
  onSwitchToNotes?: () => void;
}

export default function SlideViewer({ course, filename, page, onPageChange, onSwitchToNotes }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pageInput, setPageInput] = useState(String(page));
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [imgRect, setImgRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const imgRef = useCallback((node: HTMLImageElement | null) => {
    setImgElement(node);
  }, []);

  const { data: pageCountData, isError, error, refetch } = useQuery({
    queryKey: ['pageCount', course, filename],
    queryFn: () => fetchPageCount(course, filename),
  });

  const totalPages = pageCountData?.count ?? 0;

  const { data: textData } = useQuery({
    queryKey: ['pageText', course, filename, page],
    queryFn: () => fetchPageText(course, filename, page),
    enabled: totalPages > 0,
  });

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    setSelectedBlockIds(new Set());
    setLastSelectedId(null);
    setCroppedImage(null);
  }, [page, course, filename]);

  useEffect(() => {
    if (!imgElement) {
      setImgRect({ left: 0, top: 0, width: 0, height: 0 });
      return;
    }
    function update() {
      if (!imgElement) return;
      setImgRect({
        left: imgElement.offsetLeft,
        top: imgElement.offsetTop,
        width: imgElement.offsetWidth,
        height: imgElement.offsetHeight,
      });
    }
    const observer = new ResizeObserver(update);
    observer.observe(imgElement);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imgElement]);

  const goTo = useCallback(
    (p: number) => {
      if (totalPages === 0) return;
      const clamped = Math.max(1, Math.min(p, totalPages));
      onPageChange(clamped);
      setImageLoaded(false);
    },
    [totalPages, onPageChange],
  );

  const prev = useCallback(() => goTo(page - 1), [goTo, page]);
  const next = useCallback(() => goTo(page + 1), [goTo, page]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') {
        if (cropMode) {
          setCropMode(false);
          setCroppedImage(null);
        } else {
          setSelectedBlockIds(new Set());
          setLastSelectedId(null);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next, cropMode]);

  function handlePageInputSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) goTo(n);
  }

  function handleBlockClick(blockId: number, event: React.MouseEvent) {
    if (event.shiftKey && lastSelectedId !== null && textData) {
      const ids = textData.blocks.map((b) => b.id);
      const startIdx = ids.indexOf(lastSelectedId);
      const endIdx = ids.indexOf(blockId);
      if (startIdx !== -1 && endIdx !== -1) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeSet = new Set(selectedBlockIds);
        for (let i = lo; i <= hi; i++) {
          rangeSet.add(ids[i]);
        }
        setSelectedBlockIds(rangeSet);
      }
    } else if (event.ctrlKey || event.metaKey) {
      const toggled = new Set(selectedBlockIds);
      if (toggled.has(blockId)) toggled.delete(blockId);
      else toggled.add(blockId);
      setSelectedBlockIds(toggled);
      setLastSelectedId(blockId);
    } else {
      setSelectedBlockIds(new Set([blockId]));
      setLastSelectedId(blockId);
    }
  }

  function clearSelection() {
    setSelectedBlockIds(new Set());
    setLastSelectedId(null);
  }

  function toggleCropMode() {
    if (cropMode) {
      setCropMode(false);
      setCroppedImage(null);
    } else {
      setCropMode(true);
      setSelectedBlockIds(new Set());
      setLastSelectedId(null);
    }
  }

  const handleCropComplete = useCallback((blob: Blob) => {
    setCroppedImage(blob);
  }, []);

  function getSelectedText(): string {
    if (!textData || selectedBlockIds.size === 0) return '';
    return textData.blocks
      .filter((b) => selectedBlockIds.has(b.id))
      .map((b) => b.text)
      .join('\n');
  }

  function handleCopy() {
    const text = getSelectedText();
    if (text) navigator.clipboard.writeText(text);
  }

  const imgSrc = totalPages > 0 ? slideImageUrl(course, filename, page) : '';
  const selectedText = getSelectedText();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Slide image area */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-auto bg-zinc-200/50 p-4 dark:bg-zinc-900/50"
        onClick={clearSelection}
      >
        {isError ? (
          <div className="max-w-sm" onClick={(e) => e.stopPropagation()}>
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
              ref={imgRef}
              key={`${course}-${filename}-${page}`}
              src={imgSrc}
              alt={`${filename} - Page ${page}`}
              onLoad={() => setImageLoaded(true)}
              className={`max-h-full max-w-full rounded shadow-lg transition-opacity ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              draggable={false}
            />
            {imageLoaded && textData && imgRect.width > 0 && (
              <div
                className="pointer-events-none absolute overflow-hidden rounded"
                style={{
                  left: imgRect.left,
                  top: imgRect.top,
                  width: imgRect.width,
                  height: imgRect.height,
                }}
              >
                <TextOverlay
                  blocks={textData.blocks}
                  pdfWidth={textData.width}
                  pdfHeight={textData.height}
                  renderedWidth={imgRect.width}
                  renderedHeight={imgRect.height}
                  selectedIds={selectedBlockIds}
                  onBlockClick={handleBlockClick}
                  disabled={cropMode}
                />
              </div>
            )}
            {cropMode && imageLoaded && imgElement && imgRect.width > 0 && (
              <div
                className="absolute overflow-hidden rounded"
                style={{
                  left: imgRect.left,
                  top: imgRect.top,
                  width: imgRect.width,
                  height: imgRect.height,
                }}
              >
                <RegionCrop
                  renderedWidth={imgRect.width}
                  renderedHeight={imgRect.height}
                  imgElement={imgElement}
                  onCropComplete={handleCropComplete}
                />
              </div>
            )}
            {!cropMode && selectedBlockIds.size > 0 && selectedText && (
              <SelectionToolbar
                selectedText={selectedText}
                onCopy={handleCopy}
                onClear={clearSelection}
              />
            )}
            {croppedImage && (
              <CropPreview
                imageBlob={croppedImage}
                onCancel={() => setCroppedImage(null)}
              />
            )}
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

          <div className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />

          <button
            onClick={toggleCropMode}
            className={`rounded p-1 transition-colors ${
              cropMode
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            title={cropMode ? 'Exit crop mode (Esc)' : 'Select region'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 2.5H3.5A1 1 0 0 0 2.5 3.5V7M13 2.5h3.5A1 1 0 0 1 17.5 3.5V7M17.5 13v3.5a1 1 0 0 1-1 1H13M2.5 13v3.5a1 1 0 0 0 1 1H7" />
            </svg>
          </button>

          {onSwitchToNotes && (
            <>
              <div className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
              <button
                onClick={onSwitchToNotes}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                title="Lecture Notes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}

          <span className="ml-2 truncate text-xs text-zinc-400 dark:text-zinc-600">{filename}</span>
        </nav>
      )}
    </div>
  );
}
