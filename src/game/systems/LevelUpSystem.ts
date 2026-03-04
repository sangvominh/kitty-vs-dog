import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Tether } from '../entities/Tether';
import type { SpawnSystem } from './SpawnSystem';
import type { WaveSystem } from './WaveSystem';
import { useGameStore, type UpgradeType, type PlayerId } from '../state/gameStore';
import { useSettingsStore } from '../../lib/settingsStore';
import { getDifficulty } from '../state/difficultyConfig';
import type { SpriteProgressionSystem } from './SpriteProgressionSystem';
import type { LevelUpVFXSystem } from './LevelUpVFXSystem';

const Matter = (Phaser.Physics.Matter as any).Matter as any;

export class LevelUpSystem {
  public scene: Phaser.Scene;

  private kitty: Player;
  private doggo: Player;
  private tether: Tether;
  private spawnSystem: SpawnSystem;
  private waveSystem: WaveSystem;
  private spriteProgression: SpriteProgressionSystem;
  private vfxSystem: LevelUpVFXSystem;
  private keyboardKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor(
    scene: Phaser.Scene,
    kitty: Player,
    doggo: Player,
    tether: Tether,
    spawnSystem: SpawnSystem,
    waveSystem: WaveSystem,
    spriteProgression: SpriteProgressionSystem,
    vfxSystem: LevelUpVFXSystem,
  ) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
    this.tether = tether;
    this.spawnSystem = spawnSystem;
    this.waveSystem = waveSystem;
    this.spriteProgression = spriteProgression;
    this.vfxSystem = vfxSystem;

    // Register keyboard keys 1-5 for upgrade selection
    if (scene.input.keyboard) {
      this.keyboardKeys = [
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
        scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      ];
    }
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

    // Poll for upgrade selection via keyboard or mouse (while in level-up state)
    if (store.gameState === 'level-up') {
      // Keyboard input: 1-5 keys
      this.checkKeyboardSelection();

      if (store.selectedUpgrade !== null) {
        this.applyUpgrade(store.selectedUpgrade, store.upgradingPlayer);
        this.resumeGame();
      }
    }
  }

  private checkKeyboardSelection(): void {
    const UPGRADE_ORDER: UpgradeType[] = [
      'tether-length',
      'damage',
      'speed',
      'ammo',
      'attack-speed',
    ];
    for (let i = 0; i < this.keyboardKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.keyboardKeys[i])) {
        if (i < UPGRADE_ORDER.length) {
          useGameStore.getState().setSelectedUpgrade(UPGRADE_ORDER[i]);
        }
        break;
      }
    }
  }

  private triggerLevelUp(): void {
    const store = useGameStore.getState();
    store.setGameState('level-up');

    // Randomly pick which player gets to upgrade
    const chosen: PlayerId = Math.random() < 0.5 ? 'kitty' : 'doggo';
    store.setUpgradingPlayer(chosen);

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

  private applyUpgrade(upgrade: UpgradeType, upgradingPlayer: PlayerId | null): void {
    const player = upgradingPlayer === 'doggo' ? this.doggo : this.kitty;

    switch (upgrade) {
      case 'tether-length':
        this.tether.maxDistance += 50;
        this.tether.restLength += 33;
        break;

      case 'damage':
        player.attackDamage += 5;
        this.tether.clotheslineDamage += 10;
        break;

      case 'speed':
        player.movementSpeed += 0.5;
        break;

      case 'ammo':
        player.maxAmmo += 2;
        player.ammo = player.maxAmmo;
        break;

      case 'attack-speed':
        player.attackCooldown = Math.max(200, player.attackCooldown - 100);
        break;
    }

    // Increment level and compute new threshold (scaled by difficulty)
    const store = useGameStore.getState();
    const newLevel = store.level + 1;
    const difficultyId = useSettingsStore.getState().difficultyId;
    const difficulty = getDifficulty(difficultyId);
    const newThreshold = Math.round(10 * newLevel * difficulty.xpThresholdMultiplier);

    store.setLevel(newLevel);
    store.setNextLevelThreshold(newThreshold);

    // Trigger sprite progression on level-up
    if (upgradingPlayer) {
      this.spriteProgression.onLevelUp(upgradingPlayer, newLevel);

      // Play VFX
      this.vfxSystem.playLevelUpEffect(player.x, player.y, newLevel, player.sprite);
    }

    store.setSelectedUpgrade(null);
    store.setUpgradingPlayer(null);
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
