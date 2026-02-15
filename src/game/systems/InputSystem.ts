import Phaser from 'phaser';
import type { Player } from '../entities/Player';

export class InputSystem {
  private scene: Phaser.Scene;
  private kitty: Player;
  private doggo: Player;

  // Key bindings
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;

    this.setupKeys();
  }

  private setupKeys(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // WASD for Kitty
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Arrow keys for Doggo
    this.keyUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
  }

  update(): void {
    this.applyMovement(this.kitty, this.keyW, this.keyA, this.keyS, this.keyD);
    this.applyMovement(this.doggo, this.keyUp, this.keyLeft, this.keyDown, this.keyRight);
  }

  private applyMovement(
    player: Player,
    up: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
    down: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
  ): void {
    let vx = 0;
    let vy = 0;

    if (up.isDown) vy -= 1;
    if (down.isDown) vy += 1;
    if (left.isDown) vx -= 1;
    if (right.isDown) vx += 1;

    // Normalize diagonal movement
    const length = Math.sqrt(vx * vx + vy * vy);
    if (length > 0) {
      vx = (vx / length) * player.getEffectiveSpeed();
      vy = (vy / length) * player.getEffectiveSpeed();
    }

    Phaser.Physics.Matter.Matter.Body.setVelocity(player.body, { x: vx, y: vy });
  }
}
