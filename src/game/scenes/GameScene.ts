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
import { SpriteProgressionSystem } from '../systems/SpriteProgressionSystem';
import { LevelUpVFXSystem } from '../systems/LevelUpVFXSystem';
import { BackgroundRenderer } from '../systems/BackgroundRenderer';
import { useGameStore } from '../state/gameStore';
import { DEFAULT_DISPLAY_SIZES, textureKeyFor } from '../state/spriteTypes';
import { useSettingsStore } from '../../lib/settingsStore';
import { getDifficulty } from '../state/difficultyConfig';

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
  public spriteProgression!: SpriteProgressionSystem;
  public vfxSystem!: LevelUpVFXSystem;

  // Timer tracking
  private gameStartTime: number = 0;
  private lastTimerSecond: number = -1;
  private lastGameState: string = 'playing';
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset store on fresh game
    useGameStore.getState().reset();

    // Apply difficulty to player health and initial XP threshold
    const difficultyId = useSettingsStore.getState().difficultyId;
    const difficulty = getDifficulty(difficultyId);
    useGameStore.getState().setMaxHealth(difficulty.playerMaxHealth);
    useGameStore
      .getState()
      .setNextLevelThreshold(Math.round(10 * difficulty.xpThresholdMultiplier));

    // Draw background scenery (must be first so everything renders on top)
    const bgRenderer = new BackgroundRenderer(this);
    bgRenderer.render();

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

    // Apply custom sprites from spriteStore if available
    this.applyCustomCharacterSprites();

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

    // Create love reload system (proximity healing)
    this.loveReloadSystem = new LoveReloadSystem(this, this.kitty, this.doggo, this.tether);
    this.loveReloadSystem.setDamageNumbers(this.damageNumbers);

    // Connect love reload to combat for damage reduction
    this.combatSystem.setLoveReloadSystem(this.loveReloadSystem);

    // Create wave system (with difficulty)
    this.waveSystem = new WaveSystem(this, this.spawnSystem, difficultyId);

    // Create sprite progression system
    this.spriteProgression = new SpriteProgressionSystem(this, this.kitty, this.doggo);

    // Create VFX system
    this.vfxSystem = new LevelUpVFXSystem(this);

    // Wire sprite progression into spawn system
    this.spawnSystem.setSpriteProgression(this.spriteProgression);

    // Wire sprite progression into wave system
    this.waveSystem.setSpriteProgression(this.spriteProgression);

    // Create level-up system
    this.levelUpSystem = new LevelUpSystem(
      this,
      this.kitty,
      this.doggo,
      this.tether,
      this.spawnSystem,
      this.waveSystem,
      this.spriteProgression,
      this.vfxSystem,
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

    // Sync tether durability to store
    const store = useGameStore.getState();
    store.setTetherDurability(this.tether.durability);

    console.log('[GameScene] create() complete — all systems initialized');
  }

  update(time: number, _delta: number): void {
    const store = useGameStore.getState();

    // Level-up system runs in both 'playing' and 'level-up' states
    this.levelUpSystem.update();

    // Track pause time for timer sync (level-up / paused / game-over)
    if (store.gameState !== 'playing') {
      if (this.lastGameState === 'playing') {
        this.pauseStartTime = time;
      }
      this.lastGameState = store.gameState;
      return;
    }

    // Just resumed from pause — compensate timing systems
    if (this.lastGameState !== 'playing') {
      const pauseDuration = time - this.pauseStartTime;
      this.totalPausedTime += pauseDuration;
      this.waveSystem.compensatePause(pauseDuration);
      this.spawnSystem.compensatePause(pauseDuration);
      this.lastGameState = 'playing';
    }

    // Update input
    this.inputSystem.update();

    // Update players
    this.kitty.update(time);
    this.doggo.update(time);

    // Update action-based sprite textures
    this.spriteProgression.updatePlayerTextures();

    // Sync passive ammo regen to store
    store.setKittyAmmo(this.kitty.ammo);
    store.setDoggoStamina(this.doggo.ammo);

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

    // Update love reload system (proximity healing)
    this.loveReloadSystem.update(time);

    // Update wave system
    this.waveSystem.update(time);

    // Update game timer (excluding paused time)
    const elapsed = time - this.gameStartTime - this.totalPausedTime;
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

  /**
   * Apply custom character sprites from spriteStore if available.
   * Uses idle action from level 0 as the initial texture.
   */
  private applyCustomCharacterSprites(): void {
    const textureKeyKitty = textureKeyFor('kitty', 0, 'idle');
    if (this.textures.exists(textureKeyKitty)) {
      this.kitty.sprite.setTexture(textureKeyKitty);
      const sizes = DEFAULT_DISPLAY_SIZES['kitty'];
      this.kitty.sprite.setDisplaySize(sizes.customWidth, sizes.customHeight);
    }

    const textureKeyDoggo = textureKeyFor('doggo', 0, 'idle');
    if (this.textures.exists(textureKeyDoggo)) {
      this.doggo.sprite.setTexture(textureKeyDoggo);
      const sizes = DEFAULT_DISPLAY_SIZES['doggo'];
      this.doggo.sprite.setDisplaySize(sizes.customWidth, sizes.customHeight);
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
