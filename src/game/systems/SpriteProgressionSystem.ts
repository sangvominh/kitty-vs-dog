/**
 * SpriteProgressionSystem — manages action-based sprite texture swaps.
 * Swaps player textures based on their current action state (idle, run, attack, hurt, death).
 * Swaps boss textures based on FSM state and boss level.
 */

import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { EnemyExLover, BossState } from '../entities/EnemyExLover';
import {
  DEFAULT_DISPLAY_SIZES,
  textureKeyFor,
  type EntityId,
  type ActionState,
} from '../state/spriteTypes';

/**
 * Apply the correct custom display size to a sprite for a given entity type.
 * Preserves aspect ratio by computing scale factor from the larger dimension.
 */
export function applyCustomSpriteSize(sprite: Phaser.GameObjects.Sprite, entityId: EntityId): void {
  const sizes = DEFAULT_DISPLAY_SIZES[entityId];
  const texture = sprite.texture;
  const sourceWidth = texture.source[0]?.width ?? sizes.customWidth;
  const sourceHeight = texture.source[0]?.height ?? sizes.customHeight;

  if (sourceWidth === 0 || sourceHeight === 0) {
    sprite.setDisplaySize(sizes.customWidth, sizes.customHeight);
    return;
  }

  // Compute scale to fit within target dimensions while preserving aspect ratio
  const scaleX = sizes.customWidth / sourceWidth;
  const scaleY = sizes.customHeight / sourceHeight;
  const scale = Math.min(scaleX, scaleY);

  sprite.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
}

/** Map boss FSM state to ActionState */
function bossStateToAction(fsmState: BossState): ActionState {
  switch (fsmState) {
    case 'SPAWN':
      return 'idle';
    case 'CHASE':
      return 'run';
    case 'ATTACK':
      return 'attack';
    case 'COOLDOWN':
      return 'idle';
    case 'STUNNED':
      return 'hurt';
    default:
      return 'idle';
  }
}

export class SpriteProgressionSystem {
  private scene: Phaser.Scene;
  private kitty: Player;
  private doggo: Player;

  // Track last applied texture keys to avoid redundant swaps
  private lastTextureKey: Map<string, string> = new Map();

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
  }

  /**
   * Called every frame from GameScene.update() to sync player action textures.
   */
  updatePlayerTextures(): void {
    this.applyActionTexture(this.kitty, 'kitty', 0, this.kitty.currentAction);
    this.applyActionTexture(this.doggo, 'doggo', 0, this.doggo.currentAction);
  }

  /**
   * Called by LevelUpSystem after an upgrade is applied.
   * For the new system, this just ensures the correct action texture is shown.
   */
  onLevelUp(_playerId: string, _newLevel: number): void {
    // Action-based textures are already updated each frame in updatePlayerTextures().
    // Level-up doesn't change texture anymore — textures change by action state.
  }

  /**
   * Called by WaveSystem when wave number increments.
   */
  onWaveAdvance(_newWave: number): void {
    // No-op — boss textures are applied per-frame by updateBossTexture().
  }

  /**
   * Apply the correct action-based texture to an enemy boss.
   * @param bossLevel - which boss level sprite set to use (0-indexed)
   */
  updateBossTexture(enemy: EnemyExLover, bossLevel: number): void {
    const action = bossStateToAction(enemy.fsmState);
    this.applyActionTextureToEnemy(enemy, 'boss', bossLevel, action);
  }

  /**
   * Called when an enemy is activated/spawned.
   * For regular enemies (bill/deadline), no custom textures are applied.
   * For boss (ex-lover), uses updateBossTexture instead.
   */
  updateEnemyTexture(_enemy: Enemy, _waveNumber: number): void {
    // Regular enemies don't have custom action sprites anymore.
    // Boss textures are handled separately via updateBossTexture().
  }

  /**
   * Apply action texture to a player sprite if available.
   */
  private applyActionTexture(
    player: Player,
    entityId: EntityId,
    levelIndex: number,
    action: ActionState,
  ): void {
    const textureKey = textureKeyFor(entityId, levelIndex, action);
    const cacheKey = `${entityId}-player`;

    // Skip if same texture already applied
    if (this.lastTextureKey.get(cacheKey) === textureKey) return;

    if (this.scene.textures.exists(textureKey)) {
      player.sprite.setTexture(textureKey);
      applyCustomSpriteSize(player.sprite, entityId);
      this.lastTextureKey.set(cacheKey, textureKey);
    } else {
      // Try falling back to idle texture
      const idleKey = textureKeyFor(entityId, levelIndex, 'idle');
      if (action !== 'idle' && this.scene.textures.exists(idleKey)) {
        if (this.lastTextureKey.get(cacheKey) !== idleKey) {
          player.sprite.setTexture(idleKey);
          applyCustomSpriteSize(player.sprite, entityId);
          this.lastTextureKey.set(cacheKey, idleKey);
        }
      }
      // If no custom textures at all, keep the default geometric texture
    }
  }

  /**
   * Apply action texture to a boss enemy sprite if available.
   */
  private applyActionTextureToEnemy(
    enemy: Enemy,
    entityId: EntityId,
    levelIndex: number,
    action: ActionState,
  ): void {
    const textureKey = textureKeyFor(entityId, levelIndex, action);
    const cacheKey = `${entityId}-enemy-${levelIndex}`;

    if (this.lastTextureKey.get(cacheKey) === textureKey) return;

    if (this.scene.textures.exists(textureKey)) {
      enemy.sprite.setTexture(textureKey);
      applyCustomSpriteSize(enemy.sprite, entityId);
      this.lastTextureKey.set(cacheKey, textureKey);
    } else {
      // Fallback to idle
      const idleKey = textureKeyFor(entityId, levelIndex, 'idle');
      if (action !== 'idle' && this.scene.textures.exists(idleKey)) {
        if (this.lastTextureKey.get(cacheKey) !== idleKey) {
          enemy.sprite.setTexture(idleKey);
          applyCustomSpriteSize(enemy.sprite, entityId);
          this.lastTextureKey.set(cacheKey, idleKey);
        }
      }
    }
  }
}
