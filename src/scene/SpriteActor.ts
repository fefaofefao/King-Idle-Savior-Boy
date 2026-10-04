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
 * Rei Esqueleto em pixel art (48×48) desenhado como billboard (sempre de frente para a câmera).
 * O sprite não tem frames de animação, então tudo é procedural:
 * respiração (escala), surgir do chão, recuo + flash vermelho ao levar dano, queda e encolher na morte.
 */
export class SpriteActor implements EnemyActor {
  readonly root = new THREE.Group();
  private sprite: THREE.Sprite;
  private mat: THREE.SpriteMaterial;
  private time = 0;
  private spawnT = -1;
  private hitT = 0;
  private deathT = -1;
  private fleeT = -1;
  dying = false;
  baseScale = 1;
  onDeathFinished?: () => void;
  private done = false;

  constructor(tint = '#ffffff') {
    const tex = loadPixelTexture(`${SPRITE_BOSS.dir}${SPRITE_BOSS.facing}.png`);
    this.mat = new THREE.SpriteMaterial({ map: tex, color: tint, transparent: true, alphaTest: 0.1 });
    this.sprite = new THREE.Sprite(this.mat);
    // Centro embaixo: o pé fica no chão.
    this.sprite.center.set(0.5, 0.04);
    this.sprite.scale.set(SPRITE_BOSS.height, SPRITE_BOSS.height, 1);
    this.root.add(this.sprite);
    const shadow = fakeShadow(0.95);
    this.root.add(shadow);
  }

  spawn(): void {
    this.spawnT = 0;
  }

  hit(): void {
    if (this.dying) return;
    if (this.hitT < 0.06) this.hitT = 0.16;
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
    const H = SPRITE_BOSS.height * this.baseScale;
    let sx = 1;
    let sy = 1 + Math.sin(this.time * 2.4) * 0.025; // respiração
    let y = 0;
    let rot = 0;
    const color = this.mat.color;
    color.setRGB(1, 1, 1);

    if (this.spawnT >= 0) {
      this.spawnT += dt;
      const k = Math.min(1, this.spawnT / 0.6);
      y = -H * 0.6 * (1 - k) * (1 - k);
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
    this.sprite.scale.set(H * sx, H * sy, 1);
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
  }
}
