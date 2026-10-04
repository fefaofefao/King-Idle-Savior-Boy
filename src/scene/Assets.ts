import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  CLIP_ALIASES,
  MODEL_PATHS,
  WEAPON_PATHS,
  type ClipRole,
  type ModelKey,
  type WeaponKey,
} from '../config/visual';
import { buildFallbackCharacter, buildFallbackWeapon } from './Fallback';

/**
 * Cache de recursos 3D: cada GLB é carregado uma única vez e clonado com SkeletonUtils.clone.
 * Se um arquivo falhar, registra um aviso e usa um boneco primitivo.
 */
export class Assets {
  private models = new Map<ModelKey, THREE.Object3D | null>();
  private weapons = new Map<WeaponKey, THREE.Object3D | null>();
  private clips: THREE.AnimationClip[] = [];
  private loader: GLTFLoader;
  /** true se ao menos um modelo real foi carregado. */
  realModels = false;
  warnings: string[] = [];

  constructor() {
    this.loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('draco/');
    this.loader.setDRACOLoader(draco);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  private loadGltf(url: string): Promise<GLTF | null> {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (g) => resolve(g),
        undefined,
        (err) => {
          const msg = `[assets] falha ao carregar ${url} — usando forma primitiva`;
          console.warn(msg, err);
          this.warnings.push(url);
          resolve(null);
        },
      );
    });
  }

  /** Carrega tudo, reportando progresso de 0 a 1. Nunca rejeita. */
  async loadAll(onProgress: (p: number) => void): Promise<void> {
    const modelKeys = Object.keys(MODEL_PATHS).filter((k) => k !== 'animations') as ModelKey[];
    const weaponKeys = Object.keys(WEAPON_PATHS) as WeaponKey[];
    const total = modelKeys.length + weaponKeys.length + MODEL_PATHS.animations.length;
    let done = 0;
    const tick = () => onProgress(++done / total);

    // Sem servidor de arquivos estáticos para modelos (ex.: zip ainda não extraído), evita 404 em série.
    const probe = await this.exists(MODEL_PATHS.knight);

    await Promise.all([
      ...modelKeys.map(async (k) => {
        const g = probe ? await this.loadGltf(MODEL_PATHS[k] as string) : null;
        if (g) {
          this.realModels = true;
          g.scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) o.frustumCulled = false;
          });
        }
        this.models.set(k, g ? g.scene : null);
        tick();
      }),
      ...weaponKeys.map(async (k) => {
        const g = probe ? await this.loadGltf(WEAPON_PATHS[k]) : null;
        this.weapons.set(k, g ? g.scene : null);
        tick();
      }),
      ...MODEL_PATHS.animations.map(async (url) => {
        const g = probe ? await this.loadGltf(url) : null;
        if (g) this.clips.push(...g.animations);
        tick();
      }),
    ]);
    if (!probe) {
      console.warn('[assets] modelos KayKit não encontrados em public/models — usando bonecos primitivos.');
      this.warnings.push('models');
    }
  }

  private async exists(url: string): Promise<boolean> {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      const type = r.headers.get('content-type') ?? '';
      // O servidor de dev do Vite devolve index.html (200) para caminhos inexistentes.
      return r.ok && !type.includes('text/html');
    } catch {
      return false;
    }
  }

  /** Instância nova de um personagem (real ou primitivo). */
  character(key: ModelKey): { root: THREE.Object3D; real: boolean } {
    const src = this.models.get(key);
    if (src) {
      const root = skeletonClone(src);
      // Materiais próprios para tint/flash por instância.
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
        }
      });
      return { root, real: true };
    }
    return { root: buildFallbackCharacter(key), real: false };
  }

  weapon(key: WeaponKey): THREE.Object3D {
    const src = this.weapons.get(key);
    return src ? src.clone(true) : buildFallbackWeapon(key);
  }

  /** Procura um clipe pelo papel (idle/hit/death...) usando os aliases e, por fim, busca parcial. */
  clip(role: ClipRole): THREE.AnimationClip | null {
    const aliases = CLIP_ALIASES[role] as readonly string[];
    for (const name of aliases) {
      const c = this.clips.find((x) => x.name === name);
      if (c) return c;
    }
    const lower = role.toLowerCase();
    return this.clips.find((x) => x.name.toLowerCase().includes(lower)) ?? null;
  }
}
