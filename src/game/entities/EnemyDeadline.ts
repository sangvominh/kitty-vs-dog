import type Phaser from 'phaser';
import { Enemy } from './Enemy';

/**
 * "The Deadline" — fast rusher enemy type.
 * 10 HP, speed 3.0, 8 contact damage, drops 2 coins.
 */
export class EnemyDeadline extends Enemy {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      type: 'deadline',
      health: 10,
      maxHealth: 10,
      movementSpeed: 3.0,
      contactDamage: 8,
      coinDropValue: 2,
      bodyRadius: 12,
      textureKey: 'enemy-deadline',
    });
  }
}
