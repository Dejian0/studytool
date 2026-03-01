import type { TextBlock } from '../../types';

interface Props {
  blocks: TextBlock[];
  pdfWidth: number;
  pdfHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  selectedIds: Set<number>;
  onBlockClick: (id: number, event: React.MouseEvent) => void;
  disabled?: boolean;
}

export default function TextOverlay({
  blocks,
  pdfWidth,
  pdfHeight,
  renderedWidth,
  renderedHeight,
  selectedIds,
  onBlockClick,
  disabled = false,
}: Props) {
  if (renderedWidth === 0 || renderedHeight === 0) return null;

  const scaleX = renderedWidth / pdfWidth;
  const scaleY = renderedHeight / pdfHeight;

  return (
    <>
      {blocks.map((block) => {
        const [x0, y0, x1, y1] = block.bbox;
        const isSelected = selectedIds.has(block.id);
        const fontSize = block.lines[0]?.spans[0]?.size ?? 12;

        return (
          <div
            key={block.id}
            onClick={(e) => {
              if (disabled) return;
              e.stopPropagation();
              onBlockClick(block.id, e);
            }}
            className={`absolute select-text rounded-sm transition-colors duration-75${
              disabled ? '' : ' pointer-events-auto cursor-pointer'
            }${
              isSelected
                ? ' ring-2 ring-blue-500/60 bg-blue-500/15'
                : disabled ? '' : ' hover:bg-blue-500/10'
            }`}
            style={{
              left: x0 * scaleX,
              top: y0 * scaleY,
              width: (x1 - x0) * scaleX,
              height: (y1 - y0) * scaleY,
              fontSize: fontSize * scaleY,
              lineHeight: 1.2,
              color: 'transparent',
              overflow: 'hidden',
              wordBreak: 'break-all',
            }}
          >
            {block.text}
          </div>
        );
      })}
    </>
  );
}
