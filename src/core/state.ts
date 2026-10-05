import { BALANCE, type AbilityId, type CrystalUpgradeId, type MonsterId, type RelicId, type SkinId } from '../config/balance';
import { Decimal, ZERO } from './bignum';

export type Lang = 'pt-BR' | 'en' | 'es';
export type Notation = 'short' | 'scientific';

export interface Settings {
  lang: Lang;
  /** false até o jogador escolher o idioma na primeira abertura. */
  langChosen: boolean;
  sound: boolean;
  music: boolean;
  sfxVolume: number;
  musicVolume: number;
  vibration: boolean;
  /** Aviso do baú cheio. Só fica ligado se o jogador pediu E o Android deu a permissão. */
  notifications: boolean;
  /** Já explicamos/pedimos a permissão de notificação (não pedir de novo sozinho). */
  notifAsked: boolean;
  notation: Notation;
}

export interface Stats {
  taps: number;
  crits: number;
  kills: number;
  bossKills: number;
  prestiges: number;
  totalGold: Decimal;
  playTimeSec: number;
  chests: number;
  abilitiesUsed: number;
  guildLevelsBought: number;
  adsWatched: number;
  highestStage: number;
  /** Pontos Fracos acertados. */
  weakHits: number;
  /** Esqueletos Dourados derrotados. */
  goldenKills: number;
  /** Maior combo de toques. */
  maxCombo: number;
  /** Relíquias obtidas (contando repetidas). */
  relicDrops: number;
}

export interface MissionState {
  id: string;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface GameState {
  schemaVersion: number;
  gold: Decimal;
  crystals: Decimal;
  stage: number;
  maxStage: number;
  /** Inimigos derrotados na fase atual (0..9). */
  killsInStage: number;
  /** Jogador falhou no chefe e está farmando a fase anterior. */
  farming: boolean;
  bladeLevel: number;
  arcaneLevel: number;
  guild: number[];
  crystalUpgrades: Record<CrystalUpgradeId, number>;
  /** Timestamps (ms) em que cada habilidade fica pronta / termina o efeito. */
  abilityReadyAt: Record<AbilityId, number>;
  abilityActiveUntil: Record<AbilityId, number>;
  /** Buff de ouro ×2 por anúncio (timestamp em ms). */
  adGoldBuffUntil: number;
  stats: Stats;
  /** Estatísticas da run atual (zeram no Renascer). */
  runStartedAt: number;
  daily: { lastClaimDay: string; index: number };
  /** Jornada do Rei: índice da missão principal atual. */
  story: { index: number };
  /** Dicas do tutorial já mostradas. */
  tutorial: { tapHintDone: boolean; weakHintDone?: boolean };
  /** Bestiário: abates por tipo de monstro (permanente, sobrevive ao Renascer). */
  bestiary: Partial<Record<MonsterId, number>>;
  /** Relíquias: nível de cada uma (permanente). */
  relics: Partial<Record<RelicId, number>>;
  /** Visual do Cavaleiro em uso. */
  skin: SkinId;
  missions: { day: string; list: MissionState[] };
  achievements: Record<string, 'done' | 'claimed'>;
  settings: Settings;
  lastSeen: number;
  firstPlayedAt: number;
  lastInterstitialAt: number;
  noAds: boolean;
}

export const SCHEMA_VERSION = 6;

export function createInitialState(now = Date.now(), lang: Lang = 'en'): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    gold: ZERO,
    crystals: ZERO,
    stage: 1,
    maxStage: 1,
    killsInStage: 0,
    farming: false,
    bladeLevel: 0,
    arcaneLevel: 0,
    guild: BALANCE.guild.members.map(() => 0),
    crystalUpgrades: Object.fromEntries(BALANCE.crystalShop.map((u) => [u.id, 0])) as Record<
      CrystalUpgradeId,
      number
    >,
    abilityReadyAt: { strike: 0, fury: 0, goldRain: 0 },
    abilityActiveUntil: { strike: 0, fury: 0, goldRain: 0 },
    adGoldBuffUntil: 0,
    stats: {
      taps: 0,
      crits: 0,
      kills: 0,
      bossKills: 0,
      prestiges: 0,
      totalGold: ZERO,
      playTimeSec: 0,
      chests: 0,
      abilitiesUsed: 0,
      guildLevelsBought: 0,
      adsWatched: 0,
      highestStage: 1,
      weakHits: 0,
      goldenKills: 0,
      maxCombo: 0,
      relicDrops: 0,
    },
    runStartedAt: now,
    daily: { lastClaimDay: '', index: 0 },
    story: { index: 0 },
    tutorial: { tapHintDone: false },
    bestiary: {},
    relics: {},
    skin: 'classic',
    missions: { day: '', list: [] },
    achievements: {},
    settings: {
      lang,
      langChosen: false,
      sound: true,
      music: false,
      sfxVolume: 0.8,
      musicVolume: 0.4,
      vibration: true,
      notifications: false,
      notifAsked: false,
      notation: 'short',
    },
    lastSeen: now,
    firstPlayedAt: now,
    lastInterstitialAt: 0,
    noAds: false,
  };
}

export const isBossStage = (stage: number): boolean => stage % BALANCE.stage.bossEvery === 0;
export const zoneIndex = (stage: number): number => Math.floor((stage - 1) / 50) % 5;
