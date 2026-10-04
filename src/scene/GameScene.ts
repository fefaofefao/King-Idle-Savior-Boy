import * as THREE from 'three';
import {
  CAMERA,
  CHARACTER,
  ENEMY_WEIGHTS,
  HAND_BONES,
  RENDER,
  ZONES,
  type ModelKey,
  type WeaponKey,
} from '../config/visual';
import { Actor } from './Actor';
import type { Assets } from './Assets';
import { Particles, Projectiles, bossAura } from './Effects';
import { KnightAttack } from './KnightAttack';
import { ZoneEnvironment } from './Zones';

const ENEMY_WEAPONS: Record<string, [WeaponKey, 'right' | 'left'][]> = {
  skeletonMinion: [['skeletonBlade', 'right']],
  skeletonRogue: [['skeletonBlade', 'left']],
  skeletonMage: [['skeletonStaff', 'right']],
  skeletonWarrior: [['skeletonAxe', 'right'], ['skeletonShield', 'left']],
};

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private hemi: THREE.HemisphereLight;
  private zone: ZoneEnvironment;
  private particles: Particles;
  private projectiles: Projectiles;
  private knight: Actor;
  private knightAttack: KnightAttack;
  private mage: Actor;
  private enemy: Actor | null = null;
  private dying: Actor[] = [];
  private aura: THREE.Group | null = null;
  private enemyIsBoss = false;
  private zoneIndex = 0;
  private mageThrowT = -1;
  private mageReleaseAt = 0.12;
  private mageHand: THREE.Object3D | null = null;
  private shakeT = 0;
  private shakeMag = 0;
  private camBase = new THREE.Vector3(...CAMERA.pos);
  private lookAt = new THREE.Vector3(...CAMERA.lookAt);
  private enemyPos = new THREE.Vector3(...CHARACTER.enemy.pos);

  // Controle do loop / bateria.
  private running = false;
  private rafId = 0;
  private last = 0;
  private renderAcc = 0;
  private lastInteraction = performance.now();
  private fpsFrames = 0;
  private fpsTime = 0;
  private pixelRatio: number;
  onFrame: (dt: number) => void = () => {};

  constructor(
    private container: HTMLElement,
    private assets: Assets,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 60);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.lookAt);

    // Iluminação cartoon: hemisphere + directional, sem shadow maps.
    this.hemi = new THREE.HemisphereLight('#ffffff', '#555555', 1.6);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#ffffff', 1.8);
    sun.position.set(3, 6, 4);
    this.scene.add(sun);

    this.zone = new ZoneEnvironment(this.scene, this.hemi);
    this.particles = new Particles(this.scene);
    this.projectiles = new Projectiles(this.scene, this.particles);

    this.knight = this.makeActor('knight', CHARACTER.knight, [['knightSword', 'right'], ['knightShield', 'left']]);
    this.knight.idle();
    this.knightAttack = new KnightAttack(this.knight, this.enemyPos);

    this.mage = this.makeActor('mage', CHARACTER.mage, [['mageStaff', 'right']]);
    this.mage.idle('idleAlt');
    this.mage.root.visible = false;

    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
  }

  private makeActor(
    key: ModelKey,
    cfg: { height: number; pos: readonly [number, number, number]; rotY: number },
    weapons: [WeaponKey, 'right' | 'left'][],
  ): Actor {
    const a = new Actor(this.assets, key, cfg.height);
    a.root.position.set(...cfg.pos);
    a.root.rotation.y = cfg.rotY;
    for (const [w, hand] of weapons) a.attachWeapon(w, hand);
    this.scene.add(a.root);
    return a;
  }

  /** Área livre da tela (px) entre o HUD de cima e os botões de baixo, onde a luta deve caber. */
  private insetTop = 0;
  private insetBottom = 0;

  setInsets(top: number, bottom: number): void {
    if (Math.abs(top - this.insetTop) < 2 && Math.abs(bottom - this.insetBottom) < 2) return;
    this.insetTop = top;
    this.insetBottom = bottom;
    this.resize();
  }

  /**
   * Enquadramento responsivo: afasta a câmera o suficiente para o Cavaleiro, a Maga e o inimigo
   * (inclusive o chefe ×1,6) caberem na faixa livre, e desloca a imagem para o centro dessa faixa.
   */
  resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h;

    const band = Math.max(h * 0.35, h - this.insetTop - this.insetBottom);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2));
    const distForHeight = (CAMERA.fitHeight * h) / (band * 2 * tanHalf);
    const distForWidth = CAMERA.fitWidth / (2 * tanHalf * this.camera.aspect);
    const dist = Math.max(CAMERA.minDistance, distForHeight, distForWidth);
    const dir = new THREE.Vector3(...CAMERA.pos).sub(this.lookAt).normalize();
    this.camBase.copy(this.lookAt).addScaledVector(dir, dist);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.lookAt);
    // Centraliza o ponto de mira no meio da faixa livre.
    const shift = (this.insetTop - this.insetBottom) / 2;
    this.camera.setViewOffset(w, h, 0, -shift, w, h);
    this.camera.updateProjectionMatrix();
  }

  // ---------------- API usada pelo jogo ----------------

  get currentZone(): number {
    return this.zoneIndex;
  }

  setZone(index: number): void {
    this.zoneIndex = index;
    this.zone.setZone(index);
  }

  setMageVisible(v: boolean): void {
    this.mage.root.visible = v;
  }

  spawnEnemy(boss: boolean): void {
    if (this.enemy && !this.enemy.dying) this.enemy.dispose();
    this.removeAura();
    let key: ModelKey = 'skeletonWarrior';
    if (!boss) {
      let r = Math.random();
      key = ENEMY_WEIGHTS[0].key;
      for (const e of ENEMY_WEIGHTS) {
        if (r < e.weight) {
          key = e.key;
          break;
        }
        r -= e.weight;
      }
    }
    const e = this.makeActor(key, CHARACTER.enemy, ENEMY_WEAPONS[key] ?? []);
    const z = ZONES[this.zoneIndex];
    e.tint(z.enemyTint, boss ? '#3a0000' : z.enemyEmissive);
    if (boss) {
      e.baseScale = CHARACTER.bossScale;
      e.setShadowRadius(0.9);
      this.aura = bossAura();
      this.aura.position.copy(this.enemyPos);
      this.aura.scale.setScalar(CHARACTER.bossScale);
      this.scene.add(this.aura);
    }
    e.spawn(boss);
    this.enemy = e;
    this.enemyIsBoss = boss;
  }

  private removeAura(): void {
    if (!this.aura) return;
    this.aura.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.aura.removeFromParent();
    this.aura = null;
  }

  knightSwing(): void {
    this.knightAttack.trigger();
  }

  enemyHit(crit: boolean, strong = false): void {
    if (!this.enemy || this.enemy.dying) return;
    this.enemy.hit();
    const at = this.enemyPos.clone().setY(1.0 * (this.enemyIsBoss ? 1.5 : 1));
    this.particles.burst(at, crit ? '#ffd54a' : '#ffffff', crit ? 10 : 4, crit ? 3.2 : 2, 6, crit ? 1.2 : 0.8);
    if (crit || strong) this.shake(strong ? 0.12 : 0.06);
  }

  enemyDie(): void {
    const e = this.enemy;
    if (!e) return;
    this.enemy = null;
    this.removeAura();
    e.die();
    const boss = this.enemyIsBoss;
    e.onDeathFinished = () => {
      const at = this.enemyPos.clone().setY(0.6);
      const z = ZONES[this.zoneIndex];
      this.particles.burst(at, z.enemyTint, boss ? 30 : 16, boss ? 4 : 3, 7, boss ? 1.6 : 1);
      this.particles.burst(at, '#ffd54a', boss ? 14 : 6, 3, 7, 0.8);
      e.dispose();
      this.dying = this.dying.filter((d) => d !== e);
    };
    this.dying.push(e);
  }

  mageCast(): void {
    if (!this.mage.root.visible) return;
    this.mage.play('throw', { once: true, timeScale: 1.6, fade: 0.1 });
    this.mageThrowT = 0;
    // O projétil sai quando o braço está à frente (~40% do clipe Throw).
    this.mageReleaseAt = this.mage.clipDuration('throw', 1.6) * 0.4 || 0.12;
  }

  /** Comemoração do Cavaleiro (chefe derrotado / level up). */
  knightCheer(): void {
    this.knight.cheer();
  }

  shake(mag: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = 0.25;
  }

  /** Posição em tela (px CSS, relativa à viewport) da cabeça do inimigo. */
  enemyScreenPos(): { x: number; y: number } {
    const h = this.enemyIsBoss ? 2.6 : 1.8;
    const v = this.enemyPos.clone().setY(h).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  markInteraction(): void {
    this.lastInteraction = performance.now();
  }

  // ---------------- Loop ----------------

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.onFrame(dt);
      // 60 fps durante interação, 30 fps após 20 s sem toque.
      const idle = now - this.lastInteraction > RENDER.idleAfterSec * 1000;
      const target = idle ? RENDER.idleFps : RENDER.activeFps;
      this.renderAcc += dt;
      if (this.renderAcc + 0.002 < 1 / target) return;
      const frameDt = this.renderAcc;
      this.renderAcc = 0;
      this.renderFrame(frameDt);
      if (!idle) this.measureFps(frameDt);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private measureFps(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 4) {
      const fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
      if (fps < RENDER.lowFpsThreshold && this.pixelRatio > RENDER.lowPixelRatio) {
        this.pixelRatio = RENDER.lowPixelRatio;
        this.renderer.setPixelRatio(this.pixelRatio);
        this.resize();
        console.info('[render] FPS baixo, pixelRatio reduzido para', this.pixelRatio);
      }
    }
  }

  private renderFrame(dt: number): void {
    this.knight.update(dt);
    this.knightAttack.update(dt);
    if (this.mage.root.visible) this.mage.update(dt);
    if (this.mageThrowT >= 0) {
      this.mageThrowT += dt;
      if (this.mageThrowT > this.mageReleaseAt) {
        this.mageThrowT = -1;
        this.mageHand ??= this.mage.getBone(HAND_BONES.right);
        const from = this.mageHand
          ? this.mageHand.getWorldPosition(new THREE.Vector3())
          : this.mage.root.position.clone().add(new THREE.Vector3(0.25, 1.3, 0.1));
        const to = this.enemyPos.clone().setY(this.enemyIsBoss ? 1.5 : 1);
        this.projectiles.fire(from, to, 0.3);
      }
    }
    this.enemy?.update(dt);
    for (const d of [...this.dying]) d.update(dt);
    if (this.aura) {
      const t = performance.now() / 1000;
      this.aura.rotation.y = t * 0.8;
      const ring = this.aura.getObjectByName('ring') as THREE.Mesh;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t * 4) * 0.2;
    }
    this.particles.update(dt);
    this.projectiles.update(dt);
    this.zone.update(dt);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeT / 0.25);
      this.camera.position.set(
        this.camBase.x + (Math.random() - 0.5) * m,
        this.camBase.y + (Math.random() - 0.5) * m,
        this.camBase.z,
      );
      if (this.shakeT <= 0) {
        this.shakeMag = 0;
        this.camera.position.copy(this.camBase);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
