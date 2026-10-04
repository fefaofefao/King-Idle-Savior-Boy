import * as THREE from 'three';
import { CREATURES, type CreatureKind } from '../config/visual';
import { fakeShadow } from './Fallback';
import type { EnemyActor } from './SpriteActor';

/**
 * Criaturas procedurais (sem GLB): Geleca, Cogumelo, Morcego, Golem e Diabrete.
 * Feitas de formas simples com material "toon" para combinar com o estilo KayKit.
 * Cada uma tem idle próprio (pulo, balanço, bater de asas...), reação a dano, morte e fuga.
 */
export class CreatureActor implements EnemyActor {
  readonly root = new THREE.Group();
  /** Grupo animado (squash/stretch, balanço). */
  readonly body = new THREE.Group();
  private parts: Record<string, THREE.Object3D> = {};
  private materials: THREE.MeshStandardMaterial[] = [];
  private baseEmissive: THREE.Color[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private shadow: THREE.Mesh;
  private time = Math.random() * 10;
  private spawnT = -1;
  private hitT = 0;
  private deathT = -1;
  private fleeT = -1;
  private tauntT = -1;
  private tauntTimer = 2 + Math.random() * 2;
  dying = false;
  baseScale = 1;
  onDeathFinished?: () => void;
  private done = false;

  constructor(private kind: CreatureKind) {
    const cfg = CREATURES[kind];
    this.root.add(this.body);
    this.shadow = fakeShadow(cfg.shadow);
    this.root.add(this.shadow);
    BUILDERS[kind](this);
    this.root.rotation.y = cfg.rotY;
  }

  // ---------- Construção ----------

  mat(color: string, opts: { emissive?: string; rough?: number; opacity?: number } = {}): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.6,
      metalness: 0,
      emissive: opts.emissive ?? '#000000',
      transparent: true,
      opacity: opts.opacity ?? 1,
    });
    m.userData.baseColor = m.color.clone();
    m.userData.baseOpacity = m.opacity;
    this.materials.push(m);
    this.baseEmissive.push(m.emissive.clone());
    return m;
  }

  mesh(geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = this.body, name?: string): THREE.Mesh {
    this.geometries.push(geo);
    const mesh = new THREE.Mesh(geo, m);
    parent.add(mesh);
    if (name) this.parts[name] = mesh;
    return mesh;
  }

  group(name: string, parent: THREE.Object3D = this.body): THREE.Group {
    const g = new THREE.Group();
    parent.add(g);
    this.parts[name] = g;
    return g;
  }

  /** Olho cartoon: branco + pupila (+ brilho). */
  eye(parent: THREE.Object3D, x: number, y: number, z: number, r: number, pupil = '#1a1020', white = '#ffffff'): void {
    const w = this.mesh(new THREE.SphereGeometry(r, 14, 10), this.mat(white, { rough: 0.3 }), parent);
    w.position.set(x, y, z);
    const p = this.mesh(new THREE.SphereGeometry(r * 0.55, 10, 8), this.mat(pupil, { rough: 0.2 }), parent);
    p.position.set(x, y, z + r * 0.6);
  }

  /** Cor da zona/variação (multiplica a cor base de todas as peças). */
  tint(color: string, emissive: string | null, mix = 1): void {
    const c = new THREE.Color('#ffffff').lerp(new THREE.Color(color), mix);
    const e = emissive ? new THREE.Color(emissive) : null;
    this.materials.forEach((m, i) => {
      m.color.copy(m.userData.baseColor as THREE.Color).multiply(c);
      if (e) {
        m.emissive.copy(this.baseEmissive[i]).add(e);
        this.baseEmissive[i] = m.emissive.clone();
      }
    });
  }

  // ---------- EnemyActor ----------

  spawn(): void {
    this.spawnT = 0;
  }

  hit(): void {
    if (this.dying) return;
    if (this.hitT < 0.06) this.hitT = 0.18;
  }

  die(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathT = 0;
  }

  flee(onDone: () => void): void {
    this.dying = true;
    this.fleeT = 0;
    this.onDeathFinished = onDone;
  }

  update(dt: number): void {
    this.time += dt;
    const cfg = CREATURES[this.kind];
    const s = this.baseScale;
    let sx = 1;
    let sy = 1;
    let y = cfg.hover;
    let rotZ = 0;
    let rotX = 0;

    // Provocação periódica (um pulo, um rasante...).
    if (!this.dying && this.spawnT < 0) {
      if (this.tauntT < 0) {
        this.tauntTimer -= dt;
        if (this.tauntTimer <= 0) this.tauntT = 0;
      } else {
        this.tauntT += dt;
        if (this.tauntT > 0.7) {
          this.tauntT = -1;
          this.tauntTimer = 2.5 + Math.random() * 2.5;
        }
      }
    }
    const tk = this.tauntT >= 0 ? Math.sin((this.tauntT / 0.7) * Math.PI) : 0;
    const anim = IDLE[this.kind](this.parts, this.time, tk);
    sx *= anim.sx;
    sy *= anim.sy;
    y += anim.y;
    rotZ += anim.rotZ;

    if (this.spawnT >= 0) {
      this.spawnT += dt;
      const k = Math.min(1, this.spawnT / 0.45);
      const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 : 1;
      sx *= k * pop;
      sy *= k * (2 - pop);
      y += (1 - k) * (cfg.hover > 0 ? 1.2 : 0);
      if (k >= 1) this.spawnT = -1;
    }
    let flash = 0;
    if (this.hitT > 0) {
      this.hitT -= dt;
      const k = Math.max(0, this.hitT / 0.18);
      sx *= 1 + k * 0.18;
      sy *= 1 - k * 0.16;
      rotZ += k * 0.18;
      flash = k;
    }
    let fade = 1;
    if (this.deathT >= 0) {
      this.deathT += dt;
      const k = Math.min(1, this.deathT / 0.6);
      sx *= 1 + k * 0.5;
      sy *= 1 - k * 0.85;
      rotX = k * 0.4;
      y = y * (1 - k);
      fade = 1 - k * k;
      if (k >= 1) this.finish();
    }
    if (this.fleeT >= 0) {
      this.fleeT += dt;
      const k = Math.min(1, this.fleeT / 0.45);
      y += Math.sin(k * Math.PI) * 0.8;
      sx *= 1 - k;
      sy *= 1 - k;
      if (k >= 1) this.finish();
    }

    this.body.scale.set(s * sx, s * sy, s * sx);
    this.body.position.y = y * s;
    this.body.rotation.z = rotZ;
    this.body.rotation.x = rotX;
    this.shadow.scale.setScalar(s * Math.max(0.2, 1 - y * 0.35));
    this.materials.forEach((m, i) => {
      m.emissive.copy(this.baseEmissive[i]);
      if (flash > 0) m.emissive.lerp(FLASH, flash * 0.8);
      m.opacity = (m.userData.baseOpacity as number) * fade;
    });
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDeathFinished?.();
  }

  dispose(): void {
    this.root.removeFromParent();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    (this.shadow.material as THREE.Material).dispose();
    this.shadow.geometry.dispose();
  }
}

const FLASH = new THREE.Color('#ff3030');

// ---------------- Construtores ----------------

type Builder = (c: CreatureActor) => void;

const BUILDERS: Record<CreatureKind, Builder> = {
  slime(c) {
    const jelly = c.mat('#5fd35a', { rough: 0.15, opacity: 0.88, emissive: '#0a2a08' });
    const body = c.mesh(new THREE.SphereGeometry(0.62, 28, 20), jelly, undefined, 'jelly');
    body.scale.set(1.1, 0.85, 1);
    body.position.y = 0.53;
    // Núcleo mais escuro (dá profundidade à gelatina).
    const core = c.mesh(new THREE.SphereGeometry(0.3, 16, 12), c.mat('#2f8f2c', { opacity: 0.7 }));
    core.position.set(0, 0.45, -0.05);
    const shine = c.mesh(new THREE.SphereGeometry(0.12, 10, 8), c.mat('#ffffff', { rough: 0.1, opacity: 0.8 }));
    shine.position.set(-0.28, 0.9, 0.32);
    shine.scale.set(1, 0.6, 0.5);
    c.eye(c.body, -0.2, 0.68, 0.48, 0.12);
    c.eye(c.body, 0.2, 0.68, 0.48, 0.12);
    const mouth = c.mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), c.mat('#123010'));
    mouth.position.set(0, 0.5, 0.56);
    mouth.rotation.z = Math.PI;
  },

  mushroom(c) {
    const stem = c.mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.75, 16), c.mat('#f2e2c4'), undefined, 'stem');
    stem.position.y = 0.48;
    const capG = c.group('cap');
    capG.position.y = 0.85;
    const cap = c.mesh(new THREE.SphereGeometry(0.62, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), c.mat('#d93a32', { rough: 0.45 }), capG);
    cap.scale.set(1, 0.75, 1);
    const under = c.mesh(new THREE.CircleGeometry(0.62, 24), c.mat('#c9a98a'), capG);
    under.rotation.x = Math.PI / 2;
    const spot = c.mat('#fff6e8');
    const spots: [number, number, number, number][] = [
      [0, 0.45, 0.05, 0.13],
      [0.36, 0.3, 0.25, 0.1],
      [-0.38, 0.28, 0.22, 0.1],
      [0.15, 0.25, -0.42, 0.11],
      [-0.2, 0.33, 0.38, 0.08],
    ];
    for (const [x, y, z, r] of spots) {
      const s = c.mesh(new THREE.SphereGeometry(r, 10, 8), spot, capG);
      s.position.set(x, y, z);
      s.scale.y = 0.45;
    }
    // Olhos bravos + sobrancelhas.
    c.eye(c.body, -0.11, 0.6, 0.25, 0.08);
    c.eye(c.body, 0.11, 0.6, 0.25, 0.08);
    const brow = c.mat('#3a1a10');
    for (const side of [-1, 1]) {
      const b = c.mesh(new THREE.BoxGeometry(0.16, 0.035, 0.04), brow);
      b.position.set(side * 0.11, 0.71, 0.31);
      b.rotation.z = side * -0.45;
    }
    for (const side of [-1, 1]) {
      const f = c.mesh(new THREE.SphereGeometry(0.13, 10, 8), c.mat('#8a5a3a'), undefined, side < 0 ? 'footL' : 'footR');
      f.position.set(side * 0.18, 0.08, 0.08);
      f.scale.set(1, 0.6, 1.3);
    }
  },

  bat(c) {
    const fur = c.mat('#4a3266', { rough: 0.8 });
    const body = c.mesh(new THREE.SphereGeometry(0.34, 18, 14), fur, undefined, 'torso');
    body.scale.set(1, 1.1, 0.9);
    const belly = c.mesh(new THREE.SphereGeometry(0.22, 14, 10), c.mat('#7a5a96'));
    belly.position.set(0, -0.06, 0.2);
    for (const side of [-1, 1]) {
      const ear = c.mesh(new THREE.ConeGeometry(0.1, 0.28, 8), fur);
      ear.position.set(side * 0.16, 0.38, 0);
      ear.rotation.z = side * -0.3;
    }
    c.eye(c.body, -0.12, 0.1, 0.27, 0.075, '#ff2a2a', '#ffe060');
    c.eye(c.body, 0.12, 0.1, 0.27, 0.075, '#ff2a2a', '#ffe060');
    const fang = c.mat('#ffffff');
    for (const side of [-1, 1]) {
      const f = c.mesh(new THREE.ConeGeometry(0.025, 0.08, 6), fang);
      f.position.set(side * 0.05, -0.08, 0.3);
      f.rotation.x = Math.PI;
    }
    // Asas: forma de "morcego" recortada.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.35, 0.28);
    shape.lineTo(0.85, 0.22);
    shape.quadraticCurveTo(0.72, 0.02, 0.8, -0.18);
    shape.quadraticCurveTo(0.6, -0.08, 0.52, -0.22);
    shape.quadraticCurveTo(0.38, -0.08, 0.26, -0.2);
    shape.quadraticCurveTo(0.18, -0.05, 0, -0.12);
    const wingMat = c.mat('#5c3d7d', { rough: 0.7 });
    wingMat.side = THREE.DoubleSide;
    for (const side of [-1, 1]) {
      const pivot = c.group(side < 0 ? 'wingL' : 'wingR');
      pivot.position.set(side * 0.22, 0.08, -0.02);
      const w = c.mesh(new THREE.ShapeGeometry(shape), wingMat, pivot);
      w.scale.x = side;
    }
  },

  golem(c) {
    const stone = c.mat('#8d8a86', { rough: 0.95 });
    const dark = c.mat('#6b6864', { rough: 0.95 });
    const moss = c.mat('#5c9a3c', { rough: 0.9 });
    const glow = c.mat('#7af2ff', { emissive: '#3ad8ff', rough: 0.3 });
    const torso = c.mesh(new THREE.BoxGeometry(0.95, 0.85, 0.6), stone, undefined, 'torso');
    torso.position.y = 0.95;
    torso.rotation.y = 0.05;
    const core = c.mesh(new THREE.OctahedronGeometry(0.12), glow);
    core.position.set(0, 1.0, 0.31);
    const mossTop = c.mesh(new THREE.BoxGeometry(0.75, 0.08, 0.5), moss);
    mossTop.position.set(-0.05, 1.41, 0);
    const head = c.mesh(new THREE.BoxGeometry(0.5, 0.42, 0.45), dark, undefined, 'head');
    head.position.set(0, 1.58, 0.05);
    for (const side of [-1, 1]) {
      const e = c.mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), glow);
      e.position.set(side * 0.12, 1.62, 0.28);
      const arm = c.group(side < 0 ? 'armL' : 'armR');
      arm.position.set(side * 0.62, 1.25, 0);
      const upper = c.mesh(new THREE.BoxGeometry(0.3, 0.55, 0.32), dark, arm);
      upper.position.y = -0.25;
      const fist = c.mesh(new THREE.BoxGeometry(0.4, 0.38, 0.4), stone, arm);
      fist.position.y = -0.68;
      const leg = c.mesh(new THREE.BoxGeometry(0.32, 0.5, 0.36), dark);
      leg.position.set(side * 0.25, 0.25, 0);
    }
  },

  imp(c) {
    const skin = c.mat('#e0442e', { rough: 0.5, emissive: '#3a0800' });
    const body = c.mesh(new THREE.SphereGeometry(0.3, 18, 14), skin, undefined, 'torso');
    body.position.y = 0.42;
    body.scale.set(1, 1.15, 0.95);
    const head = c.mesh(new THREE.SphereGeometry(0.27, 18, 14), skin, undefined, 'head');
    head.position.y = 0.9;
    const horn = c.mat('#3a2418', { rough: 0.4 });
    for (const side of [-1, 1]) {
      const h = c.mesh(new THREE.ConeGeometry(0.06, 0.24, 8), horn);
      h.position.set(side * 0.15, 1.13, 0);
      h.rotation.z = side * -0.4;
      const leg = c.mesh(new THREE.CapsuleGeometry(0.06, 0.18, 4, 8), skin);
      leg.position.set(side * 0.12, 0.12, 0);
      const arm = c.mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), skin);
      arm.position.set(side * 0.33, 0.48, 0.05);
      arm.rotation.z = side * 0.7;
    }
    c.eye(c.body, -0.1, 0.94, 0.22, 0.07, '#2a0a00', '#ffd23a');
    c.eye(c.body, 0.1, 0.94, 0.22, 0.07, '#2a0a00', '#ffd23a');
    const grin = c.mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI), c.mat('#2a0400'));
    grin.position.set(0, 0.82, 0.24);
    grin.rotation.z = Math.PI;
    // Asinhas e rabo.
    const wingMat = c.mat('#8a1a1a', { rough: 0.6 });
    wingMat.side = THREE.DoubleSide;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.32, 0.22);
    shape.lineTo(0.28, -0.05);
    shape.lineTo(0.12, -0.12);
    for (const side of [-1, 1]) {
      const pivot = c.group(side < 0 ? 'wingL' : 'wingR');
      pivot.position.set(side * 0.18, 0.6, -0.2);
      const w = c.mesh(new THREE.ShapeGeometry(shape), wingMat, pivot);
      w.scale.x = side;
    }
    const tail = c.group('tail');
    tail.position.set(0, 0.3, -0.25);
    const t1 = c.mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.4, 6), skin, tail);
    t1.rotation.x = -1.1;
    t1.position.set(0, 0.05, -0.17);
    const tip = c.mesh(new THREE.ConeGeometry(0.07, 0.14, 4), horn, tail);
    tip.position.set(0, 0.14, -0.36);
    tip.rotation.x = -1.1;
    // Chaminha na mão.
    const fire = c.mesh(new THREE.SphereGeometry(0.09, 10, 8), c.mat('#ffb020', { emissive: '#ff6a00', opacity: 0.9 }), undefined, 'fire');
    fire.position.set(0.48, 0.62, 0.1);
  },
};

// ---------------- Animações procedurais ----------------

interface Pose {
  sx: number;
  sy: number;
  y: number;
  rotZ: number;
}

type Idle = (p: Record<string, THREE.Object3D>, t: number, taunt: number) => Pose;

const IDLE: Record<CreatureKind, Idle> = {
  slime(_p, t, k) {
    const b = Math.sin(t * 3.2);
    // Pulo de provocação: estica pra cima e achata ao cair.
    return { sx: 1 + b * 0.06 - k * 0.12, sy: 1 - b * 0.06 + k * 0.2, y: k * 0.45, rotZ: 0 };
  },
  mushroom(p, t, k) {
    const sw = Math.sin(t * 2.4);
    p.cap.rotation.z = sw * 0.06 + k * 0.15;
    p.footL.position.y = 0.08 + Math.max(0, sw) * 0.06;
    p.footR.position.y = 0.08 + Math.max(0, -sw) * 0.06;
    return { sx: 1, sy: 1 + Math.abs(sw) * 0.03 + k * 0.08, y: k * 0.15, rotZ: sw * 0.05 };
  },
  bat(p, t, k) {
    const flap = Math.sin(t * 14);
    p.wingL.rotation.y = flap * 0.7;
    p.wingR.rotation.y = -flap * 0.7;
    p.wingL.rotation.z = flap * 0.25;
    p.wingR.rotation.z = -flap * 0.25;
    return { sx: 1, sy: 1 + flap * 0.03, y: Math.sin(t * 2.2) * 0.12 - k * 0.35, rotZ: Math.sin(t * 1.6) * 0.08 };
  },
  golem(p, t, k) {
    const br = Math.sin(t * 1.4);
    p.armL.rotation.x = br * 0.08 - k * 1.2;
    p.armR.rotation.x = -br * 0.08 - k * 1.2;
    p.head.rotation.y = Math.sin(t * 0.7) * 0.15;
    return { sx: 1 + br * 0.015, sy: 1 + br * 0.02 - k * 0.04, y: 0, rotZ: 0 };
  },
  imp(p, t, k) {
    p.wingL.rotation.y = Math.sin(t * 11) * 0.5;
    p.wingR.rotation.y = -Math.sin(t * 11) * 0.5;
    p.tail.rotation.y = Math.sin(t * 3) * 0.5;
    const f = p.fire as THREE.Mesh;
    f.scale.setScalar(1 + Math.sin(t * 17) * 0.15 + k * 0.6);
    return { sx: 1, sy: 1 + Math.sin(t * 4) * 0.03, y: Math.sin(t * 2.6) * 0.08 + k * 0.25, rotZ: k * -0.2 };
  },
};
