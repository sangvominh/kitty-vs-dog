import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Enemy, type EnemyType } from '../entities/Enemy';
import { EnemyBill } from '../entities/EnemyBill';
import { EnemyDeadline } from '../entities/EnemyDeadline';
import { EnemyExLover } from '../entities/EnemyExLover';
import type { Player } from '../entities/Player';

export interface SpawnConfig {
  interval: number;
  batchSize: number;
  enemyTypes: EnemyType[];
  healthMultiplier: number;
  speedMultiplier: number;
}

export class SpawnSystem {
  public scene: Phaser.Scene;
  public enemies: Enemy[] = [];
  public activeCap: number = 50;
  public paused: boolean = false;

  private kitty: Player;
  private doggo: Player;
  private lastSpawnTime: number = 0;
  private spawnDelay: number = 5000; // 5-second initial delay
  private gameStartTime: number = 0;

  // Current spawn config (driven by WaveSystem)
  private currentConfig: SpawnConfig = {
    interval: 2000,
    batchSize: 2,
    enemyTypes: ['bill'],
    healthMultiplier: 1,
    speedMultiplier: 1,
  };

  // Enemy pools
  private billPool: EnemyBill[] = [];
  private deadlinePool: EnemyDeadline[] = [];
  private bossPool: EnemyExLover[] = [];

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
    this.gameStartTime = scene.time.now;

    // Pre-allocate enemy pools
    this.preallocatePool();
  }

  private preallocatePool(): void {
    for (let i = 0; i < 30; i++) {
      const bill = new EnemyBill(this.scene);
      this.billPool.push(bill);
      this.enemies.push(bill);
    }
    for (let i = 0; i < 20; i++) {
      const deadline = new EnemyDeadline(this.scene);
      this.deadlinePool.push(deadline);
      this.enemies.push(deadline);
    }
    // Boss pool — max 2
    for (let i = 0; i < 2; i++) {
      const boss = new EnemyExLover(this.scene);
      this.bossPool.push(boss);
      this.enemies.push(boss);
    }
  }

  setSpawnConfig(config: SpawnConfig): void {
    this.currentConfig = config;
  }

  getActiveEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.active);
  }

  getActiveCount(): number {
    return this.enemies.filter((e) => e.active).length;
  }

  update(time: number): void {
    if (this.paused) return;

    // Wait for initial spawn delay
    if (time - this.gameStartTime < this.spawnDelay) return;

    // Check spawn interval
    if (time - this.lastSpawnTime >= this.currentConfig.interval) {
      this.spawnBatch(time);
      this.lastSpawnTime = time;
    }

    // Update enemy midpoint seeking
    const midX = (this.kitty.x + this.doggo.x) / 2;
    const midY = (this.kitty.y + this.doggo.y) / 2;

    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.seekTarget(midX, midY);
        enemy.update();
      }
    }
  }

  private spawnBatch(time: number): void {
    const count = Math.min(this.currentConfig.batchSize, this.activeCap - this.getActiveCount());

    for (let i = 0; i < count; i++) {
      const enemyType =
        this.currentConfig.enemyTypes[
          Math.floor(Math.random() * this.currentConfig.enemyTypes.length)
        ];
      this.spawnEnemy(enemyType, time);
    }
  }

  spawnEnemy(type: EnemyType, _time: number): Enemy | null {
    if (this.getActiveCount() >= this.activeCap) return null;

    // Find spawn position on perimeter, at least 120px from both players
    const pos = this.getSpawnPosition();
    if (!pos) return null;

    let enemy: Enemy | null = null;

    switch (type) {
      case 'bill':
        enemy = this.billPool.find((e) => !e.active) ?? null;
        break;
      case 'deadline':
        enemy = this.deadlinePool.find((e) => !e.active) ?? null;
        break;
      case 'ex-lover':
        enemy = this.bossPool.find((e) => !e.active) ?? null;
        break;
    }

    if (enemy) {
      enemy.activate(
        pos.x,
        pos.y,
        this.currentConfig.healthMultiplier,
        this.currentConfig.speedMultiplier,
      );
      console.log(`[SpawnSystem] Spawned ${type} at (${Math.round(pos.x)}, ${Math.round(pos.y)})`);
    }

    return enemy;
  }

  spawnBoss(): EnemyExLover | null {
    const boss = this.bossPool.find((e) => !e.active) ?? null;
    if (!boss) return null;

    // Spawn from farthest screen edge
    const pos = this.getFarthestEdgePosition();
    boss.activate(
      pos.x,
      pos.y,
      this.currentConfig.healthMultiplier,
      this.currentConfig.speedMultiplier,
    );
    return boss;
  }

  private getFarthestEdgePosition(): { x: number; y: number } {
    const midX = (this.kitty.x + this.doggo.x) / 2;
    const midY = (this.kitty.y + this.doggo.y) / 2;

    // Pick the edge farthest from the midpoint
    const edges = [
      { x: midX, y: -30 }, // Top
      { x: midX, y: GAME_HEIGHT + 30 }, // Bottom
      { x: -30, y: midY }, // Left
      { x: GAME_WIDTH + 30, y: midY }, // Right
    ];

    let farthest = edges[0];
    let maxDist = 0;
    for (const edge of edges) {
      const dist = Phaser.Math.Distance.Between(midX, midY, edge.x, edge.y);
      if (dist > maxDist) {
        maxDist = dist;
        farthest = edge;
      }
    }
    return farthest;
  }

  private getSpawnPosition(): { x: number; y: number } | null {
    const margin = 30;
    const minDistFromPlayers = 120;

    for (let attempt = 0; attempt < 20; attempt++) {
      let x: number, y: number;

      // Random edge selection
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: // Top
          x = Math.random() * GAME_WIDTH;
          y = -margin;
          break;
        case 1: // Bottom
          x = Math.random() * GAME_WIDTH;
          y = GAME_HEIGHT + margin;
          break;
        case 2: // Left
          x = -margin;
          y = Math.random() * GAME_HEIGHT;
          break;
        default: // Right
          x = GAME_WIDTH + margin;
          y = Math.random() * GAME_HEIGHT;
          break;
      }

      // Check minimum distance from both players
      const distToKitty = Phaser.Math.Distance.Between(x, y, this.kitty.x, this.kitty.y);
      const distToDoggo = Phaser.Math.Distance.Between(x, y, this.doggo.x, this.doggo.y);

      if (distToKitty >= minDistFromPlayers && distToDoggo >= minDistFromPlayers) {
        return { x, y };
      }
    }

    // Fallback — just spawn at a random edge
    return { x: -margin, y: Math.random() * GAME_HEIGHT };
  }

  destroy(): void {
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];
    this.billPool = [];
    this.deadlinePool = [];
    this.bossPool = [];
  }
}
