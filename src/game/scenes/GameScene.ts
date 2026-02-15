import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { CATEGORY, MASK } from '../entities/CollisionCategories';
import { Player } from '../entities/Player';
import { Tether } from '../entities/Tether';
import { InputSystem } from '../systems/InputSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { LoveReloadSystem } from '../systems/LoveReloadSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { DamageNumberSystem } from '../systems/DamageNumberSystem';
import { useGameStore } from '../state/gameStore';

export class GameScene extends Phaser.Scene {
  public kitty!: Player;
  public doggo!: Player;
  public tether!: Tether;
  public inputSystem!: InputSystem;
  public spawnSystem!: SpawnSystem;
  public combatSystem!: CombatSystem;
  public loveReloadSystem!: LoveReloadSystem;
  public waveSystem!: WaveSystem;
  public levelUpSystem!: LevelUpSystem;
  public damageNumbers!: DamageNumberSystem;

  // Timer tracking
  private gameStartTime: number = 0;
  private lastTimerSecond: number = -1;

  // Passive health regen
  private lastHealthRegenTime: number = 0;
  private readonly HEALTH_REGEN_INTERVAL = 5000; // 1 HP every 5 seconds
  private readonly HEALTH_REGEN_AMOUNT = 1;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset store on fresh game
    useGameStore.getState().reset();

    // Create arena boundary walls
    this.createBoundaries();

    // Create players
    this.kitty = new Player(this, {
      id: 'kitty',
      role: 'ranged',
      x: 400,
      y: 360,
      textureKey: 'kitty',
    });

    this.doggo = new Player(this, {
      id: 'doggo',
      role: 'melee',
      x: 880,
      y: 360,
      textureKey: 'doggo',
    });

    // Create tether between players
    this.tether = new Tether(this, this.kitty, this.doggo);

    // Create input system
    this.inputSystem = new InputSystem(this, this.kitty, this.doggo);

    // Create spawn system
    this.spawnSystem = new SpawnSystem(this, this.kitty, this.doggo);

    // Create combat system
    this.combatSystem = new CombatSystem(this, this.kitty, this.doggo, this.tether);
    this.combatSystem.setSpawnSystem(this.spawnSystem);

    // Create damage number system
    this.damageNumbers = new DamageNumberSystem(this);
    this.combatSystem.setDamageNumbers(this.damageNumbers);

    // Create love reload system
    this.loveReloadSystem = new LoveReloadSystem(this, this.kitty, this.doggo);

    // Create wave system
    this.waveSystem = new WaveSystem(this, this.spawnSystem);

    // Create level-up system
    this.levelUpSystem = new LevelUpSystem(
      this,
      this.kitty,
      this.doggo,
      this.tether,
      this.spawnSystem,
      this.waveSystem,
    );

    // Listen for boss spawn requests
    this.events.on('spawn-boss', () => {
      const boss = this.spawnSystem.spawnBoss();
      if (boss) {
        this.waveSystem.setBoss(boss);
      }
    });

    // Record game start time
    this.gameStartTime = this.time.now;

    console.log('[GameScene] create() complete — all systems initialized');
  }

  update(time: number, _delta: number): void {
    const store = useGameStore.getState();

    // Level-up system runs in both 'playing' and 'level-up' states
    this.levelUpSystem.update();

    if (store.gameState !== 'playing') return;

    // Update input
    this.inputSystem.update();

    // Update players
    this.kitty.update(time);
    this.doggo.update(time);

    // Sync passive ammo regen to store
    store.setKittyAmmo(this.kitty.ammo);
    store.setDoggoStamina(this.doggo.ammo);

    // Passive health regen (1 HP every 5s, only if not full)
    if (
      store.health < store.maxHealth &&
      time - this.lastHealthRegenTime >= this.HEALTH_REGEN_INTERVAL
    ) {
      this.lastHealthRegenTime = time;
      const newHealth = Math.min(store.health + this.HEALTH_REGEN_AMOUNT, store.maxHealth);
      store.setHealth(newHealth);
      this.damageNumbers.spawnHeal(
        (this.kitty.x + this.doggo.x) / 2,
        (this.kitty.y + this.doggo.y) / 2,
        this.HEALTH_REGEN_AMOUNT,
      );
    }

    // Enforce tether max distance
    this.tether.enforceMaxDistance();

    // Render tether
    this.tether.render();

    // Update spawn system
    this.spawnSystem.update(time);

    // Update combat system
    this.combatSystem.update(time);

    // Update damage numbers
    this.damageNumbers.update();

    // Update love reload system
    this.loveReloadSystem.update();

    // Update wave system
    this.waveSystem.update(time);

    // Update game timer
    const elapsed = time - this.gameStartTime;
    const currentSecond = Math.floor(elapsed / 1000);
    if (currentSecond !== this.lastTimerSecond) {
      this.lastTimerSecond = currentSecond;
      store.setElapsedTime(elapsed);
    }

    // Check game over
    if (store.health <= 0) {
      store.setGameState('game-over');
      this.scene.start('GameOverScene');
    }
  }

  private createBoundaries(): void {
    const wallThickness = 50;

    // Top wall
    this.matter.add.rectangle(GAME_WIDTH / 2, -wallThickness / 2, GAME_WIDTH, wallThickness, {
      isStatic: true,
      label: 'boundary',
      collisionFilter: {
        category: CATEGORY.BOUNDARY,
        mask: MASK.BOUNDARY,
      },
    });

    // Bottom wall
    this.matter.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT + wallThickness / 2,
      GAME_WIDTH,
      wallThickness,
      {
        isStatic: true,
        label: 'boundary',
        collisionFilter: {
          category: CATEGORY.BOUNDARY,
          mask: MASK.BOUNDARY,
        },
      },
    );

    // Left wall
    this.matter.add.rectangle(-wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT, {
      isStatic: true,
      label: 'boundary',
      collisionFilter: {
        category: CATEGORY.BOUNDARY,
        mask: MASK.BOUNDARY,
      },
    });

    // Right wall
    this.matter.add.rectangle(
      GAME_WIDTH + wallThickness / 2,
      GAME_HEIGHT / 2,
      wallThickness,
      GAME_HEIGHT,
      {
        isStatic: true,
        label: 'boundary',
        collisionFilter: {
          category: CATEGORY.BOUNDARY,
          mask: MASK.BOUNDARY,
        },
      },
    );
  }
}
