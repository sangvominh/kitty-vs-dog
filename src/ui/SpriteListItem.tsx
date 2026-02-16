/**
 * SpriteListItem — renders a single sprite as a glass card tile in the customization grid.
 * Displays slot label, thumbnail, filename, and hover action buttons.
 */

import { useState, useEffect } from 'react';
import { useSpriteStore } from '../game/state/spriteStore';
import type { CustomImage } from '../game/state/spriteTypes';

interface SpriteListItemProps {
  image: CustomImage;
  index: number;
  slotLabel?: string;
  onRemove: (imageId: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isOver?: boolean;
}

export function SpriteListItem({
  image,
  index,
  slotLabel,
  onRemove,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isOver = false,
}: SpriteListItemProps) {
  const thumbnailUrl = useThumbnailUrl(image.id);

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, index) : undefined}
      onDragOver={draggable ? (e) => onDragOver?.(e, index) : undefined}
      onDrop={draggable ? (e) => onDrop?.(e, index) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={`group relative aspect-square bg-white/40 rounded-lg border hover:border-[var(--color-primary)]/30 hover:bg-white/70 transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col items-center justify-center p-4
        ${isDragging ? 'opacity-30 scale-95' : ''}
        ${isOver && !isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg' : 'border-white'}
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
    >
      {/* Hover action buttons */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <button
          onClick={() => onRemove(image.id)}
          className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-red-500 shadow-sm flex items-center justify-center transition-colors"
          title="Xóa"
        >
          <span className="material-icons-round text-sm">close</span>
        </button>
      </div>

      {/* Thumbnail */}
      <div className="flex-1 w-full flex items-center justify-center relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={image.fileName}
            className="max-h-32 object-contain drop-shadow-md"
            draggable={false}
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center">
            <span className="material-icons-round text-slate-300 text-3xl">image</span>
          </div>
        )}
      </div>

      {/* Label bar */}
      <div className="w-full mt-3 flex items-center justify-between border-t border-slate-200/50 pt-3">
        <span className="text-sm font-bold text-slate-700">{slotLabel || `Lv ${index + 1}`}</span>
        {index === 0 && (
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
            Đang dùng
          </span>
        )}
        {index > 0 && (
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
            {image.fileName}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to get a thumbnail URL for a custom image from IndexedDB.
 */
function useThumbnailUrl(imageId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const getImageBlob = useSpriteStore((s) => s.getImageBlob);

  useEffect(() => {
    let revoke: string | null = null;

    (async () => {
      const blob = await getImageBlob(imageId);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        setUrl(objectUrl);
      }
    })();

    return () => {
      if (revoke) {
        URL.revokeObjectURL(revoke);
      }
    };
  }, [imageId, getImageBlob]);

  return url;
}
