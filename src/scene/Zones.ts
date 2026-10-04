import * as THREE from 'three';
import { ZONES, type ZoneStyle } from '../config/visual';
import { seededRng } from '../core/retention';

/**
 * Cenário procedural: céu em gradiente, chão estilizado e props low-poly gerados por código.
 */
export class ZoneEnvironment {
  readonly group = new THREE.Group();
  private skyTex: THREE.CanvasTexture | null = null;
  private animated: { obj: THREE.Object3D; speed: number; base: number }[] = [];
  private t = 0;
  index = -1;

  constructor(
    private scene: THREE.Scene,
    private hemi: THREE.HemisphereLight,
  ) {
    scene.add(this.group);
  }

  setZone(index: number): void {
    if (index === this.index) return;
    this.index = index;
    const z = ZONES[index];
    this.clear();
    this.buildSky(z);
    this.buildGround(z);
    this.buildProps(z, index);
    this.scene.fog = new THREE.Fog(z.fog, 9, 22);
    this.hemi.color.set(z.hemiSky);
    this.hemi.groundColor.set(z.hemiGround);
  }

  private clear(): void {
    this.animated = [];
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.group.clear();
    this.skyTex?.dispose();
  }

  private buildSky(z: ZoneStyle): void {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, z.skyTop);
    g.addColorStop(1, z.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    this.skyTex = new THREE.CanvasTexture(c);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.skyTex;
  }

  private buildGround(z: ZoneStyle): void {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, 40),
      new THREE.MeshStandardMaterial({ color: z.ground, roughness: 1, flatShading: true }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);
    // Borda mais escura para dar profundidade.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 16, 40),
      new THREE.MeshStandardMaterial({ color: z.groundEdge, roughness: 1, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    this.group.add(ring);
    // Tablado da arena.
    const arena = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.75, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(z.ground).multiplyScalar(0.85), roughness: 1, flatShading: true }),
    );
    arena.position.y = -0.03;
    this.group.add(arena);
  }

  private std(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
  }

  private buildProps(z: ZoneStyle, index: number): void {
    const rng = seededRng(1234 + index * 97);
    const count = 26;
    for (let i = 0; i < count; i++) {
      // Distribui em anel atrás e nas laterais, fora da arena.
      const ang = Math.PI * (0.05 + rng() * 0.9) + Math.PI; // metade de trás
      const radius = 3.6 + rng() * 7;
      const x = Math.cos(ang) * radius * 1.2;
      const zPos = Math.sin(ang) * radius - 0.5;
      const s = 0.6 + rng() * 0.8;
      const prop = this.makeProp(z.props, rng);
      prop.position.set(x, 0, zPos);
      prop.scale.setScalar(s);
      prop.rotation.y = rng() * Math.PI * 2;
      this.group.add(prop);
    }
    // Alguns detalhes pequenos à frente.
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + rng() * 0.12, 0), this.std(z.groundEdge));
      rock.position.set(side * (2.4 + rng() * 1.5), 0.05, 1 + rng() * 2);
      this.group.add(rock);
    }
  }

  private makeProp(kind: ZoneStyle['props'], rng: () => number): THREE.Object3D {
    const g = new THREE.Group();
    switch (kind) {
      case 'trees': {
        if (rng() < 0.75) {
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 5), this.std('#7a4f2e'));
          trunk.position.y = 0.3;
          g.add(trunk);
          const green = ['#3e9b3a', '#53b244', '#2f8a3a'][Math.floor(rng() * 3)];
          for (let k = 0; k < 3; k++) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55 - k * 0.12, 0.7, 7), this.std(green));
            cone.position.y = 0.75 + k * 0.38;
            g.add(cone);
          }
        } else {
          const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), this.std('#4caf50'));
          bush.position.y = 0.2;
          g.add(bush);
        }
        break;
      }
      case 'crystals': {
        if (rng() < 0.6) {
          const color = ['#9b7bff', '#5ad1ff', '#ff7bd5'][Math.floor(rng() * 3)];
          for (let k = 0; k < 3; k++) {
            const c = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.22 + rng() * 0.15),
              this.std(color, { emissive: color, emissiveIntensity: 0.6, roughness: 0.3 }),
            );
            c.scale.y = 2;
            c.position.set((rng() - 0.5) * 0.4, 0.35, (rng() - 0.5) * 0.4);
            c.rotation.z = (rng() - 0.5) * 0.6;
            g.add(c);
            this.animated.push({ obj: c, speed: 1 + rng(), base: 0.35 });
          }
        } else {
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), this.std('#4a4160'));
          rock.position.y = 0.3;
          rock.scale.y = 1.4;
          g.add(rock);
        }
        break;
      }
      case 'cacti': {
        if (rng() < 0.55) {
          const mat = this.std('#3f9a4a');
          const main = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.1, 7), mat);
          main.position.y = 0.55;
          g.add(main);
          for (const side of [-1, 1]) {
            if (rng() < 0.7) {
              const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 6), mat);
              arm.position.set(side * 0.22, 0.65 + rng() * 0.2, 0);
              g.add(arm);
            }
          }
        } else {
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), this.std('#c98d4f'));
          rock.position.y = 0.25;
          rock.scale.set(1.3, 0.8, 1);
          g.add(rock);
        }
        break;
      }
      case 'ice': {
        const color = rng() < 0.5 ? '#bfe6ff' : '#e8f6ff';
        for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) {
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.16 + rng() * 0.1, 0.8 + rng() * 0.8, 5),
            this.std(color, { roughness: 0.2, metalness: 0.1, emissive: '#3a7ab0', emissiveIntensity: 0.15 }),
          );
          spike.position.set((rng() - 0.5) * 0.6, 0.4, (rng() - 0.5) * 0.6);
          spike.rotation.z = (rng() - 0.5) * 0.4;
          g.add(spike);
        }
        break;
      }
      case 'lava': {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + rng() * 0.3, 0), this.std('#2a1d1d'));
        rock.position.y = 0.25;
        rock.scale.y = 0.6 + rng() * 1.2;
        g.add(rock);
        if (rng() < 0.5) {
          const glow = new THREE.Mesh(
            new THREE.CircleGeometry(0.35 + rng() * 0.3, 8),
            new THREE.MeshBasicMaterial({ color: '#ff6a1a' }),
          );
          glow.rotation.x = -Math.PI / 2;
          glow.position.set(0.6, 0.02, 0.3);
          g.add(glow);
          this.animated.push({ obj: glow, speed: 2 + rng() * 2, base: -1 });
        }
        break;
      }
    }
    return g;
  }

  update(dt: number): void {
    this.t += dt;
    for (const a of this.animated) {
      if (a.base >= 0) a.obj.position.y = a.base + Math.sin(this.t * a.speed) * 0.05;
      else {
        const m = (a.obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.color.setHSL(0.05, 1, 0.45 + Math.sin(this.t * a.speed) * 0.08);
      }
    }
  }
}
