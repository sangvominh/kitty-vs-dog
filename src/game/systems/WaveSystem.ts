import Phaser from 'phaser';
import type { EnemyType } from '../entities/Enemy';
import type { EnemyExLover } from '../entities/EnemyExLover';
import type { SpawnSystem } from './SpawnSystem';
import type { SpriteProgressionSystem } from './SpriteProgressionSystem';
import { useGameStore } from '../state/gameStore';
import { getDifficulty, type DifficultyId, type DifficultyLevel } from '../state/difficultyConfig';

interface WaveConfig {
  spawnInterval: number;
  batchSize: number;
  enemyTypes: EnemyType[];
  hasBoss: boolean;
}

const WAVE_TABLE: WaveConfig[] = [
  { spawnInterval: 3000, batchSize: 1, enemyTypes: ['bill'], hasBoss: false }, // Wave 1
  { spawnInterval: 2500, batchSize: 2, enemyTypes: ['bill'], hasBoss: false }, // Wave 2
  { spawnInterval: 2200, batchSize: 2, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 3
  { spawnInterval: 2000, batchSize: 2, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 4
  { spawnInterval: 1800, batchSize: 3, enemyTypes: ['bill', 'deadline'], hasBoss: true }, // Wave 5
  { spawnInterval: 1500, batchSize: 3, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 6
  { spawnInterval: 1300, batchSize: 3, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 7
  { spawnInterval: 1100, batchSize: 4, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 8
  { spawnInterval: 1000, batchSize: 4, enemyTypes: ['bill', 'deadline'], hasBoss: true }, // Wave 9
  { spawnInterval: 900, batchSize: 4, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 10
];

export class WaveSystem {
  public scene: Phaser.Scene;
  public paused: boolean = false;
  public bossActive: boolean = false;
  public currentBoss: EnemyExLover | null = null;

  private spawnSystem: SpawnSystem;
  private spriteProgression: SpriteProgressionSystem | null = null;
  private waveNumber: number = 1;
  private waveStartTime: number;
  private waveDuration: number;
  private lastWaveTime: number;
  private difficulty: DifficultyLevel;

  constructor(scene: Phaser.Scene, spawnSystem: SpawnSystem, difficultyId?: DifficultyId) {
    this.scene = scene;
    this.spawnSystem = spawnSystem;
    this.difficulty = getDifficulty(difficultyId ?? 'binh-thuong');
    this.waveDuration = this.difficulty.waveDuration;
    this.waveStartTime = scene.time.now;
    this.lastWaveTime = scene.time.now;

    // Apply difficulty to spawn system
    this.spawnSystem.activeCap = this.difficulty.activeCap;
    this.spawnSystem.spawnDelay = this.difficulty.initialSpawnDelay;

    // Initialize enemy pools with difficulty-appropriate sizes
    const [bills, deadlines, bosses] = this.difficulty.poolSizes;
    this.spawnSystem.initPools(bills, deadlines, bosses);

    // Apply initial wave config
    this.applyWaveConfig();

    console.log(
      `[WaveSystem] Difficulty: ${this.difficulty.name} | Cap: ${this.difficulty.activeCap} | Pool: ${bills}/${deadlines}/${bosses} | SpawnDelay: ${this.difficulty.initialSpawnDelay}ms`,
    );
  }

  setSpriteProgression(sp: SpriteProgressionSystem): void {
    this.spriteProgression = sp;
  }

  update(time: number): void {
    if (this.paused) return;

    // Check for wave transition
    if (time - this.lastWaveTime >= this.waveDuration) {
      this.advanceWave(time);
    }

    // Update boss FSM if active
    if (this.bossActive && this.currentBoss?.active) {
      const kitty = (this.scene as any).kitty;
      const doggo = (this.scene as any).doggo;
      const midX = (kitty.x + doggo.x) / 2;
      const midY = (kitty.y + doggo.y) / 2;
      this.currentBoss.setTarget(midX, midY);
      this.currentBoss.updateFSM(time);
    }

    // Check if boss died
    if (this.bossActive && this.currentBoss && !this.currentBoss.active) {
      this.bossActive = false;
      this.currentBoss = null;
    }
  }

  private advanceWave(time: number): void {
    this.waveNumber++;
    this.lastWaveTime = time;

    const store = useGameStore.getState();
    store.setWaveNumber(this.waveNumber);

    // Notify sprite progression system
    if (this.spriteProgression) {
      this.spriteProgression.onWaveAdvance(this.waveNumber);
    }

    this.applyWaveConfig();

    // Check for boss spawn — use wave table for first 8 waves, then difficulty frequency
    const waveConfig = this.getWaveConfig();
    const shouldSpawnBoss =
      this.waveNumber <= WAVE_TABLE.length
        ? waveConfig.hasBoss
        : waveConfig.hasBoss || this.waveNumber % this.difficulty.bossFrequency === 0;

    if (shouldSpawnBoss && !this.bossActive) {
      this.requestBossSpawn();
    }
  }

  private getWaveConfig(): WaveConfig {
    if (this.waveNumber <= WAVE_TABLE.length) {
      return WAVE_TABLE[this.waveNumber - 1];
    }

    // Beyond wave 10: gradual scaling, boss frequency from difficulty
    const hasBoss = (this.waveNumber - 5) % this.difficulty.bossFrequency === 0;
    return {
      spawnInterval: Math.max(500, 900 - (this.waveNumber - WAVE_TABLE.length) * 30),
      batchSize: Math.min(6, 4 + Math.floor((this.waveNumber - WAVE_TABLE.length) / 3)),
      enemyTypes: ['bill', 'deadline'],
      hasBoss,
    };
  }

  private applyWaveConfig(): void {
    const config = this.getWaveConfig();

    // Base multipliers from wave progression (gentler curve)
    const baseHealthMul = 1 + 0.15 * (this.waveNumber - 1);
    const baseSpeedMul = 1 + 0.05 * Math.log2(Math.max(1, this.waveNumber));

    // Apply difficulty multipliers on top
    const healthMul = baseHealthMul * this.difficulty.enemyHpMultiplier;
    const speedMul = baseSpeedMul * this.difficulty.enemySpeedMultiplier;

    // Apply difficulty spawn rate and batch bonus
    const interval = Math.max(
      100,
      Math.round(config.spawnInterval * this.difficulty.spawnRateMultiplier),
    );
    const batchSize = Math.max(1, config.batchSize + this.difficulty.batchSizeBonus);

    this.spawnSystem.setSpawnConfig({
      interval,
      batchSize,
      enemyTypes: config.enemyTypes,
      healthMultiplier: healthMul,
      speedMultiplier: speedMul,
    });
  }

  private requestBossSpawn(): void {
    if (this.bossActive) return;

    // SpawnSystem will handle the actual boss creation
    // For now, signal that a boss should spawn
    this.scene.events.emit('spawn-boss');
  }

  setBoss(boss: EnemyExLover): void {
    this.currentBoss = boss;
    this.bossActive = true;
  }

  destroy(): void {
    // Cleanup
  }

  /**
   * Shift internal time references forward by pauseDuration so that
   * time spent in level-up / game-over screens does not count toward
   * wave progression.
   */
  compensatePause(pauseDuration: number): void {
    this.lastWaveTime += pauseDuration;
    this.waveStartTime += pauseDuration;
  }
}
