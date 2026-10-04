import * as THREE from 'three';
import { ARM_BONES, FOREARM_BONES } from '../config/visual';
import type { Actor } from './Actor';

/**
 * Ataque do Cavaleiro (isolado aqui para ser trocado por um clipe real).
 * - Se existir um clipe de ataque (pack de combate opcional), ele é usado.
 * - Senão: avanço procedural até o inimigo (~0,15 s ida, ~0,15 s volta) + rotação ADITIVA nos ossos
 *   upperarm.r / lowerarm.r simulando um golpe de cima para baixo, aplicada DEPOIS do mixer.update().
 * Toques rápidos reiniciam o golpe sem travar.
 */
export class KnightAttack {
  private t = -1;
  private readonly half = 0.15;
  private upper: THREE.Object3D | null;
  private lower: THREE.Object3D | null;
  /** Pose de repouso (o boneco primitivo não tem mixer para restaurá-la). */
  private upperBase: THREE.Quaternion | null;
  private lowerBase: THREE.Quaternion | null;
  private useClip: boolean;
  private basePos: THREE.Vector3;
  private readonly q = new THREE.Quaternion();
  private readonly axis = new THREE.Vector3(1, 0, 0);
  private readonly axisY = new THREE.Vector3(0, 1, 0);
  private dir = new THREE.Vector3();

  constructor(
    private knight: Actor,
    target: THREE.Vector3,
  ) {
    this.upper = knight.getBone(ARM_BONES);
    this.lower = knight.getBone(FOREARM_BONES);
    this.upperBase = this.upper ? this.upper.quaternion.clone() : null;
    this.lowerBase = this.lower ? this.lower.quaternion.clone() : null;
    this.useClip = knight.hasClip('attack');
    this.basePos = knight.root.position.clone();
    this.dir.copy(target).sub(this.basePos).setY(0).normalize();
  }

  trigger(): void {
    if (this.useClip) this.knight.play('attack', { once: true, fade: 0.05, timeScale: 2.2 });
    this.t = 0;
  }

  /** Chamar depois de knight.update(dt). */
  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const k = Math.min(1, this.t / (this.half * 2));
    // Ida em 0,15 s e volta em 0,15 s.
    const curve = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
    const ease = Math.sin((curve * Math.PI) / 2);
    this.knight.root.position.copy(this.basePos).addScaledVector(this.dir, ease * 0.4);

    if (!this.useClip) {
      if (!this.knight.real) {
        if (this.upper && this.upperBase) this.upper.quaternion.copy(this.upperBase);
        if (this.lower && this.lowerBase) this.lower.quaternion.copy(this.lowerBase);
      }
      // Golpe de cima para baixo em 3 tempos (eixos locais do upperarm.r do Rig_Medium, verificados):
      // ergue a espada (eixo Y), desce no impacto apontando para o inimigo (eixo X) no pico do avanço
      // e volta ao repouso.
      const lerp = (a: number, b: number, x: number) => a + (b - a) * Math.min(1, Math.max(0, x));
      const raise = k < 0.4 ? lerp(0, 1.8, k / 0.4) : lerp(1.8, 0, (k - 0.4) / 0.15);
      const strike = k < 0.4 ? 0 : k < 0.55 ? lerp(0, 1.6, (k - 0.4) / 0.15) : lerp(1.6, 0, (k - 0.6) / 0.4);
      if (this.upper) {
        this.q.setFromAxisAngle(this.axisY, raise);
        this.upper.quaternion.multiply(this.q);
        this.q.setFromAxisAngle(this.axis, strike);
        this.upper.quaternion.multiply(this.q);
      }
      if (this.lower) {
        this.q.setFromAxisAngle(this.axis, strike * 0.25);
        this.lower.quaternion.multiply(this.q);
      }
    }
    if (k >= 1) {
      this.t = -1;
      this.knight.root.position.copy(this.basePos);
      if (!this.knight.real) {
        if (this.upper && this.upperBase) this.upper.quaternion.copy(this.upperBase);
        if (this.lower && this.lowerBase) this.lower.quaternion.copy(this.lowerBase);
      }
    }
  }
}
