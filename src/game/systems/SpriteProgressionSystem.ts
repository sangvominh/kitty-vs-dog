/**
 * SpriteProgressionSystem — manages sprite swaps on level-up (characters) and wave advance (enemies).
 * Reads from spriteStore to determine which texture to apply.
 */

import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { PlayerId } from '../state/gameStore';
import { useSpriteStore } from '../state/spriteStore';
import { DEFAULT_DISPLAY_SIZES, type EntityId } from '../state/spriteTypes';

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

export class SpriteProgressionSystem {
  private scene: Phaser.Scene;
  private kitty: Player;
  private doggo: Player;

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
  }

  /**
   * Called by LevelUpSystem after an upgrade is applied.
   * Swaps the player's sprite to the next custom texture for the new level.
   */
  onLevelUp(playerId: PlayerId, newLevel: number): void {
    const player = playerId === 'doggo' ? this.doggo : this.kitty;
    const entityId: EntityId = playerId === 'doggo' ? 'doggo' : 'kitty';
    const spriteStore = useSpriteStore.getState();
    const textureKey = spriteStore.getTextureKeyForLevel(entityId, newLevel);

    if (textureKey && this.scene.textures.exists(textureKey)) {
      player.sprite.setTexture(textureKey);
      applyCustomSpriteSize(player.sprite, entityId);
    }
  }

  /**
   * Called by WaveSystem when wave number increments.
   * Pre-computes which enemy textures to use for future spawns.
   */
  onWaveAdvance(_newWave: number): void {
    // eslint-disable-line @typescript-eslint/no-unused-vars
    // No caching needed — updateEnemyTexture reads from store each time
  }

  /**
   * Called when an enemy is activated/spawned.
   * Randomly picks a texture from the sprite pool for this enemy type,
   * weighted towards the current wave's preferred sprite.
   */
  updateEnemyTexture(enemy: Enemy, waveNumber: number): void {
    const entityId = `enemy-${enemy.type}` as EntityId;
    const spriteStore = useSpriteStore.getState();
    const textureKey = spriteStore.getRandomTextureKeyForWave(entityId, waveNumber);

    if (textureKey && this.scene.textures.exists(textureKey)) {
      enemy.sprite.setTexture(textureKey);
      applyCustomSpriteSize(enemy.sprite, entityId);
    }
  }
}
