/**
 * Difficulty configuration for the game.
 * 7 levels from "thử" (trial) to "ác quỷ" (devil).
 */

export type DifficultyId = 'thu' | 'binh-thuong' | 'gan-ket' | 'plus' | 'pro' | 'promax' | 'ac-quy';

export interface DifficultyLevel {
  id: DifficultyId;
  /** Vietnamese display name */
  name: string;
  /** Short description */
  description: string;
  /** Emoji icon for visual flair */
  icon: string;
  /** Multiplier for enemy base HP (1.0 = normal) */
  enemyHpMultiplier: number;
  /** Multiplier for enemy movement speed (1.0 = normal) */
  enemySpeedMultiplier: number;
  /** Multiplier for spawn interval — lower = faster spawns (1.0 = normal) */
  spawnRateMultiplier: number;
  /** Extra enemies per batch (added to wave table batch size) */
  batchSizeBonus: number;
  /** Player starting & max health */
  playerMaxHealth: number;
  /** Boss frequency modifier — how many waves between bosses. Lower = more bosses */
  bossFrequency: number;
  /** Multiplier for coin drops (1.0 = normal) */
  coinDropMultiplier: number;
  /** Active enemy cap */
  activeCap: number;
  /** Wave duration in ms (30000 = 30s normal) */
  waveDuration: number;
  /** Color for UI display */
  color: string;
  /** Initial spawn delay in ms before enemies appear */
  initialSpawnDelay: number;
  /** Pool sizes: [bills, deadlines, bosses] */
  poolSizes: [number, number, number];
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    id: 'thu',
    name: 'Thử',
    description: 'Dễ chơi, dành cho người mới',
    icon: '🌸',
    enemyHpMultiplier: 0.25,
    enemySpeedMultiplier: 0.35,
    spawnRateMultiplier: 2.5,
    batchSizeBonus: -1,
    playerMaxHealth: 200,
    bossFrequency: 10,
    coinDropMultiplier: 2.0,
    activeCap: 15,
    waveDuration: 50000,
    color: '#34d399',
    initialSpawnDelay: 8000,
    poolSizes: [15, 8, 1],
  },
  {
    id: 'binh-thuong',
    name: 'Bình Thường',
    description: 'Cân bằng, trải nghiệm chuẩn',
    icon: '⭐',
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    batchSizeBonus: 0,
    playerMaxHealth: 100,
    bossFrequency: 4,
    coinDropMultiplier: 1.0,
    activeCap: 50,
    waveDuration: 30000,
    color: '#60a5fa',
    initialSpawnDelay: 5000,
    poolSizes: [30, 20, 2],
  },
  {
    id: 'gan-ket',
    name: 'Gắn Kết',
    description: 'Cần phối hợp tốt hơn',
    icon: '💕',
    enemyHpMultiplier: 1.3,
    enemySpeedMultiplier: 1.15,
    spawnRateMultiplier: 0.85,
    batchSizeBonus: 0,
    playerMaxHealth: 100,
    bossFrequency: 4,
    coinDropMultiplier: 1.1,
    activeCap: 55,
    waveDuration: 28000,
    color: '#f472b6',
    initialSpawnDelay: 4500,
    poolSizes: [35, 20, 2],
  },
  {
    id: 'plus',
    name: 'Plus',
    description: 'Thử thách bắt đầu từ đây',
    icon: '🔥',
    enemyHpMultiplier: 1.6,
    enemySpeedMultiplier: 1.3,
    spawnRateMultiplier: 0.75,
    batchSizeBonus: 1,
    playerMaxHealth: 80,
    bossFrequency: 3,
    coinDropMultiplier: 1.2,
    activeCap: 60,
    waveDuration: 25000,
    color: '#fb923c',
    initialSpawnDelay: 4000,
    poolSizes: [40, 25, 3],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Dành cho cao thủ',
    icon: '⚡',
    enemyHpMultiplier: 2.0,
    enemySpeedMultiplier: 1.5,
    spawnRateMultiplier: 0.6,
    batchSizeBonus: 2,
    playerMaxHealth: 70,
    bossFrequency: 3,
    coinDropMultiplier: 1.3,
    activeCap: 70,
    waveDuration: 22000,
    color: '#a78bfa',
    initialSpawnDelay: 3000,
    poolSizes: [45, 30, 3],
  },
  {
    id: 'promax',
    name: 'ProMax',
    description: 'Gần như không thể',
    icon: '💀',
    enemyHpMultiplier: 3.0,
    enemySpeedMultiplier: 1.8,
    spawnRateMultiplier: 0.45,
    batchSizeBonus: 3,
    playerMaxHealth: 55,
    bossFrequency: 2,
    coinDropMultiplier: 1.5,
    activeCap: 80,
    waveDuration: 18000,
    color: '#f43f5e',
    initialSpawnDelay: 2000,
    poolSizes: [50, 35, 4],
  },
  {
    id: 'ac-quy',
    name: 'Ác Quỷ',
    description: 'Không có lối thoát',
    icon: '👹',
    enemyHpMultiplier: 4.0,
    enemySpeedMultiplier: 2.2,
    spawnRateMultiplier: 0.35,
    batchSizeBonus: 4,
    playerMaxHealth: 40,
    bossFrequency: 1,
    coinDropMultiplier: 2.0,
    activeCap: 100,
    waveDuration: 15000,
    color: '#ef4444',
    initialSpawnDelay: 1500,
    poolSizes: [60, 40, 5],
  },
];

/** Get difficulty by ID */
export function getDifficulty(id: DifficultyId): DifficultyLevel {
  return DIFFICULTY_LEVELS.find((d) => d.id === id) ?? DIFFICULTY_LEVELS[1]; // default to bình thường
}

/** Default difficulty */
export const DEFAULT_DIFFICULTY: DifficultyId = 'binh-thuong';
