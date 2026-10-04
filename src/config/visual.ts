/**
 * Configuração visual centralizada: caminhos dos modelos, escalas, posições, câmera e zonas.
 *
 * IMPORTANTE: os caminhos abaixo seguem a organização de `assets_kaykit.zip`
 * (public/models/...). Se o ASSETS.md indicar nomes diferentes, ajuste SOMENTE este arquivo.
 * Se um arquivo não existir, o jogo usa um boneco primitivo no lugar (nunca trava).
 */

export const MODEL_PATHS = {
  knight: 'models/heroes/knight.glb',
  mage: 'models/heroes/mage.glb',
  skeletonMinion: 'models/enemies/skeleton_minion.glb',
  skeletonRogue: 'models/enemies/skeleton_rogue.glb',
  skeletonMage: 'models/enemies/skeleton_mage.glb',
  skeletonWarrior: 'models/enemies/skeleton_warrior.glb',
  /** Clipes compartilhados do Rig_Medium (Idle_A/B, Hit_A/B, Death_A/B, Spawn_Ground/Air, Throw, Interact...). */
  animations: ['models/animations/rig_medium_general.glb'],
} as const;

/**
 * Arquivos OPCIONAIS de clipes de combate (pack KayKit Character Animations). Se algum existir,
 * os clipes de ataque dele são usados automaticamente no lugar do ataque procedural.
 */
export const OPTIONAL_ANIMATIONS = [
  'models/animations/rig_medium_combat.glb',
  'models/animations/rig_medium_combat_melee.glb',
  'models/animations/rig_medium_combatmelee.glb',
] as const;

/** O pack não traz armas de esqueleto: os inimigos reutilizam as armas dos heróis. */
export const WEAPON_PATHS = {
  knightSword: 'models/weapons/sword_1handed.glb',
  knightShield: 'models/weapons/shield_badge_color.glb',
  mageStaff: 'models/weapons/staff.glb',
  skeletonBlade: 'models/weapons/sword_1handed.glb',
  skeletonDagger: 'models/weapons/wand.glb',
  skeletonStaff: 'models/weapons/staff.glb',
  skeletonAxe: 'models/weapons/sword_1handed.glb',
  skeletonShield: 'models/weapons/shield_badge_color.glb',
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
export const FOREARM_BONES = ['lowerarm.r', 'lowerarmr', 'lowerarm_r'];

/** Aliases de clipes: o primeiro nome encontrado no arquivo de animações é usado. */
export const CLIP_ALIASES = {
  idle: ['Idle_A', 'Idle', 'Idle_B', '1H_Melee_Idle', 'Unarmed_Idle'],
  idleAlt: ['Idle_B', 'Idle_A'],
  hit: ['Hit_A', 'Hit', 'Hit_B'],
  hitAlt: ['Hit_B', 'Hit_A'],
  death: ['Death_A', 'Death', 'Death_B'],
  deathAlt: ['Death_B', 'Death_A'],
  spawn: ['Spawn_Ground', 'Spawn', 'Spawn_Air'],
  spawnAir: ['Spawn_Air', 'Spawn_Ground'],
  cheer: ['Interact', 'Use_Item', 'PickUp'],
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
  /** Direção da câmera (a distância é calculada para caber na tela). */
  pos: [0.05, 3.1, 8.2] as const,
  lookAt: [0, 1.15, 0] as const,
  /** Altura (unidades de mundo) que precisa caber na faixa livre: chefe ×1,6 + folga. */
  fitHeight: 2.8,
  /** Largura que precisa caber: Maga/Cavaleiro à esquerda até o inimigo à direita. */
  fitWidth: 3.9,
  minDistance: 6.5,
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

/**
 * Aparência de cada tipo de monstro: modelo, armas, tint próprio (multiplicado pelo tint da zona)
 * e emissivo. Cavaleiro Caído e Bruxa Sombria reutilizam os modelos dos heróis com cores sombrias.
 */
export const MONSTER_LOOK: Record<
  string,
  { model: ModelKey; weapons: [WeaponKey, 'right' | 'left'][]; tint: string; emissive?: string; scale?: number }
> = {
  minion: { model: 'skeletonMinion', weapons: [['skeletonBlade', 'right']], tint: '#ffffff' },
  rogue: { model: 'skeletonRogue', weapons: [['skeletonBlade', 'left']], tint: '#ffffff' },
  skmage: { model: 'skeletonMage', weapons: [['skeletonStaff', 'right']], tint: '#ffffff' },
  fallen: {
    model: 'knight',
    weapons: [['knightSword', 'right'], ['skeletonShield', 'left']],
    tint: '#5a4a78',
    emissive: '#1a0830',
    scale: 1.05,
  },
  witch: { model: 'mage', weapons: [['mageStaff', 'right']], tint: '#6a8a6a', emissive: '#10300f' },
  general: { model: 'skeletonWarrior', weapons: [['skeletonAxe', 'right'], ['skeletonShield', 'left']], tint: '#ffffff' },
  // O Rei Esqueleto usa o sprite em pixel art (SPRITE_BOSS); o modelo 3D é só o fallback.
  king: { model: 'skeletonWarrior', weapons: [['skeletonAxe', 'right'], ['skeletonShield', 'left']], tint: '#ffd0d0' },
};

/** Criaturas procedurais (src/scene/CreatureActor.ts): sombra, altura de voo, giro e escala. */
export type CreatureKind = 'slime' | 'mushroom' | 'bat' | 'golem' | 'imp';
export const CREATURES: Record<CreatureKind, { shadow: number; hover: number; rotY: number; scale: number }> = {
  slime: { shadow: 0.7, hover: 0, rotY: -0.45, scale: 1.1 },
  mushroom: { shadow: 0.55, hover: 0, rotY: -0.45, scale: 1.15 },
  bat: { shadow: 0.4, hover: 1.05, rotY: -0.4, scale: 1.25 },
  golem: { shadow: 0.8, hover: 0, rotY: -0.5, scale: 1.05 },
  imp: { shadow: 0.4, hover: 0.25, rotY: -0.45, scale: 1.2 },
};
export const isCreature = (type: string): type is CreatureKind => type in CREATURES;

/**
 * Rei Esqueleto em pixel art (sprites enviados pelo dono), desenhado como billboard na cena 3D.
 * Medidas em pixels conferidas nos PNGs: pose parada 48×48 (pé a 2 px da borda de baixo);
 * soco Cross_Punch 6 frames 64×64 (pé a 8 px). A escala por pixel é a mesma nos dois.
 */
export const SPRITE_BOSS = {
  dir: 'models/sprites/skeleton_king/',
  /** Mesma direção da animação de soco (de frente). */
  idle: { file: 'south.png', framePx: 48, footPx: 2 },
  /** Fase 2 (vida < 40%): versão dourada. */
  golden: { file: 'golden/south.png', framePx: 48, footPx: 2 },
  punch: { sheet: 'punch_sheet.png', frames: 6, fps: 12, framePx: 64, footPx: 8, impactFrame: 3 },
  /** Altura da pose parada em unidades de mundo. */
  height: 2.7,
  /** Intervalo entre socos (s): normal e furioso. */
  punchEvery: 2.6,
  punchEveryEnraged: 1.5,
  enrageAt: 0.4,
};

/** Visual das variações raras. */
export const AFFIX_LOOK = {
  golden: { tint: '#ffd54a', emissive: '#5a3a00' },
  armored: { tint: '#9fb4d8', emissive: '#0a1630' },
  giant: { tint: '#ffc0a0', emissive: '#2a0a00' },
} as const;
