/**
 * Zustand store for game background management.
 * Supports preset procedural backgrounds + custom uploaded images.
 * Persisted to IndexedDB via idb-keyval.
 */

import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';

// ── Preset background IDs ──────────────────────────────────────────
export type PresetBackgroundId =
  | 'night-sky'
  | 'sunset-city'
  | 'sakura'
  | 'neon-grid'
  | 'deep-ocean';

export type BackgroundId = PresetBackgroundId | 'custom';

export interface PresetInfo {
  id: PresetBackgroundId;
  name: string;
  emoji: string;
  /** Short description */
  description: string;
}

export const PRESET_BACKGROUNDS: PresetInfo[] = [
  {
    id: 'night-sky',
    name: 'Bầu Trời Đêm',
    emoji: '🌙',
    description: 'Sao lấp lánh trên nền galaxy',
  },
  {
    id: 'sunset-city',
    name: 'Hoàng Hôn',
    emoji: '🌇',
    description: 'Thành phố trong ánh chiều tà',
  },
  {
    id: 'sakura',
    name: 'Hoa Anh Đào',
    emoji: '🌸',
    description: 'Cánh hoa rơi nhẹ nhàng',
  },
  {
    id: 'neon-grid',
    name: 'Neon Retro',
    emoji: '💜',
    description: 'Lưới neon phong cách 80s',
  },
  {
    id: 'deep-ocean',
    name: 'Đại Dương',
    emoji: '🌊',
    description: 'Dưới lòng đại dương sâu thẳm',
  },
];

// ── IndexedDB keys ─────────────────────────────────────────────────
const BG_SETTINGS_KEY = 'bg-settings';
const BG_CUSTOM_BLOB_KEY = 'bg-custom-blob';
const BG_CUSTOM_TEXTURE_KEY = '__bg_custom_upload';

interface BgSettings {
  selectedBg: BackgroundId;
}

// ── Store interface ────────────────────────────────────────────────
export interface BackgroundStoreState {
  selectedBg: BackgroundId;
  customBlobUrl: string | null; // Runtime object URL for preview
  isLoaded: boolean;
  errorMessage: string | null;

  /** The Phaser texture key for custom background (if loaded) */
  customTextureKey: string;

  // Actions
  loadFromStorage: () => Promise<void>;
  setBackground: (id: BackgroundId) => void;
  uploadCustom: (file: File) => Promise<void>;
  removeCustom: () => Promise<void>;
  getCustomBlob: () => Promise<Blob | null>;
}

export const useBackgroundStore = create<BackgroundStoreState>((set, get) => ({
  selectedBg: 'night-sky',
  customBlobUrl: null,
  isLoaded: false,
  errorMessage: null,
  customTextureKey: BG_CUSTOM_TEXTURE_KEY,

  loadFromStorage: async () => {
    try {
      const settings = await idbGet<BgSettings>(BG_SETTINGS_KEY);
      const customBlob = await idbGet<Blob>(BG_CUSTOM_BLOB_KEY);

      let customBlobUrl: string | null = null;
      if (customBlob) {
        customBlobUrl = URL.createObjectURL(customBlob);
      }

      set({
        selectedBg: settings?.selectedBg ?? 'night-sky',
        customBlobUrl,
        isLoaded: true,
        errorMessage: null,
      });
    } catch (err) {
      console.warn('[backgroundStore] Failed to load:', err);
      set({ isLoaded: true, errorMessage: 'Failed to load background settings' });
    }
  },

  setBackground: (id: BackgroundId) => {
    // If selecting custom but no custom blob exists, ignore
    if (id === 'custom' && !get().customBlobUrl) {
      set({ errorMessage: 'Chưa có ảnh nền tùy chỉnh. Hãy upload ảnh trước.' });
      return;
    }
    set({ selectedBg: id, errorMessage: null });
    // Persist
    idbSet(BG_SETTINGS_KEY, { selectedBg: id } as BgSettings).catch(console.warn);
  },

  uploadCustom: async (file: File) => {
    // Validate
    if (!file.type.startsWith('image/')) {
      set({ errorMessage: 'File phải là ảnh (PNG, JPG, WebP)' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      set({ errorMessage: 'Ảnh quá lớn (tối đa 10MB)' });
      return;
    }

    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await idbSet(BG_CUSTOM_BLOB_KEY, blob);

      // Revoke old URL
      const oldUrl = get().customBlobUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      const newUrl = URL.createObjectURL(blob);
      set({
        customBlobUrl: newUrl,
        selectedBg: 'custom',
        errorMessage: null,
      });

      // Auto-select custom
      await idbSet(BG_SETTINGS_KEY, { selectedBg: 'custom' } as BgSettings);
    } catch (err) {
      console.warn('[backgroundStore] Upload failed:', err);
      set({ errorMessage: 'Upload thất bại' });
    }
  },

  removeCustom: async () => {
    try {
      await idbDel(BG_CUSTOM_BLOB_KEY);
      const oldUrl = get().customBlobUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      const newBg: BackgroundId = get().selectedBg === 'custom' ? 'night-sky' : get().selectedBg;
      set({ customBlobUrl: null, selectedBg: newBg, errorMessage: null });

      await idbSet(BG_SETTINGS_KEY, { selectedBg: newBg } as BgSettings);
    } catch (err) {
      console.warn('[backgroundStore] Remove failed:', err);
    }
  },

  getCustomBlob: async () => {
    try {
      return (await idbGet<Blob>(BG_CUSTOM_BLOB_KEY)) ?? null;
    } catch {
      return null;
    }
  },
}));

// ── idb-keyval wrappers (typed) ────────────────────────────────────
async function idbGet<T>(key: string): Promise<T | undefined> {
  return get<T>(key);
}
async function idbSet<T>(key: string, value: T): Promise<void> {
  return set(key, value);
}
async function idbDel(key: string): Promise<void> {
  return del(key);
}
