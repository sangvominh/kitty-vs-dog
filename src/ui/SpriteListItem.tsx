/**
 * ActionSlotCard — renders a single action-state slot card.
 * Shows action icon/label, thumbnail (if uploaded), upload and remove buttons.
 */

import { useState, useEffect, useRef, useId } from 'react';
import { useSpriteStore } from '../game/state/spriteStore';
import type { ActionState, ActionImage } from '../game/state/spriteTypes';

interface ActionSlotCardProps {
  action: ActionState;
  label: string;
  icon: string;
  image: ActionImage | null;
  isLoading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function ActionSlotCard({
  action,
  label,
  icon,
  image,
  isLoading,
  onUpload,
  onRemove,
}: ActionSlotCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailUrl = useThumbnailUrl(image?.id ?? null);
  const stableId = useId();
  const inputId = `upload-${stableId}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`group relative bg-white/40 rounded-lg border hover:border-[var(--color-primary)]/30 hover:bg-white/70 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col p-3
        ${image ? 'border-white' : 'border-dashed border-slate-300'}
      `}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <span className="material-icons-round animate-spin text-xl text-[var(--color-primary)]">
            sync
          </span>
        </div>
      )}

      {image && thumbnailUrl ? (
        <>
          {/* Thumbnail + action icon */}
          <div className="flex items-center gap-2 min-h-[72px]">
            <img
              src={thumbnailUrl}
              alt={`${label} sprite`}
              className="w-16 h-16 object-contain rounded drop-shadow-sm flex-shrink-0"
              draggable={false}
            />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="material-icons-round text-xl text-[var(--color-primary)]">
                  {icon}
                </span>
                <span className="text-sm font-bold text-slate-700 truncate">{label}</span>
              </div>
              <span className="text-[10px] text-green-600 font-semibold mt-0.5">✓ Đã tải</span>
            </div>
          </div>

          {/* Action buttons — always visible */}
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
            <button
              type="button"
              onClick={triggerUpload}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-md bg-white/60 hover:bg-[var(--color-primary)]/10 text-slate-600 hover:text-[var(--color-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="material-icons-round text-base">edit</span>
              Đổi
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-md bg-white/60 hover:bg-red-50 text-slate-600 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <span className="material-icons-round text-base">delete</span>
              Xóa
            </button>
          </div>
        </>
      ) : (
        /* Empty state — upload prompt */
        <button
          type="button"
          onClick={triggerUpload}
          className="flex flex-col items-center justify-center cursor-pointer w-full py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)] text-[var(--color-primary)] group-hover:text-white flex items-center justify-center mb-2 transition-colors">
            <span className="material-icons-round text-3xl">{icon}</span>
          </div>
          <span className="text-sm font-bold text-slate-600 group-hover:text-[var(--color-primary)]">
            {label}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Thả hoặc chọn ảnh</span>
        </button>
      )}
    </div>
  );
}

/**
 * Hook to get a thumbnail URL for a custom image from IndexedDB.
 */
function useThumbnailUrl(imageId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const getImageBlob = useSpriteStore((s) => s.getImageBlob);

  useEffect(() => {
    if (!imageId) {
      return;
    }

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
