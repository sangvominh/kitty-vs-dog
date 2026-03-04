/**
 * Zustand store for sprite configuration.
 * Bridges React UI ↔ Phaser game for action-based custom sprite management.
 * Supports both cache (IndexedDB) and local-data sources.
 */

import { create } from 'zustand';
import type { EntityId, ActionState, SpriteConfig, ActionImage } from './spriteTypes';
import { createEmptySpriteConfig, createEmptyLevel, textureKeyFor } from './spriteTypes';
import { validateImageFile, decodeImageDimensions } from '../../lib/imageValidator';
import {
  saveConfig,
  loadConfig as loadConfigFromDB,
  saveImageBlob,
  deleteImageBlob,
  loadImageBlob,
} from '../../lib/spriteStorage';

export interface SpriteStoreState {
  // Config data (persisted to IndexedDB)
  config: SpriteConfig;

  // Runtime state
  isLoaded: boolean;
  loadingSlot: string | null; // "entityId-levelIndex-action"
  errorMessage: string | null;

  // Actions — config
  loadConfig: () => Promise<void>;
  setActionImage: (
    entityId: EntityId,
    levelIndex: number,
    action: ActionState,
    file: File,
  ) => Promise<void>;
  removeActionImage: (entityId: EntityId, levelIndex: number, action: ActionState) => Promise<void>;
  clearLevel: (entityId: EntityId, levelIndex: number) => Promise<void>;

  // Actions — boss levels
  addBossLevel: () => void;
  removeBossLevel: (levelIndex: number) => Promise<void>;

  // Queries
  getTextureKey: (entityId: EntityId, levelIndex: number, action: ActionState) => string | null;
  getImageBlob: (imageId: string) => Promise<Blob | null>;
  getActionImage: (
    entityId: EntityId,
    levelIndex: number,
    action: ActionState,
  ) => ActionImage | null;
}

/** Generate a short unique ID */
function nanoid(size: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const values = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    id += chars[values[i] % chars.length];
  }
  return id;
}

export const useSpriteStore = create<SpriteStoreState>((set, get) => ({
  config: createEmptySpriteConfig(),
  isLoaded: false,
  loadingSlot: null,
  errorMessage: null,

  loadConfig: async () => {
    try {
      const saved = await loadConfigFromDB();
      if (saved && saved.version === 2) {
        set({ config: saved, isLoaded: true, errorMessage: null });
      } else {
        // Version mismatch or no data — start fresh
        const fresh = createEmptySpriteConfig();
        set({ config: fresh, isLoaded: true, errorMessage: null });
      }
    } catch (err) {
      console.error('[spriteStore] Failed to load config:', err);
      set({
        config: createEmptySpriteConfig(),
        isLoaded: true,
        errorMessage: 'Không tải được cấu hình sprite',
      });
    }
  },

  setActionImage: async (entityId, levelIndex, action, file) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      set({ errorMessage: validation.error ?? 'File không hợp lệ' });
      return;
    }

    const slotKey = `${entityId}-${levelIndex}-${action}`;
    set({ loadingSlot: slotKey, errorMessage: null });

    try {
      const dims = await decodeImageDimensions(file);
      const imageId = `${entityId}-${levelIndex}-${action}-${nanoid(6)}`;
      const tKey = textureKeyFor(entityId, levelIndex, action);

      // Store blob
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await saveImageBlob(imageId, blob);

      const actionImage: ActionImage = {
        id: imageId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        width: dims.width,
        height: dims.height,
        blobKey: `blob:${imageId}`,
        textureKey: tKey,
        createdAt: Date.now(),
      };

      // Delete old blob if replacing
      const config = structuredClone(get().config);
      const oldImage = config.slots[entityId].levels[levelIndex]?.actions[action];
      if (oldImage) {
        await deleteImageBlob(oldImage.id).catch(() => {});
      }

      // Ensure level exists
      while (config.slots[entityId].levels.length <= levelIndex) {
        config.slots[entityId].levels.push(createEmptyLevel());
      }

      config.slots[entityId].levels[levelIndex].actions[action] = actionImage;
      config.lastModified = Date.now();

      await saveConfig(config);
      set({ config, loadingSlot: null, errorMessage: null });
    } catch (err) {
      console.error('[spriteStore] Failed to set action image:', err);
      set({
        loadingSlot: null,
        errorMessage: err instanceof Error ? err.message : 'Tải ảnh thất bại',
      });
    }
  },

  removeActionImage: async (entityId, levelIndex, action) => {
    try {
      const config = structuredClone(get().config);
      const level = config.slots[entityId].levels[levelIndex];
      if (!level) return;

      const image = level.actions[action];
      if (image) {
        await deleteImageBlob(image.id);
        delete level.actions[action];
        config.lastModified = Date.now();
        await saveConfig(config);
        set({ config, errorMessage: null });
      }
    } catch (err) {
      console.error('[spriteStore] Failed to remove action image:', err);
      set({ errorMessage: 'Xóa ảnh thất bại' });
    }
  },

  clearLevel: async (entityId, levelIndex) => {
    try {
      const config = structuredClone(get().config);
      const level = config.slots[entityId].levels[levelIndex];
      if (!level) return;

      for (const img of Object.values(level.actions)) {
        if (img) await deleteImageBlob(img.id);
      }

      level.actions = {};
      config.lastModified = Date.now();
      await saveConfig(config);
      set({ config, errorMessage: null });
    } catch (err) {
      console.error('[spriteStore] Failed to clear level:', err);
      set({ errorMessage: 'Xóa level thất bại' });
    }
  },

  addBossLevel: () => {
    const config = structuredClone(get().config);
    config.slots.boss.levels.push(createEmptyLevel());
    config.lastModified = Date.now();
    set({ config });
    saveConfig(config).catch(console.warn);
  },

  removeBossLevel: async (levelIndex) => {
    try {
      const config = structuredClone(get().config);
      const levels = config.slots.boss.levels;
      if (levels.length <= 1) return; // keep at least 1 level

      const level = levels[levelIndex];
      if (level) {
        for (const img of Object.values(level.actions)) {
          if (img) await deleteImageBlob(img.id);
        }
      }

      levels.splice(levelIndex, 1);
      config.lastModified = Date.now();
      await saveConfig(config);
      set({ config, errorMessage: null });
    } catch (err) {
      console.error('[spriteStore] Failed to remove boss level:', err);
      set({ errorMessage: 'Xóa boss level thất bại' });
    }
  },

  getTextureKey: (entityId, levelIndex, action) => {
    const level = get().config.slots[entityId]?.levels[levelIndex];
    if (!level) return null;
    const image = level.actions[action];
    return image?.textureKey ?? null;
  },

  getActionImage: (entityId, levelIndex, action) => {
    const level = get().config.slots[entityId]?.levels[levelIndex];
    if (!level) return null;
    return level.actions[action] ?? null;
  },

  getImageBlob: async (imageId) => {
    return loadImageBlob(imageId);
  },
}));
