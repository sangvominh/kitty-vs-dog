/**
 * SpriteSlotPanel — action-based sprite grid for one entity.
 * Shows 6 action-state cards (2×3 grid) per level.
 * Boss entities support multiple levels with add/remove.
 */

import { useState } from 'react';
import { useSpriteStore } from '../game/state/spriteStore';
import { ACTION_STATES, ACTION_LABELS, ACTION_ICONS } from '../game/state/spriteTypes';
import type { EntityId, ActionState } from '../game/state/spriteTypes';
import { ActionSlotCard } from './SpriteListItem';

interface SpriteSlotPanelProps {
  entityId: EntityId;
}

export function SpriteSlotPanel({ entityId }: SpriteSlotPanelProps) {
  const levels = useSpriteStore((s) => s.config.slots[entityId].levels);
  const addBossLevel = useSpriteStore((s) => s.addBossLevel);
  const removeBossLevel = useSpriteStore((s) => s.removeBossLevel);
  const setActionImage = useSpriteStore((s) => s.setActionImage);
  const removeActionImage = useSpriteStore((s) => s.removeActionImage);
  const clearLevel = useSpriteStore((s) => s.clearLevel);
  const loadingSlot = useSpriteStore((s) => s.loadingSlot);
  const errorMessage = useSpriteStore((s) => s.errorMessage);

  const isBoss = entityId === 'boss';
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);

  // Clamp active level index
  const safeIndex = Math.min(activeLevelIndex, levels.length - 1);
  if (safeIndex !== activeLevelIndex) setActiveLevelIndex(safeIndex);

  const currentLevel = levels[safeIndex];

  const handleUpload = async (action: ActionState, file: File) => {
    await setActionImage(entityId, safeIndex, action, file);
  };

  const handleRemove = async (action: ActionState) => {
    await removeActionImage(entityId, safeIndex, action);
  };

  const handleClearLevel = () => {
    clearLevel(entityId, safeIndex);
  };

  const handleAddLevel = () => {
    addBossLevel();
    setActiveLevelIndex(levels.length); // will be new last index
  };

  const handleRemoveLevel = (idx: number) => {
    removeBossLevel(idx);
    if (activeLevelIndex >= levels.length - 1) {
      setActiveLevelIndex(Math.max(0, levels.length - 2));
    }
  };

  const hasAnyImage = currentLevel && Object.keys(currentLevel.actions).length > 0;

  return (
    <div className="space-y-4">
      {/* Boss Level Tabs */}
      {isBoss && (
        <div className="flex items-center gap-2 flex-wrap">
          {levels.map((_, idx) => {
            const isActive = idx === safeIndex;
            const levelActionCount = Object.keys(levels[idx].actions).length;
            return (
              <div key={idx} className="relative group">
                <button
                  onClick={() => setActiveLevelIndex(idx)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                      : 'bg-white/40 hover:bg-white/70 text-slate-600'
                  }`}
                >
                  <span className="material-icons-round text-base">
                    {levelActionCount > 0 ? 'folder' : 'folder_open'}
                  </span>
                  Level {idx + 1}
                  {levelActionCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-slate-200'}`}
                    >
                      {levelActionCount}/6
                    </span>
                  )}
                </button>
                {/* Delete button on hover, if more than 1 level */}
                {levels.length > 1 && (
                  <button
                    onClick={() => handleRemoveLevel(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                    title={`Xóa Level ${idx + 1}`}
                  >
                    <span className="material-icons-round" style={{ fontSize: '12px' }}>
                      close
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Add level button */}
          <button
            onClick={handleAddLevel}
            className="px-4 py-2 rounded-full text-sm font-bold bg-white/30 hover:bg-green-50 text-green-600 hover:text-green-700 border-2 border-dashed border-green-300 hover:border-green-400 transition-all flex items-center gap-1"
          >
            <span className="material-icons-round text-base">add</span>
            Thêm Level
          </button>
        </div>
      )}

      {/* Controls Row */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-400">PNG, JPG, WebP, GIF — tối đa 5MB</span>
        {hasAnyImage && (
          <button
            onClick={handleClearLevel}
            className="ml-auto text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors font-semibold flex items-center gap-1"
          >
            <span className="material-icons-round text-sm">delete_sweep</span>
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Error message */}
      {errorMessage && loadingSlot?.startsWith(`${entityId}-${safeIndex}`) && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
          <span className="material-icons-round text-base">error_outline</span>
          {errorMessage}
        </div>
      )}

      {/* Action State Grid (2×3) */}
      <div className="grid grid-cols-3 gap-3">
        {ACTION_STATES.map((action) => {
          const image = currentLevel?.actions[action] ?? null;
          const slotKey = `${entityId}-${safeIndex}-${action}`;
          const isLoading = loadingSlot === slotKey;

          return (
            <ActionSlotCard
              key={action}
              action={action}
              label={ACTION_LABELS[action]}
              icon={ACTION_ICONS[action]}
              image={image}
              isLoading={isLoading}
              onUpload={(file) => handleUpload(action, file)}
              onRemove={() => handleRemove(action)}
            />
          );
        })}
      </div>
    </div>
  );
}
