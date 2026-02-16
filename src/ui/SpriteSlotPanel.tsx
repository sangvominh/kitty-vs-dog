/**
 * SpriteSlotPanel — manages upload, list display, and clear-all for one entity slot.
 */

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { useSpriteStore } from '../game/state/spriteStore';
import { SpriteListItem } from './SpriteListItem';
import type { EntityId, CustomImage } from '../game/state/spriteTypes';

interface SpriteSlotPanelProps {
  entityId: EntityId;
  label: string;
}

export function SpriteSlotPanel({ entityId, label }: SpriteSlotPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = useSpriteStore((s) => s.config.slots[entityId].images);
  const loadingSlot = useSpriteStore((s) => s.loadingSlot);
  const errorMessage = useSpriteStore((s) => s.errorMessage);
  const addImage = useSpriteStore((s) => s.addImage);
  const removeImage = useSpriteStore((s) => s.removeImage);
  const reorderImages = useSpriteStore((s) => s.reorderImages);
  const clearSlot = useSpriteStore((s) => s.clearSlot);

  const isLoading = loadingSlot === entityId;

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      await addImage(entityId, file);
    }

    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = useCallback(
    (imageId: string) => {
      removeImage(entityId, imageId);
    },
    [entityId, removeImage],
  );

  const handleClearAll = () => {
    clearSlot(entityId);
  };

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      reorderImages(entityId, dragIndex, dropIndex);
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, entityId, reorderImages],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        {images.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id={`upload-${entityId}`}
        />
        <label
          htmlFor={`upload-${entityId}`}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors
            ${isLoading ? 'bg-gray-600 text-gray-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'}
          `}
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span> Uploading...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Upload Images
            </>
          )}
        </label>
        <span className="text-xs text-gray-500 ml-2">PNG, JPG, WebP, GIF — max 5MB each</span>
      </div>

      {/* Error message */}
      {errorMessage && loadingSlot === entityId && (
        <p className="text-sm text-red-400 bg-red-900/20 px-3 py-1 rounded">{errorMessage}</p>
      )}

      {/* Image list */}
      {images.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {images.map((image: CustomImage, index: number) => (
            <SpriteListItem
              key={image.id}
              image={image}
              index={index}
              onRemove={handleRemove}
              draggable={images.length > 1}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragging={dragIndex === index}
              isOver={overIndex === index}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No custom sprites — default shape will be used
        </p>
      )}
    </div>
  );
}
