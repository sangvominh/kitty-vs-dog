/**
 * Zustand store for sprite configuration.
 * Bridges React UI ↔ Phaser game for custom sprite management.
 */

import { create } from 'zustand';
import type { EntityId, SpriteConfig, CustomImage } from './spriteTypes';
import { createEmptySpriteConfig } from './spriteTypes';
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

  // Runtime state (not persisted)
  isLoaded: boolean;
  loadingSlot: EntityId | null;
  errorMessage: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  addImage: (entityId: EntityId, file: File) => Promise<void>;
  removeImage: (entityId: EntityId, imageId: string) => Promise<void>;
  reorderImages: (entityId: EntityId, fromIndex: number, toIndex: number) => void;
  clearSlot: (entityId: EntityId) => Promise<void>;
  getTextureKeyForLevel: (entityId: EntityId, level: number) => string | null;
  getTextureKeyForWave: (entityId: EntityId, wave: number) => string | null;
  getRandomTextureKeyForWave: (entityId: EntityId, wave: number) => string | null;
  getImageBlob: (imageId: string) => Promise<Blob | null>;
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
      if (saved) {
        set({ config: saved, isLoaded: true, errorMessage: null });
      } else {
        set({ config: createEmptySpriteConfig(), isLoaded: true, errorMessage: null });
      }
    } catch (err) {
      console.error('[spriteStore] Failed to load config:', err);
      set({
        config: createEmptySpriteConfig(),
        isLoaded: true,
        errorMessage: 'Failed to load sprite configuration',
      });
    }
  },

  addImage: async (entityId: EntityId, file: File) => {
    // Validate file metadata
    const validation = validateImageFile(file);
    if (!validation.valid) {
      set({ errorMessage: validation.error ?? 'Invalid file' });
      return;
    }

    set({ loadingSlot: entityId, errorMessage: null });

    try {
      // Decode image to get dimensions
      const dims = await decodeImageDimensions(file);

      // Generate unique ID
      const imageId = `${entityId}-${nanoid(8)}`;
      const blobKey = `blob:${imageId}`;
      const order = get().config.slots[entityId].images.length;
      const textureKey = `${entityId}-custom-${order}`;

      // Store blob
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await saveImageBlob(imageId, blob);

      // Create image record
      const customImage: CustomImage = {
        id: imageId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        width: dims.width,
        height: dims.height,
        blobKey,
        textureKey,
        order,
        createdAt: Date.now(),
      };

      // Update config
      const config = { ...get().config };
      const slot = { ...config.slots[entityId] };
      slot.images = [...slot.images, customImage];
      config.slots = { ...config.slots, [entityId]: slot };

      await saveConfig(config);
      set({ config, loadingSlot: null, errorMessage: null });
    } catch (err) {
      console.error('[spriteStore] Failed to add image:', err);
      set({
        loadingSlot: null,
        errorMessage: err instanceof Error ? err.message : 'Failed to upload image',
      });
    }
  },

  removeImage: async (entityId: EntityId, imageId: string) => {
    try {
      // Delete blob
      await deleteImageBlob(imageId);

      // Update config
      const config = { ...get().config };
      const slot = { ...config.slots[entityId] };
      slot.images = slot.images
        .filter((img) => img.id !== imageId)
        .map((img, index) => ({
          ...img,
          order: index,
          textureKey: `${entityId}-custom-${index}`,
        }));
      config.slots = { ...config.slots, [entityId]: slot };

      await saveConfig(config);
      set({ config, errorMessage: null });
    } catch (err) {
      console.error('[spriteStore] Failed to remove image:', err);
      set({ errorMessage: 'Failed to remove image' });
    }
  },

  reorderImages: (entityId: EntityId, fromIndex: number, toIndex: number) => {
    const config = { ...get().config };
    const slot = { ...config.slots[entityId] };
    const images = [...slot.images];

    // Splice to reorder
    const [moved] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, moved);

    // Re-index
    slot.images = images.map((img, index) => ({
      ...img,
      order: index,
      textureKey: `${entityId}-custom-${index}`,
    }));
    config.slots = { ...config.slots, [entityId]: slot };

    set({ config });

    // Persist (debounced — fire and forget)
    saveConfig(config).catch((err) =>
      console.warn('[spriteStore] Failed to persist reorder:', err),
    );
  },

  clearSlot: async (entityId: EntityId) => {
    try {
      const config = { ...get().config };
      const slot = config.slots[entityId];

      // Delete all blobs for this slot
      for (const img of slot.images) {
        await deleteImageBlob(img.id);
      }

      // Clear images
      const newSlot = { ...slot, images: [] };
      config.slots = { ...config.slots, [entityId]: newSlot };

      await saveConfig(config);
      set({ config, errorMessage: null });
    } catch (err) {
      console.error('[spriteStore] Failed to clear slot:', err);
      set({ errorMessage: 'Failed to clear slot' });
    }
  },

  getTextureKeyForLevel: (entityId: EntityId, level: number): string | null => {
    const images = get().config.slots[entityId].images;
    if (images.length === 0) return null;
    const index = Math.min(level - 1, images.length - 1);
    return images[index].textureKey;
  },

  getTextureKeyForWave: (entityId: EntityId, wave: number): string | null => {
    const images = get().config.slots[entityId].images;
    if (images.length === 0) return null;
    const index = Math.min(Math.floor((wave - 1) / 2), images.length - 1);
    return images[index].textureKey;
  },

  /**
   * Weighted-random texture selection for enemies.
   * Each spawn picks randomly from the sprite pool for that entity type.
   * The "preferred" image (based on wave) has the highest weight,
   * and earlier/later images are still possible but less likely.
   */
  getRandomTextureKeyForWave: (entityId: EntityId, wave: number): string | null => {
    const images = get().config.slots[entityId].images;
    if (images.length === 0) return null;
    if (images.length === 1) return images[0].textureKey;

    // Preferred index based on wave progression (same formula as deterministic)
    const preferred = Math.min(Math.floor((wave - 1) / 2), images.length - 1);

    // Build weights: preferred gets highest, decreasing with distance
    const weights: number[] = [];
    for (let i = 0; i < images.length; i++) {
      weights.push(Math.max(1, images.length - Math.abs(i - preferred)));
    }

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return images[i].textureKey;
    }

    // Fallback (shouldn't reach here)
    return images[preferred].textureKey;
  },

  getImageBlob: async (imageId: string): Promise<Blob | null> => {
    return loadImageBlob(imageId);
  },
}));
