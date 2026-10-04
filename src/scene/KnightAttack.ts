import * as THREE from 'three';
import { ARM_BONES } from '../config/visual';
import type { Actor } from './Actor';

/**
 * Ataque do Cavaleiro. Se o arquivo de animações tiver um clipe de ataque, ele é usado.
 * Senão, fallback procedural: avanço rápido na direção do inimigo + rotação aditiva do braço
 * direito (aplicada DEPOIS do mixer, por cima do Idle).
 */
export class KnightAttack {
  private t = -1;
  private readonly duration = 0.22;
  private arm: THREE.Object3D | null;
  /** Pose de repouso do braço (o boneco primitivo não tem mixer para restaurá-la). */
  private armBase: THREE.Quaternion | null;
  private useClip: boolean;
  private basePos: THREE.Vector3;
  private readonly q = new THREE.Quaternion();
  private readonly axis = new THREE.Vector3(1, 0, 0);
  private dir = new THREE.Vector3();
  /** Alterna golpes de cima e de lado. */
  private alt = false;

  constructor(
    private knight: Actor,
    target: THREE.Vector3,
  ) {
    this.arm = knight.getBone(ARM_BONES);
    this.armBase = this.arm ? this.arm.quaternion.clone() : null;
    this.useClip = knight.hasClip('attack');
    this.basePos = knight.root.position.clone();
    this.dir.copy(target).sub(this.basePos).setY(0).normalize();
  }

  trigger(): void {
    if (this.useClip) {
      this.knight.play('attack', { once: true, fade: 0.05, timeScale: 2.2 });
    }
    this.t = 0;
    this.alt = !this.alt;
  }

  /** Chamar depois de knight.update(dt). */
  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const k = Math.min(1, this.t / this.duration);
    // Curva rápida de ida e volta (pico em 35%).
    const curve = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
    const ease = Math.sin((curve * Math.PI) / 2);
    this.knight.root.position.copy(this.basePos).addScaledVector(this.dir, ease * 0.35);
    if (!this.useClip && this.arm) {
      if (!this.knight.real && this.armBase) this.arm.quaternion.copy(this.armBase);
      this.axis.set(this.alt ? 1 : 0.4, 0, this.alt ? 0 : 1).normalize();
      this.q.setFromAxisAngle(this.axis, -ease * 2.0);
      this.arm.quaternion.multiply(this.q);
    }
    if (k >= 1) {
      this.t = -1;
      this.knight.root.position.copy(this.basePos);
      if (!this.knight.real && this.arm && this.armBase) this.arm.quaternion.copy(this.armBase);
    }
  }
}
