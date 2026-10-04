import * as THREE from 'three';
import { HAND_BONES, type ClipRole, type ModelKey, type WeaponKey } from '../config/visual';
import type { Assets } from './Assets';
import { fakeShadow } from './Fallback';

/**
 * Personagem na cena: modelo (real ou primitivo), AnimationMixer com os clipes compartilhados,
 * armas presas nos ossos das mãos e efeitos procedurais (flash, squash, encolher).
 * Sem clipe disponível, as animações caem para versões procedurais.
 */
export class Actor {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly real: boolean;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<ClipRole, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private materials: THREE.MeshStandardMaterial[] = [];
  private baseEmissive: THREE.Color[] = [];
  private flashT = 0;
  private squashT = 0;
  private time = Math.random() * 10;
  /** Estado da animação procedural (quando não há clipe). */
  private procedural: { role: ClipRole; t: number } = { role: 'idle', t: 0 };
  baseScale = 1;
  dying = false;
  deathDone = false;
  /** Chamado quando a morte (clipe + encolher) termina. */
  onDeathFinished?: () => void;
  private shrinkT = -1;
  private shadow: THREE.Mesh;

  constructor(
    private assets: Assets,
    key: ModelKey,
    targetHeight: number,
  ) {
    const { root, real } = assets.character(key);
    this.model = root;
    this.real = real;
    this.root.add(root);

    // Normaliza a altura e coloca o pé no chão pela bounding box.
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const s = targetHeight / h;
    root.scale.setScalar(s);
    root.position.y = -box.min.y * s;

    this.shadow = fakeShadow(0.55);
    this.root.add(this.shadow);

    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mm of mats) {
        if ((mm as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const sm = mm as THREE.MeshStandardMaterial;
          this.materials.push(sm);
          this.baseEmissive.push(sm.emissive.clone());
        }
      }
    });

    if (real) {
      this.mixer = new THREE.AnimationMixer(root);
      this.mixer.addEventListener('finished', (e) => this.onClipFinished(e.action as THREE.AnimationAction));
    }
  }

  private findBone(names: string[]): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    for (const n of names) {
      found = this.model.getObjectByName(n) ?? null;
      if (found) return found;
    }
    // Busca tolerante (case-insensitive, sem pontuação).
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const wanted = names.map(norm);
    this.model.traverse((o) => {
      if (!found && wanted.includes(norm(o.name))) found = o;
    });
    return found;
  }

  getBone(names: string[]): THREE.Object3D | null {
    return this.findBone(names);
  }

  attachWeapon(key: WeaponKey, hand: 'right' | 'left'): void {
    const bone = this.findBone(HAND_BONES[hand]);
    const w = this.assets.weapon(key);
    if (bone) {
      // Compensa a escala do modelo para a arma ficar com tamanho de mundo correto no primitivo.
      if (!this.real) w.scale.setScalar(1);
      bone.add(w);
    } else {
      console.warn(`[actor] osso da mão (${hand}) não encontrado; arma ${key} presa ao corpo`);
      w.position.set(hand === 'right' ? -0.35 : 0.35, 0.5, 0.1);
      this.model.add(w);
    }
    w.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = (m.material as THREE.Material).clone();
        const sm = m.material as THREE.MeshStandardMaterial;
        if (sm.isMeshStandardMaterial) {
          this.materials.push(sm);
          this.baseEmissive.push(sm.emissive.clone());
        }
      }
    });
  }

  /** Tint e emissivo da zona (aplicado sobre a cor original). */
  tint(color: string, emissive: string): void {
    const c = new THREE.Color(color);
    const e = new THREE.Color(emissive);
    this.materials.forEach((m, i) => {
      if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
      m.color.copy(m.userData.baseColor as THREE.Color).multiply(c);
      m.emissive.copy(e);
      this.baseEmissive[i] = e.clone();
    });
  }

  setShadowRadius(r: number): void {
    this.shadow.scale.setScalar(r / 0.55);
  }

  // ---------------- Animações ----------------

  private action(role: ClipRole): THREE.AnimationAction | null {
    if (!this.mixer) return null;
    if (this.actions.has(role)) return this.actions.get(role)!;
    const clip = this.assets.clip(role);
    if (!clip) return null;
    const a = this.mixer.clipAction(clip);
    this.actions.set(role, a);
    return a;
  }

  hasClip(role: ClipRole): boolean {
    return !!this.action(role);
  }

  play(role: ClipRole, opts: { once?: boolean; fade?: number; timeScale?: number } = {}): boolean {
    const a = this.action(role);
    this.procedural = { role, t: 0 };
    if (!a) return false;
    a.reset();
    a.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, opts.once ? 1 : Infinity);
    a.clampWhenFinished = !!opts.once;
    a.timeScale = opts.timeScale ?? 1;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, opts.fade ?? 0.15, false);
    a.play();
    this.current = a;
    return true;
  }

  private roleOf(a: THREE.AnimationAction): ClipRole | undefined {
    for (const [role, act] of this.actions) if (act === a) return role;
    return undefined;
  }

  private onClipFinished(a: THREE.AnimationAction): void {
    const role = this.roleOf(a);
    if (role === 'death' || role === 'deathAlt') {
      this.startShrink();
    } else if (role !== this.idleRole && !this.dying) {
      this.play(this.idleRole, { fade: 0.2 });
    }
  }

  /** Clipe de parado deste personagem (o Mago usa Idle_B). */
  idleRole: ClipRole = 'idle';
  private lastHitAt = -1;
  private hitToggle = false;

  /** Duração (s) de um clipe, já considerando a velocidade de reprodução. */
  clipDuration(role: ClipRole, timeScale = 1): number {
    const a = this.action(role);
    return a ? a.getClip().duration / timeScale : 0;
  }

  spawn(air = false): void {
    if (!this.play(air ? 'spawnAir' : 'spawn', { once: true, timeScale: 1.4 })) {
      this.procedural = { role: 'spawn', t: 0 };
    }
  }

  idle(role: ClipRole = this.idleRole): void {
    this.idleRole = role;
    this.play(role);
  }

  /** Comemoração (Interact/Use_Item), volta ao idle sozinho. */
  cheer(): void {
    if (!this.dying) this.play('cheer', { once: true, fade: 0.15, timeScale: 1.3 });
  }

  hit(): void {
    if (this.dying) return;
    this.flashT = 0.12;
    this.squashT = 0.18;
    // Não interrompe o Spawn no meio.
    const r = this.current ? this.roleOf(this.current) : undefined;
    if ((r === 'spawn' || r === 'spawnAir') && this.current!.isRunning()) return;
    // Limite de frequência: não reinicia o clipe a cada toque rápido.
    if (this.time - this.lastHitAt < 0.28) return;
    this.lastHitAt = this.time;
    this.hitToggle = !this.hitToggle;
    this.play(this.hitToggle ? 'hit' : 'hitAlt', { once: true, fade: 0.1, timeScale: 1.5 });
  }

  die(): void {
    if (this.dying) return;
    this.dying = true;
    this.flashT = 0.15;
    if (!this.play(Math.random() < 0.5 ? 'death' : 'deathAlt', { once: true, fade: 0.05, timeScale: 1.8 })) {
      this.procedural = { role: 'death', t: 0 };
      // Modelo real sem clipe de morte: vai direto para o encolher.
      if (this.real) this.startShrink();
    }
  }

  private startShrink(): void {
    if (this.shrinkT < 0) this.shrinkT = 0;
  }

  update(dt: number): void {
    this.time += dt;
    this.mixer?.update(dt);

    // Animações procedurais de fallback.
    const p = this.procedural;
    p.t += dt;
    const body = this.real ? null : this.model.getObjectByName('body');
    if (!this.real && body) {
      body.position.y = 0;
      body.rotation.set(0, 0, 0);
      if (p.role === 'idle' || p.role === 'hit' || p.role === 'throw' || p.role === 'attack') {
        body.position.y = Math.abs(Math.sin(this.time * 2.2)) * 0.03;
        body.rotation.z = Math.sin(this.time * 1.1) * 0.03;
      }
      if (p.role === 'hit' && p.t < 0.25) body.rotation.x = -Math.sin((p.t / 0.25) * Math.PI) * 0.35;
      if (p.role === 'spawn') {
        const k = Math.min(1, p.t / 0.45);
        body.position.y = -1.2 * (1 - k) * (1 - k);
        if (k >= 1) this.procedural = { role: 'idle', t: 0 };
      }
      if (p.role === 'death') {
        const k = Math.min(1, p.t / 0.45);
        body.rotation.x = -k * 1.4;
        body.position.y = k * 0.1;
        if (k >= 1) this.startShrink();
      }
    }

    // Flash branco no impacto.
    if (this.flashT > 0) {
      this.flashT -= dt;
      const w = Math.max(0, this.flashT / 0.12);
      this.materials.forEach((m, i) => m.emissive.copy(this.baseEmissive[i]).lerp(new THREE.Color(1, 1, 1), w * 0.8));
    } else if (this.flashT > -1) {
      this.flashT = -1;
      this.materials.forEach((m, i) => m.emissive.copy(this.baseEmissive[i]));
    }

    // Squash leve.
    let sx = 1;
    let sy = 1;
    if (this.squashT > 0) {
      this.squashT -= dt;
      const k = Math.sin((this.squashT / 0.18) * Math.PI) * 0.12;
      sx = 1 + k;
      sy = 1 - k;
    }

    // Encolher + girar depois da morte.
    if (this.shrinkT >= 0) {
      this.shrinkT += dt;
      const k = Math.min(1, this.shrinkT / 0.35);
      const s = 1 - k;
      sx *= s;
      sy *= s;
      this.root.rotation.y += dt * 14;
      if (k >= 1 && !this.deathDone) {
        this.deathDone = true;
        this.onDeathFinished?.();
      }
    }
    this.root.scale.set(this.baseScale * sx, this.baseScale * sy, this.baseScale * sx);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mixer?.stopAllAction();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        // Geometrias são compartilhadas com o cache nos modelos reais; só libera materiais.
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((x) => x.dispose());
        if (!this.real) m.geometry.dispose();
      }
    });
  }
}
