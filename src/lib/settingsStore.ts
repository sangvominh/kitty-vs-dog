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
import { loadSettings, saveDifficulty, saveDataSource, type GameSettings } from './settingsStorage';
import type { DataSource } from '../game/state/spriteTypes';

export type MenuScreen = 'main-menu' | 'playing' | 'customizing';

interface SettingsStore {
  /** Whether settings have been loaded from IndexedDB */
  loaded: boolean;
  /** Current menu screen */
  screen: MenuScreen;
  /** Selected difficulty ID */
  difficultyId: DifficultyId;
  /** Sprite data source */
  dataSource: DataSource;
  /** Full settings from storage */
  settings: GameSettings | null;

  /** Computed: current difficulty config */
  getDifficultyConfig: () => DifficultyLevel;

  /** Actions */
  setScreen: (screen: MenuScreen) => void;
  setDifficulty: (id: DifficultyId) => void;
  setDataSource: (ds: DataSource) => void;
  loadFromStorage: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  loaded: false,
  screen: 'main-menu',
  difficultyId: DEFAULT_DIFFICULTY,
  dataSource: 'cache',
  settings: null,

  getDifficultyConfig: () => getDifficulty(get().difficultyId),

  setScreen: (screen) => set({ screen }),

  setDifficulty: (id) => {
    set({ difficultyId: id });
    saveDifficulty(id).catch(console.warn);
  },

  setDataSource: (ds) => {
    set({ dataSource: ds });
    saveDataSource(ds).catch(console.warn);
  },

  loadFromStorage: async () => {
    try {
      const settings = await loadSettings();
      set({
        loaded: true,
        difficultyId: settings.difficulty,
        dataSource: settings.dataSource ?? 'cache',
        settings,
      });
      console.log(
        '[SettingsStore] Loaded settings, difficulty:',
        settings.difficulty,
        'dataSource:',
        settings.dataSource,
      );
    } catch (err) {
      console.warn('[SettingsStore] Failed to load, using defaults:', err);
      set({ loaded: true });
    }
  },
}));
