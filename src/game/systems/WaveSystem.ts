import Phaser from 'phaser';
import type { EnemyType } from '../entities/Enemy';
import type { EnemyExLover } from '../entities/EnemyExLover';
import type { SpawnSystem } from './SpawnSystem';
import { useGameStore } from '../state/gameStore';

interface WaveConfig {
  spawnInterval: number;
  batchSize: number;
  enemyTypes: EnemyType[];
  hasBoss: boolean;
}

const WAVE_TABLE: WaveConfig[] = [
  { spawnInterval: 2000, batchSize: 2, enemyTypes: ['bill'], hasBoss: false }, // Wave 1
  { spawnInterval: 1600, batchSize: 3, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 2
  { spawnInterval: 1200, batchSize: 3, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 3
  { spawnInterval: 1000, batchSize: 4, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 4
  { spawnInterval: 800, batchSize: 4, enemyTypes: ['bill', 'deadline'], hasBoss: true }, // Wave 5
  { spawnInterval: 700, batchSize: 5, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 6
  { spawnInterval: 600, batchSize: 5, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 7
  { spawnInterval: 500, batchSize: 6, enemyTypes: ['bill', 'deadline'], hasBoss: false }, // Wave 8
];

export class WaveSystem {
  public scene: Phaser.Scene;
  public paused: boolean = false;
  public bossActive: boolean = false;
  public currentBoss: EnemyExLover | null = null;

  private spawnSystem: SpawnSystem;
  private waveNumber: number = 1;
  private waveStartTime: number;
  private readonly WAVE_DURATION = 30000; // 30 seconds per wave
  private lastWaveTime: number;

  constructor(scene: Phaser.Scene, spawnSystem: SpawnSystem) {
    this.scene = scene;
    this.spawnSystem = spawnSystem;
    this.waveStartTime = scene.time.now;
    this.lastWaveTime = scene.time.now;

    // Apply initial wave config
    this.applyWaveConfig();
  }

  update(time: number): void {
    if (this.paused) return;

    // Check for wave transition
    if (time - this.lastWaveTime >= this.WAVE_DURATION) {
      this.advanceWave(time);
    }

    // Update boss FSM if active
    if (this.bossActive && this.currentBoss?.active) {
      const kitty = (this.scene as { kitty: { x: number; y: number } }).kitty;
      const doggo = (this.scene as { doggo: { x: number; y: number } }).doggo;
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

    this.applyWaveConfig();

    // Check for boss spawn
    const waveConfig = this.getWaveConfig();
    if (waveConfig.hasBoss && !this.bossActive) {
      this.requestBossSpawn();
    }
  }

  private getWaveConfig(): WaveConfig {
    if (this.waveNumber <= WAVE_TABLE.length) {
      return WAVE_TABLE[this.waveNumber - 1];
    }

    // Beyond wave 8: floor values
    const hasBoss = (this.waveNumber - 5) % 4 === 0; // Every 4th wave after wave 5
    return {
      spawnInterval: 400,
      batchSize: 6,
      enemyTypes: ['bill', 'deadline'],
      hasBoss,
    };
  }

  private applyWaveConfig(): void {
    const config = this.getWaveConfig();
    const healthMul = Math.sqrt(this.waveNumber);
    const speedMul = 1 + 0.1 * Math.log2(this.waveNumber);

    this.spawnSystem.setSpawnConfig({
      interval: config.spawnInterval,
      batchSize: config.batchSize,
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
}
