/**
 * BackgroundPicker — UI panel for selecting preset backgrounds or uploading custom.
 * Rendered as a tab inside CustomizeOverlay.
 */

import { useRef } from 'react';
import {
  useBackgroundStore,
  PRESET_BACKGROUNDS,
  type BackgroundId,
} from '../game/state/backgroundStore';

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
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Chọn phong cảnh cho trận đấu</p>

      {/* Preset grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PRESET_BACKGROUNDS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setBackground(preset.id)}
            className={`relative flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all
              ${
                selectedBg === preset.id
                  ? 'border-blue-400 bg-blue-400/10'
                  : 'border-gray-600 bg-gray-700/40 hover:border-gray-400 hover:bg-gray-700/60'
              }
            `}
          >
            <span className="text-2xl">{preset.emoji}</span>
            <span className="text-sm font-medium text-white">{preset.name}</span>
            <span className="text-[11px] text-gray-400 text-center leading-tight">
              {preset.description}
            </span>
            {selectedBg === preset.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}

        {/* Custom upload card */}
        <button
          onClick={() => {
            if (customBlobUrl) {
              setBackground('custom');
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex flex-col items-center gap-1 p-4 rounded-xl border-2 border-dashed transition-all
            ${
              selectedBg === 'custom'
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-gray-500 bg-gray-700/30 hover:border-gray-300 hover:bg-gray-700/50'
            }
          `}
        >
          {customBlobUrl ? (
            <img src={customBlobUrl} alt="Custom" className="w-12 h-12 object-cover rounded-lg" />
          ) : (
            <span className="text-2xl">📤</span>
          )}
          <span className="text-sm font-medium text-white">
            {customBlobUrl ? 'Ảnh của bạn' : 'Upload ảnh'}
          </span>
          <span className="text-[11px] text-gray-400 text-center leading-tight">
            PNG, JPG, WebP (≤10MB)
          </span>
          {selectedBg === 'custom' && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* Custom actions */}
      {customBlobUrl && (
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Đổi ảnh
          </button>
          <button
            onClick={removeCustom}
            className="px-3 py-1.5 text-xs text-red-400 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-colors"
          >
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
      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
    </div>
  );
}
