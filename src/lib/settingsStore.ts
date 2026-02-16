/**
 * Zustand store for game settings & difficulty.
 * Persisted to IndexedDB via settingsStorage.
 */
import { create } from 'zustand';
import {
  DEFAULT_DIFFICULTY,
  getDifficulty,
  type DifficultyId,
  type DifficultyLevel,
} from '../game/state/difficultyConfig';
import { loadSettings, saveDifficulty, type GameSettings } from './settingsStorage';

export type MenuScreen = 'main-menu' | 'playing' | 'customizing';

interface SettingsStore {
  /** Whether settings have been loaded from IndexedDB */
  loaded: boolean;
  /** Current menu screen */
  screen: MenuScreen;
  /** Selected difficulty ID */
  difficultyId: DifficultyId;
  /** Full settings from storage */
  settings: GameSettings | null;

  /** Computed: current difficulty config */
  getDifficultyConfig: () => DifficultyLevel;

  /** Actions */
  setScreen: (screen: MenuScreen) => void;
  setDifficulty: (id: DifficultyId) => void;
  loadFromStorage: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  loaded: false,
  screen: 'main-menu',
  difficultyId: DEFAULT_DIFFICULTY,
  settings: null,

  getDifficultyConfig: () => getDifficulty(get().difficultyId),

  setScreen: (screen) => set({ screen }),

  setDifficulty: (id) => {
    set({ difficultyId: id });
    // Persist asynchronously
    saveDifficulty(id).catch(console.warn);
  },

  loadFromStorage: async () => {
    try {
      const settings = await loadSettings();
      set({
        loaded: true,
        difficultyId: settings.difficulty,
        settings,
      });
      console.log('[SettingsStore] Loaded settings, difficulty:', settings.difficulty);
    } catch (err) {
      console.warn('[SettingsStore] Failed to load, using defaults:', err);
      set({ loaded: true });
    }
  },
}));
