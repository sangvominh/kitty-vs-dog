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
  /** Multiplier for XP threshold per level (higher = slower leveling) */
  xpThresholdMultiplier: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    id: 'thu',
    name: 'Thử',
    description: 'Dễ chơi, dành cho người mới',
    icon: '🌸',
    enemyHpMultiplier: 0.2,
    enemySpeedMultiplier: 0.3,
    spawnRateMultiplier: 3.0,
    batchSizeBonus: -1,
    playerMaxHealth: 300,
    bossFrequency: 12,
    coinDropMultiplier: 1.5,
    activeCap: 10,
    waveDuration: 60000,
    color: '#34d399',
    initialSpawnDelay: 10000,
    poolSizes: [12, 6, 1],
    xpThresholdMultiplier: 2.0,
  },
  {
    id: 'binh-thuong',
    name: 'Bình Thường',
    description: 'Cân bằng, trải nghiệm chuẩn',
    icon: '⭐',
    enemyHpMultiplier: 0.5,
    enemySpeedMultiplier: 0.6,
    spawnRateMultiplier: 1.8,
    batchSizeBonus: 0,
    playerMaxHealth: 200,
    bossFrequency: 6,
    coinDropMultiplier: 1.2,
    activeCap: 25,
    waveDuration: 40000,
    color: '#60a5fa',
    initialSpawnDelay: 7000,
    poolSizes: [20, 12, 2],
    xpThresholdMultiplier: 1.5,
  },
  {
    id: 'gan-ket',
    name: 'Gắn Kết',
    description: 'Cần phối hợp tốt hơn',
    icon: '💕',
    enemyHpMultiplier: 0.8,
    enemySpeedMultiplier: 0.8,
    spawnRateMultiplier: 1.4,
    batchSizeBonus: 0,
    playerMaxHealth: 150,
    bossFrequency: 5,
    coinDropMultiplier: 1.1,
    activeCap: 35,
    waveDuration: 35000,
    color: '#f472b6',
    initialSpawnDelay: 6000,
    poolSizes: [25, 15, 2],
    xpThresholdMultiplier: 1.2,
  },
  {
    id: 'plus',
    name: 'Plus',
    description: 'Thử thách bắt đầu từ đây',
    icon: '🔥',
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    batchSizeBonus: 0,
    playerMaxHealth: 120,
    bossFrequency: 4,
    coinDropMultiplier: 1.0,
    activeCap: 45,
    waveDuration: 30000,
    color: '#fb923c',
    initialSpawnDelay: 5000,
    poolSizes: [30, 20, 3],
    xpThresholdMultiplier: 1.0,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Dành cho cao thủ',
    icon: '⚡',
    enemyHpMultiplier: 1.5,
    enemySpeedMultiplier: 1.2,
    spawnRateMultiplier: 0.8,
    batchSizeBonus: 1,
    playerMaxHealth: 100,
    bossFrequency: 3,
    coinDropMultiplier: 1.3,
    activeCap: 55,
    waveDuration: 25000,
    color: '#a78bfa',
    initialSpawnDelay: 4000,
    poolSizes: [40, 25, 3],
    xpThresholdMultiplier: 0.8,
  },
  {
    id: 'promax',
    name: 'ProMax',
    description: 'Gần như không thể',
    icon: '💀',
    enemyHpMultiplier: 2.2,
    enemySpeedMultiplier: 1.5,
    spawnRateMultiplier: 0.6,
    batchSizeBonus: 2,
    playerMaxHealth: 80,
    bossFrequency: 2,
    coinDropMultiplier: 1.5,
    activeCap: 70,
    waveDuration: 20000,
    color: '#f43f5e',
    initialSpawnDelay: 3000,
    poolSizes: [45, 30, 4],
    xpThresholdMultiplier: 0.7,
  },
  {
    id: 'ac-quy',
    name: 'Ác Quỷ',
    description: 'Không có lối thoát',
    icon: '👹',
    enemyHpMultiplier: 3.0,
    enemySpeedMultiplier: 1.8,
    spawnRateMultiplier: 0.45,
    batchSizeBonus: 3,
    playerMaxHealth: 60,
    bossFrequency: 1,
    coinDropMultiplier: 2.0,
    activeCap: 90,
    waveDuration: 15000,
    color: '#ef4444',
    initialSpawnDelay: 2000,
    poolSizes: [55, 35, 5],
    xpThresholdMultiplier: 0.6,
  },
];

/** Get difficulty by ID */
export function getDifficulty(id: DifficultyId): DifficultyLevel {
  return DIFFICULTY_LEVELS.find((d) => d.id === id) ?? DIFFICULTY_LEVELS[1]; // default to bình thường
}

/** Default difficulty */
export const DEFAULT_DIFFICULTY: DifficultyId = 'binh-thuong';
