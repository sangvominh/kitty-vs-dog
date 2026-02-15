import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Tether } from '../entities/Tether';
import type { SpawnSystem } from './SpawnSystem';
import type { WaveSystem } from './WaveSystem';
import { useGameStore, type UpgradeType } from '../state/gameStore';

const Matter = Phaser.Physics.Matter.Matter;

export class LevelUpSystem {
  public scene: Phaser.Scene;

  private kitty: Player;
  private doggo: Player;
  private tether: Tether;
  private spawnSystem: SpawnSystem;
  private waveSystem: WaveSystem;

  constructor(
    scene: Phaser.Scene,
    kitty: Player,
    doggo: Player,
    tether: Tether,
    spawnSystem: SpawnSystem,
    waveSystem: WaveSystem,
  ) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
    this.tether = tether;
    this.spawnSystem = spawnSystem;
    this.waveSystem = waveSystem;
  }

  update(): void {
    const store = useGameStore.getState();

    // Check for level-up trigger (while playing)
    if (store.gameState === 'playing') {
      if (store.coins >= store.nextLevelThreshold) {
        this.triggerLevelUp();
        return;
      }
    }

    // Poll for upgrade selection (while in level-up state)
    if (store.gameState === 'level-up') {
      if (store.selectedUpgrade !== null) {
        this.applyUpgrade(store.selectedUpgrade);
        this.resumeGame();
      }
    }
  }

  private triggerLevelUp(): void {
    const store = useGameStore.getState();
    store.setGameState('level-up');

    // Freeze all active enemies
    for (const enemy of this.spawnSystem.enemies) {
      if (enemy.active) {
        Matter.Body.setStatic(enemy.body, true);
      }
    }

    // Pause spawning and wave timers
    this.spawnSystem.paused = true;
    this.waveSystem.paused = true;
  }

  private applyUpgrade(upgrade: UpgradeType): void {
    switch (upgrade) {
      case 'tether-length':
        this.tether.maxDistance += 50;
        this.tether.restLength += 33;
        // Update constraint rest length
        (this.tether as unknown as { constraint: { length: number } }).constraint.length =
          this.tether.restLength;
        break;

      case 'damage':
        this.kitty.attackDamage += 5;
        this.doggo.attackDamage += 5;
        this.tether.clotheslineDamage += 15;
        break;

      case 'speed':
        this.kitty.movementSpeed += 0.5;
        this.doggo.movementSpeed += 0.5;
        break;
    }

    // Increment level and compute new threshold
    const store = useGameStore.getState();
    const newLevel = store.level + 1;
    const newThreshold = 10 * newLevel;

    store.setLevel(newLevel);
    store.setNextLevelThreshold(newThreshold);
    store.setSelectedUpgrade(null);
  }

  private resumeGame(): void {
    const store = useGameStore.getState();
    store.setGameState('playing');

    // Unfreeze all active enemies
    for (const enemy of this.spawnSystem.enemies) {
      if (enemy.active) {
        Matter.Body.setStatic(enemy.body, false);
      }
    }

    // Resume spawning and wave timers
    this.spawnSystem.paused = false;
    this.waveSystem.paused = false;
  }

  destroy(): void {
    // No specific cleanup needed
  }
}
