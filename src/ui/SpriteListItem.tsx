/**
 * SpriteListItem — renders a single sprite thumbnail row in the customization list.
 * Displays level label, thumbnail, filename, and a remove button.
 */

import type { CustomImage } from '../game/state/spriteTypes';

interface SpriteListItemProps {
  image: CustomImage;
  index: number;
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
  onRemove,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isOver = false,
}: SpriteListItemProps) {
  // Create a thumbnail URL from the blob key
  const thumbnailUrl = useThumbnailUrl(image.id);

  return (
    <li
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, index) : undefined}
      onDragOver={draggable ? (e) => onDragOver?.(e, index) : undefined}
      onDrop={draggable ? (e) => onDrop?.(e, index) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={`flex items-center gap-3 p-2 rounded border transition-all
        ${isDragging ? 'opacity-30' : ''}
        ${isOver && !isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'}
        ${draggable ? 'cursor-grab' : ''}
      `}
    >
      <span className="text-gray-400 text-sm w-8 flex-shrink-0">Lv {index + 1}</span>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={image.fileName}
          className="w-10 h-10 object-contain rounded bg-gray-700"
          draggable={false}
        />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
          <span className="text-gray-500 text-xs">...</span>
        </div>
      )}
      <span className="text-sm text-gray-200 truncate flex-1">{image.fileName}</span>
      <button
        onClick={() => onRemove(image.id)}
        className="text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded p-1 flex-shrink-0 transition-colors"
        title="Remove"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </li>
  );
}

/**
 * Hook to get a thumbnail URL for a custom image from IndexedDB.
 */
import { useState, useEffect } from 'react';
import { useSpriteStore } from '../game/state/spriteStore';

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
