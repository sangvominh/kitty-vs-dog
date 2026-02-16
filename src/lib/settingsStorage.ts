/**
 * Settings persistence layer using idb-keyval.
 * Stores game settings (difficulty, preferences) in IndexedDB.
 * Falls back to defaults if no saved data exists.
 */
import { get, set } from 'idb-keyval';
import { DEFAULT_DIFFICULTY, type DifficultyId } from '../game/state/difficultyConfig';

const SETTINGS_KEY = 'game-settings';

export interface GameSettings {
  difficulty: DifficultyId;
  /** Last played timestamp */
  lastPlayed: number;
  /** Total games played */
  gamesPlayed: number;
  /** Best wave reached per difficulty */
  bestWaves: Partial<Record<DifficultyId, number>>;
  /** Sound enabled flag (future-proof) */
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: DEFAULT_DIFFICULTY,
  lastPlayed: 0,
  gamesPlayed: 0,
  bestWaves: {},
  soundEnabled: true,
};

/** Load settings from IndexedDB. Returns defaults if nothing saved. */
export async function loadSettings(): Promise<GameSettings> {
  try {
    const saved = await get<GameSettings>(SETTINGS_KEY);
    if (saved) {
      // Merge with defaults to cover any new fields added later
      return { ...DEFAULT_SETTINGS, ...saved };
    }
  } catch (err) {
    console.warn('[settingsStorage] Failed to load settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

/** Save settings to IndexedDB */
export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    await set(SETTINGS_KEY, { ...settings, lastPlayed: Date.now() });
  } catch (err) {
    console.warn('[settingsStorage] Failed to save settings:', err);
  }
}

/** Save only the difficulty setting */
export async function saveDifficulty(difficulty: DifficultyId): Promise<void> {
  const current = await loadSettings();
  current.difficulty = difficulty;
  await saveSettings(current);
}

/** Record a game completion, updating stats */
export async function recordGameEnd(waveReached: number, difficulty: DifficultyId): Promise<void> {
  const current = await loadSettings();
  current.gamesPlayed++;
  const prevBest = current.bestWaves[difficulty] ?? 0;
  if (waveReached > prevBest) {
    current.bestWaves[difficulty] = waveReached;
  }
  await saveSettings(current);
}
