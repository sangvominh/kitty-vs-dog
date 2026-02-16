/**
 * SpriteSlotPanel — manages upload, list display, and clear-all for one entity slot.
 * Updated to use frosted glass grid card design.
 */

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { useSpriteStore } from '../game/state/spriteStore';
import { SpriteListItem } from './SpriteListItem';
import type { EntityId, CustomImage } from '../game/state/spriteTypes';

interface SpriteSlotPanelProps {
  entityId: EntityId;
  label: string;
}

export function SpriteSlotPanel({ entityId, label: _label }: SpriteSlotPanelProps) {
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

  const SLOT_LABELS = ['Đứng yên', 'Chạy', 'Nhảy', 'Tấn công', 'Bị đánh', 'Chiến thắng'];

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex items-center gap-4">
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
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm cursor-pointer font-bold transition-all shadow-sm
            ${
              isLoading
                ? 'bg-slate-200 text-slate-400 cursor-wait'
                : 'bg-[var(--color-primary)] hover:bg-blue-600 text-white shadow-[var(--color-primary)]/30'
            }
          `}
        >
          {isLoading ? (
            <>
              <span className="material-icons-round animate-spin text-base">sync</span>
              Đang tải...
            </>
          ) : (
            <>
              <span className="material-icons-round text-base">cloud_upload</span>
              Tải ảnh lên
            </>
          )}
        </label>
        <span className="text-xs text-slate-400">PNG, JPG, WebP, GIF — tối đa 5MB</span>
        {images.length > 0 && (
          <button
            onClick={handleClearAll}
            className="ml-auto text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors font-semibold flex items-center gap-1"
          >
            <span className="material-icons-round text-sm">delete_sweep</span>
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Error message */}
      {errorMessage && loadingSlot === entityId && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
          <span className="material-icons-round text-base">error_outline</span>
          {errorMessage}
        </div>
      )}

      {/* Sprite Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Filled slots */}
        {images.map((image: CustomImage, index: number) => (
          <SpriteListItem
            key={image.id}
            image={image}
            index={index}
            slotLabel={SLOT_LABELS[index] || `Ảnh ${index + 1}`}
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

        {/* Empty slots (up to 6 total) */}
        {Array.from({ length: Math.max(0, 6 - images.length) }).map((_, i) => {
          const emptyIndex = images.length + i;
          const slotLabel = SLOT_LABELS[emptyIndex] || `Ô ${emptyIndex + 1}`;
          return (
            <label
              key={`empty-${i}`}
              htmlFor={`upload-${entityId}`}
              className="dash-border group aspect-square rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer bg-white/10 hover:bg-[var(--color-primary)]/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)] text-[var(--color-primary)] group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                <span className="material-icons-round text-2xl">add</span>
              </div>
              <span className="text-sm font-bold text-slate-600 group-hover:text-[var(--color-primary)]">
                {slotLabel}
              </span>
              <span className="text-xs text-slate-400 mt-1">Thả ảnh PNG vào đây</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
