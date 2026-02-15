import { create } from 'zustand';

export type GameState = 'playing' | 'level-up' | 'game-over';
export type UpgradeType = 'tether-length' | 'damage' | 'speed';

export interface GameStore {
  // Health
  health: number;
  maxHealth: number;
  setHealth: (hp: number) => void;

  // Ammo
  kittyAmmo: number;
  doggoStamina: number;
  setKittyAmmo: (n: number) => void;
  setDoggoStamina: (n: number) => void;

  // Coins & Level
  coins: number;
  level: number;
  nextLevelThreshold: number;
  setCoins: (n: number) => void;
  setLevel: (n: number) => void;
  setNextLevelThreshold: (n: number) => void;

  // Timer & Wave
  elapsedTime: number;
  waveNumber: number;
  setElapsedTime: (ms: number) => void;
  setWaveNumber: (n: number) => void;

  // Game State
  gameState: GameState;
  setGameState: (state: GameState) => void;

  // Level-Up Selection
  selectedUpgrade: UpgradeType | null;
  setSelectedUpgrade: (u: UpgradeType | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  health: 100,
  maxHealth: 100,
  kittyAmmo: 10,
  doggoStamina: 8,
  coins: 0,
  level: 1,
  nextLevelThreshold: 10,
  elapsedTime: 0,
  waveNumber: 1,
  gameState: 'playing' as GameState,
  selectedUpgrade: null as UpgradeType | null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setHealth: (hp: number) => set({ health: Math.max(0, Math.min(hp, get().maxHealth)) }),
  setKittyAmmo: (n: number) => set({ kittyAmmo: Math.max(0, Math.min(n, 10)) }),
  setDoggoStamina: (n: number) => set({ doggoStamina: Math.max(0, Math.min(n, 8)) }),
  setCoins: (n: number) => set({ coins: n }),
  setLevel: (n: number) => set({ level: n }),
  setNextLevelThreshold: (n: number) => set({ nextLevelThreshold: n }),
  setElapsedTime: (ms: number) => set({ elapsedTime: ms }),
  setWaveNumber: (n: number) => set({ waveNumber: n }),
  setGameState: (state: GameState) => set({ gameState: state }),
  setSelectedUpgrade: (u: UpgradeType | null) => set({ selectedUpgrade: u }),
  reset: () => set(initialState),
}));
