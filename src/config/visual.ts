/**
 * Configuração visual centralizada: caminhos dos modelos, escalas, posições, câmera e zonas.
 *
 * IMPORTANTE: os caminhos abaixo seguem a organização de `assets_kaykit.zip`
 * (public/models/...). Se o ASSETS.md indicar nomes diferentes, ajuste SOMENTE este arquivo.
 * Se um arquivo não existir, o jogo usa um boneco primitivo no lugar (nunca trava).
 */

export const MODEL_PATHS = {
  knight: 'models/characters/knight.glb',
  mage: 'models/characters/mage.glb',
  skeletonMinion: 'models/characters/skeleton_minion.glb',
  skeletonRogue: 'models/characters/skeleton_rogue.glb',
  skeletonMage: 'models/characters/skeleton_mage.glb',
  skeletonWarrior: 'models/characters/skeleton_warrior.glb',
  /** Clipes compartilhados do rig médio (Idle, Hit, Death, Spawn, Throw...). */
  animations: ['models/animations/rig_medium_general.glb'],
} as const;

export const WEAPON_PATHS = {
  knightSword: 'models/weapons/sword_1handed.gltf',
  knightShield: 'models/weapons/shield_round.gltf',
  mageStaff: 'models/weapons/staff.gltf',
  skeletonBlade: 'models/weapons/skeleton_blade.gltf',
  skeletonDagger: 'models/weapons/dagger.gltf',
  skeletonStaff: 'models/weapons/skeleton_staff.gltf',
  skeletonAxe: 'models/weapons/axe_2handed.gltf',
  skeletonShield: 'models/weapons/skeleton_shield.gltf',
} as const;

export type ModelKey = keyof typeof MODEL_PATHS;
export type WeaponKey = keyof typeof WEAPON_PATHS;

/** Nomes de ossos onde as armas são presas (o GLTFLoader remove o ponto: "handslot.r" → "handslotr"). */
export const HAND_BONES = {
  right: ['handslot.r', 'handslotr', 'handslot_r', 'hand.r', 'handr'],
  left: ['handslot.l', 'handslotl', 'handslot_l', 'hand.l', 'handl'],
};

/** Ossos usados no ataque procedural do Cavaleiro (fallback enquanto não há clipe). */
export const ARM_BONES = ['upperarm.r', 'upperarmr', 'upperarm_r', 'arm.r', 'armr'];

/** Aliases de clipes: o primeiro nome encontrado no arquivo de animações é usado. */
export const CLIP_ALIASES = {
  idle: ['Idle_A', 'Idle', 'Idle_B', '1H_Melee_Idle', 'Unarmed_Idle'],
  hit: ['Hit_A', 'Hit_B', 'Hit'],
  death: ['Death_A', 'Death_B', 'Death'],
  spawn: ['Spawn_Ground', 'Spawn_Air', 'Spawn'],
  throw: ['Throw', 'Spellcast_Shoot', 'Spellcasting'],
  attack: ['1H_Melee_Attack_Chop', 'Melee_1H_Attack_Chop', '1H_Melee_Attack_Slice_Horizontal', 'Attack'],
} as const;
export type ClipRole = keyof typeof CLIP_ALIASES;

export const CHARACTER = {
  /** Altura alvo (unidades de mundo) — o modelo é escalado pela bounding box. */
  knight: { height: 1.7, pos: [-0.95, 0, 0.35] as const, rotY: 0.75 },
  mage: { height: 1.6, pos: [-0.2, 0, -1.7] as const, rotY: 0.35 },
  enemy: { height: 1.65, pos: [0.85, 0, 0] as const, rotY: -0.7 },
  bossScale: 1.6,
};

export const CAMERA = {
  fov: 40,
  pos: [0.05, 3.1, 8.2] as const,
  lookAt: [0, 1.45, 0] as const,
};

export const RENDER = {
  maxPixelRatio: 2,
  lowPixelRatio: 1.5,
  lowFpsThreshold: 42,
  activeFps: 60,
  idleFps: 30,
  idleAfterSec: 20,
};

export interface ZoneStyle {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundEdge: string;
  fog: string;
  /** Tint e emissivo aplicados aos esqueletos dessa zona. */
  enemyTint: string;
  enemyEmissive: string;
  props: 'trees' | 'crystals' | 'cacti' | 'ice' | 'lava';
  hemiSky: string;
  hemiGround: string;
}

/** Floresta → Caverna → Deserto → Gelo → Vulcão (ciclo a cada 50 fases). */
export const ZONES: ZoneStyle[] = [
  {
    skyTop: '#5fb3ff', skyBottom: '#d8f3ff', ground: '#6cc04a', groundEdge: '#3f8f33', fog: '#cdeeff',
    enemyTint: '#e9f5dc', enemyEmissive: '#0b2a06', props: 'trees', hemiSky: '#dff3ff', hemiGround: '#4c7a2a',
  },
  {
    skyTop: '#1b1533', skyBottom: '#4a3a6e', ground: '#5d5470', groundEdge: '#3a3350', fog: '#3a3058',
    enemyTint: '#d9d0ff', enemyEmissive: '#1d0f3a', props: 'crystals', hemiSky: '#b7a6ff', hemiGround: '#2b2540',
  },
  {
    skyTop: '#ff9e57', skyBottom: '#ffe3a8', ground: '#e9c37a', groundEdge: '#c99a52', fog: '#ffe0b0',
    enemyTint: '#fff0d0', enemyEmissive: '#2a1600', props: 'cacti', hemiSky: '#fff1d6', hemiGround: '#a07940',
  },
  {
    skyTop: '#7ab8e8', skyBottom: '#eef8ff', ground: '#e6f2fb', groundEdge: '#a9cde6', fog: '#e4f2ff',
    enemyTint: '#c8ecff', enemyEmissive: '#06243a', props: 'ice', hemiSky: '#ffffff', hemiGround: '#8fb7d6',
  },
  {
    skyTop: '#2a0a0a', skyBottom: '#a8341a', ground: '#3b2a2a', groundEdge: '#1e1414', fog: '#5a1d10',
    enemyTint: '#ffd0b8', enemyEmissive: '#4a0f00', props: 'lava', hemiSky: '#ffb08a', hemiGround: '#3a1208',
  },
];

/** Escolha do tipo de esqueleto comum (o Minion é o mais frequente). */
export const ENEMY_WEIGHTS: { key: ModelKey; weight: number }[] = [
  { key: 'skeletonMinion', weight: 0.55 },
  { key: 'skeletonRogue', weight: 0.25 },
  { key: 'skeletonMage', weight: 0.2 },
];
