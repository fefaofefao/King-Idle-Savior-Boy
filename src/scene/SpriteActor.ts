import * as THREE from 'three';
import { SPRITE_BOSS } from '../config/visual';
import { fakeShadow } from './Fallback';

/** O que a cena precisa de um inimigo (implementado por Actor 3D e por SpriteActor). */
export interface EnemyActor {
  readonly root: THREE.Object3D;
  dying: boolean;
  baseScale: number;
  onDeathFinished?: () => void;
  spawn(air?: boolean): void;
  hit(): void;
  die(): void;
  flee(onDone: () => void): void;
  update(dt: number): void;
  dispose(): void;
}

const textureCache = new Map<string, THREE.Texture>();

function loadPixelTexture(url: string): THREE.Texture {
  let tex = textureCache.get(url);
  if (!tex) {
    tex = new THREE.TextureLoader().load(url);
    // Pixel art nítido: sem suavização nem mipmaps.
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(url, tex);
  }
  return tex;
}

/**
 * Rei Esqueleto em pixel art desenhado como billboard (sempre de frente para a câmera).
 * - Parado: sprite + respiração procedural.
 * - Soco (Cross_Punch, 6 frames) a cada ~2,6 s; no frame de impacto chama `onPunch` (o Cavaleiro recua).
 * - Fase 2 (vida < 40%): vira a versão dourada e soca mais rápido.
 * - Dano: recuo + flash vermelho; morte: tomba e encolhe.
 */
export class SpriteActor implements EnemyActor {
  readonly root = new THREE.Group();
  private sprite: THREE.Sprite;
  private mat: THREE.SpriteMaterial;
  private idleTex: THREE.Texture;
  private goldenTex: THREE.Texture;
  private punchTex: THREE.Texture;
  private time = 0;
  private spawnT = -1;
  private hitT = 0;
  private deathT = -1;
  private fleeT = -1;
  private punchT = -1;
  private punchTimer = 1.6;
  private impactDone = false;
  enraged = false;
  dying = false;
  baseScale = 1;
  onDeathFinished?: () => void;
  /** Chamado no frame de impacto do soco. */
  onPunch?: () => void;
  private done = false;

  constructor() {
    const S = SPRITE_BOSS;
    this.idleTex = loadPixelTexture(S.dir + S.idle.file);
    this.goldenTex = loadPixelTexture(S.dir + S.golden.file);
    // Cópia própria do sheet para controlar o frame (offset) por instância.
    this.punchTex = loadPixelTexture(S.dir + S.punch.sheet).clone();
    this.punchTex.repeat.set(1 / S.punch.frames, 1);
    this.punchTex.needsUpdate = true;
    this.mat = new THREE.SpriteMaterial({ map: this.idleTex, transparent: true, alphaTest: 0.1 });
    this.sprite = new THREE.Sprite(this.mat);
    this.root.add(this.sprite);
    this.root.add(fakeShadow(0.95));
  }

  spawn(): void {
    this.spawnT = 0;
  }

  hit(): void {
    if (this.dying) return;
    if (this.hitT < 0.06) this.hitT = 0.16;
  }

  /** Fase 2: versão dourada. */
  enrage(): void {
    if (this.enraged || this.dying) return;
    this.enraged = true;
    this.punchTimer = Math.min(this.punchTimer, 0.4);
  }

  die(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathT = 0;
    this.punchT = -1;
  }

  flee(onDone: () => void): void {
    this.dying = true;
    this.fleeT = 0;
    this.onDeathFinished = onDone;
  }

  update(dt: number): void {
    const S = SPRITE_BOSS;
    this.time += dt;

    // Soco periódico (só vivo e depois de surgir).
    if (!this.dying && this.spawnT < 0) {
      if (this.punchT < 0) {
        this.punchTimer -= dt;
        if (this.punchTimer <= 0) {
          this.punchT = 0;
          this.impactDone = false;
        }
      } else {
        this.punchT += dt;
        const f = Math.floor(this.punchT * S.punch.fps);
        if (!this.impactDone && f >= S.punch.impactFrame) {
          this.impactDone = true;
          this.onPunch?.();
        }
        if (f >= S.punch.frames) {
          this.punchT = -1;
          this.punchTimer = this.enraged ? S.punchEveryEnraged : S.punchEvery;
        }
      }
    }

    // Textura + enquadramento: a escala por pixel é a mesma em todas as poses.
    const pxWorld = (S.height * this.baseScale) / S.idle.framePx;
    let framePx: number = S.idle.framePx;
    let footPx: number = S.idle.footPx;
    if (this.punchT >= 0) {
      const f = Math.min(S.punch.frames - 1, Math.floor(this.punchT * S.punch.fps));
      this.punchTex.offset.x = f / S.punch.frames;
      this.mat.map = this.punchTex;
      framePx = S.punch.framePx;
      footPx = S.punch.footPx;
    } else {
      this.mat.map = this.enraged ? this.goldenTex : this.idleTex;
    }
    this.sprite.center.set(0.5, footPx / framePx);
    const size = framePx * pxWorld;

    let sx = 1;
    let sy = this.punchT >= 0 ? 1 : 1 + Math.sin(this.time * 2.4) * 0.025; // respiração
    let y = 0;
    let rot = 0;
    const color = this.mat.color;
    // Fase 2 parada já é dourada; no soco, um brilho dourado lembra que está furioso.
    if (this.enraged && this.punchT >= 0) color.setRGB(1.0, 0.85, 0.45);
    else color.setRGB(1, 1, 1);

    if (this.spawnT >= 0) {
      this.spawnT += dt;
      const k = Math.min(1, this.spawnT / 0.6);
      y = -size * 0.6 * (1 - k) * (1 - k);
      if (k >= 1) this.spawnT = -1;
    }
    if (this.hitT > 0) {
      this.hitT -= dt;
      const k = this.hitT / 0.16;
      sx *= 1 + k * 0.08;
      sy *= 1 - k * 0.08;
      rot = k * 0.06;
      color.setRGB(1, 1 - k * 0.55, 1 - k * 0.55); // flash vermelho
    }
    if (this.deathT >= 0) {
      this.deathT += dt;
      const k = Math.min(1, this.deathT / 0.7);
      rot = -k * 1.3;
      sx *= 1 - k * 0.6;
      sy *= 1 - k;
      color.setRGB(1, 1 - k * 0.6, 1 - k * 0.6);
      this.mat.opacity = 1 - k * k;
      if (k >= 1) this.finish();
    }
    if (this.fleeT >= 0) {
      this.fleeT += dt;
      const k = Math.min(1, this.fleeT / 0.45);
      y = Math.sin(k * Math.PI) * 0.8;
      sx *= 1 - k;
      sy *= 1 - k;
      if (k >= 1) this.finish();
    }
    this.sprite.scale.set(size * sx, size * sy, 1);
    this.sprite.position.y = y;
    this.mat.rotation = rot;
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDeathFinished?.();
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mat.dispose();
    this.punchTex.dispose();
  }
}
