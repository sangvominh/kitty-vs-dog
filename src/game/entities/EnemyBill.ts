import type Phaser from 'phaser';
import { Enemy } from './Enemy';

/**
 * "The Bill" — slow swarm enemy type.
 * 20 HP, speed 1.0, 5 contact damage, drops 1 coin.
 */
export class EnemyBill extends Enemy {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      type: 'bill',
      health: 20,
      maxHealth: 20,
      movementSpeed: 1.0,
      contactDamage: 5,
      coinDropValue: 1,
      bodyRadius: 14,
      textureKey: 'enemy-bill',
    });
  }
}
