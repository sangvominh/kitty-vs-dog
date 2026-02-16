/**
 * BackgroundPicker — UI panel for selecting preset backgrounds or uploading custom.
 * Rendered as a tab inside CustomizeOverlay. Glass card style.
 */

import { useRef } from 'react';
import { useBackgroundStore, PRESET_BACKGROUNDS } from '../game/state/backgroundStore';

export function BackgroundPicker() {
  const selectedBg = useBackgroundStore((s) => s.selectedBg);
  const customBlobUrl = useBackgroundStore((s) => s.customBlobUrl);
  const errorMessage = useBackgroundStore((s) => s.errorMessage);
  const setBackground = useBackgroundStore((s) => s.setBackground);
  const uploadCustom = useBackgroundStore((s) => s.uploadCustom);
  const removeCustom = useBackgroundStore((s) => s.removeCustom);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadCustom(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Preset grid — glass card style */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {PRESET_BACKGROUNDS.map((preset) => {
          const isSelected = selectedBg === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setBackground(preset.id)}
              className={`group relative aspect-square bg-white/40 rounded-lg border hover:border-[var(--color-primary)]/30 hover:bg-white/70 transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col items-center justify-center p-4
                ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg ring-2 ring-[var(--color-primary)]/20' : 'border-white'}
              `}
            >
              {/* Check mark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-md z-10">
                  <span className="material-icons-round text-white text-sm">check</span>
                </div>
              )}

              <div className="flex-1 w-full flex items-center justify-center">
                <span className="text-5xl group-hover:scale-110 transition-transform">
                  {preset.emoji}
                </span>
              </div>

              <div className="w-full mt-3 border-t border-slate-200/50 pt-3 text-center">
                <span className="text-sm font-bold text-slate-700 block">{preset.name}</span>
                <span className="text-[11px] text-slate-400 leading-tight">
                  {preset.description}
                </span>
              </div>
            </button>
          );
        })}

        {/* Custom upload card */}
        <button
          onClick={() => {
            if (customBlobUrl) {
              setBackground('custom');
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`group relative aspect-square rounded-lg flex flex-col items-center justify-center p-4 transition-all duration-300 shadow-sm hover:shadow-lg
            ${
              selectedBg === 'custom'
                ? 'bg-[var(--color-primary)]/5 border-2 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                : customBlobUrl
                  ? 'bg-white/40 border border-white hover:border-[var(--color-primary)]/30 hover:bg-white/70'
                  : 'dash-border bg-white/10 hover:bg-[var(--color-primary)]/5'
            }
          `}
        >
          {selectedBg === 'custom' && (
            <div className="absolute top-3 right-3 w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-md z-10">
              <span className="material-icons-round text-white text-sm">check</span>
            </div>
          )}

          <div className="flex-1 w-full flex items-center justify-center">
            {customBlobUrl ? (
              <img
                src={customBlobUrl}
                alt="Custom"
                className="max-h-32 object-contain rounded-lg drop-shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)] text-[var(--color-primary)] group-hover:text-white flex items-center justify-center transition-colors">
                <span className="material-icons-round text-2xl">add_photo_alternate</span>
              </div>
            )}
          </div>

          <div className="w-full mt-3 border-t border-slate-200/50 pt-3 text-center">
            <span className="text-sm font-bold text-slate-700 block">
              {customBlobUrl ? 'Ảnh của bạn' : 'Upload ảnh'}
            </span>
            <span className="text-[11px] text-slate-400">PNG, JPG, WebP (≤10MB)</span>
          </div>
        </button>
      </div>

      {/* Custom actions */}
      {customBlobUrl && (
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 bg-white/50 hover:bg-white border border-white/60 transition-colors flex items-center gap-2"
          >
            <span className="material-icons-round text-base">swap_horiz</span>
            Đổi ảnh
          </button>
          <button
            onClick={removeCustom}
            className="px-4 py-2 rounded-full text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <span className="material-icons-round text-base">delete</span>
            Xóa ảnh
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
          <span className="material-icons-round text-base">error_outline</span>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
