import { BALANCE } from '../config/balance';
import { totalBestiaryStars } from './formulas';
import type { GameState, MissionState } from './state';

/** Chave do dia no fuso local (AAAA-MM-DD). */
export function dayKey(now: number): string {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---------------- Recompensa diária ----------------

export const canClaimDaily = (s: GameState, now: number): boolean =>
  s.daily.lastClaimDay !== dayKey(now);

export const dailyReward = (index: number) =>
  BALANCE.daily.rewards[index % BALANCE.daily.rewards.length];

/** Avança o calendário. Um dia perdido não zera o progresso. */
export function markDailyClaimed(s: GameState, now: number): void {
  s.daily.lastClaimDay = dayKey(now);
  s.daily.index = (s.daily.index + 1) % BALANCE.daily.rewards.length;
}

// ---------------- Missões diárias ----------------

export type TrackKind =
  | 'taps'
  | 'kills'
  | 'bossKills'
  | 'guildLevels'
  | 'bladeLevels'
  | 'abilities'
  | 'chests'
  | 'stages'
  | 'crits'
  | 'weakHits'
  | 'golden';

export interface MissionDef {
  id: string;
  kind: TrackKind;
  target: number;
  /** Recompensa em segundos de renda. */
  rewardIncomeSec: number;
  rewardCrystals?: number;
}

export const MISSION_POOL: MissionDef[] = [
  { id: 'taps500', kind: 'taps', target: 500, rewardIncomeSec: 300 },
  { id: 'taps1500', kind: 'taps', target: 1500, rewardIncomeSec: 600 },
  { id: 'kills100', kind: 'kills', target: 100, rewardIncomeSec: 300 },
  { id: 'kills300', kind: 'kills', target: 300, rewardIncomeSec: 600 },
  { id: 'boss2', kind: 'bossKills', target: 2, rewardIncomeSec: 450 },
  { id: 'boss5', kind: 'bossKills', target: 5, rewardIncomeSec: 600, rewardCrystals: 1 },
  { id: 'guild10', kind: 'guildLevels', target: 10, rewardIncomeSec: 300 },
  { id: 'guild40', kind: 'guildLevels', target: 40, rewardIncomeSec: 600 },
  { id: 'blade15', kind: 'bladeLevels', target: 15, rewardIncomeSec: 300 },
  { id: 'abil3', kind: 'abilities', target: 3, rewardIncomeSec: 450 },
  { id: 'chest2', kind: 'chests', target: 2, rewardIncomeSec: 450 },
  { id: 'stages10', kind: 'stages', target: 10, rewardIncomeSec: 600 },
  { id: 'crits50', kind: 'crits', target: 50, rewardIncomeSec: 300 },
  { id: 'weak15', kind: 'weakHits', target: 15, rewardIncomeSec: 450 },
  { id: 'weak40', kind: 'weakHits', target: 40, rewardIncomeSec: 600, rewardCrystals: 1 },
  { id: 'golden1', kind: 'golden', target: 1, rewardIncomeSec: 450 },
];

export const missionDef = (id: string): MissionDef | undefined =>
  MISSION_POOL.find((m) => m.id === id);

/** PRNG determinístico (mulberry32). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashString = (str: string): number => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Sorteia 3 missões (de tipos diferentes) para o dia, se ainda não houver. */
export function ensureMissions(s: GameState, now: number): boolean {
  const day = dayKey(now);
  if (s.missions.day === day && s.missions.list.length) return false;
  const rng = seededRng(hashString(day + ':' + s.firstPlayedAt));
  const pool = [...MISSION_POOL];
  const picked: MissionState[] = [];
  const kinds = new Set<string>();
  while (picked.length < 3 && pool.length) {
    const def = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    if (kinds.has(def.kind)) continue;
    kinds.add(def.kind);
    picked.push({ id: def.id, target: def.target, progress: 0, claimed: false });
  }
  s.missions = { day, list: picked };
  return true;
}

export function trackMissions(s: GameState, kind: TrackKind, amount: number): void {
  for (const m of s.missions.list) {
    const def = missionDef(m.id);
    if (def?.kind === kind && !m.claimed) m.progress = Math.min(m.target, m.progress + amount);
  }
}

// ---------------- Conquistas ----------------

export interface AchievementDef {
  id: string;
  /** Lê o valor atual do estado. */
  stat: (s: GameState) => number;
  target: number;
  /** Cristais de recompensa; 0 = recompensa em ouro (as conquistas do começo não dão cristais). */
  crystals: number;
  /** Chave i18n do tipo da conquista (recebe {n}). */
  kind: 'stage' | 'taps' | 'kills' | 'boss' | 'prestige' | 'crits' | 'chests' | 'blade' | 'guild' | 'abilities' | 'weak' | 'golden' | 'bestiary';
}

const ach = (
  kind: AchievementDef['kind'],
  stat: AchievementDef['stat'],
  targets: [number, number][],
): AchievementDef[] =>
  targets.map(([target, crystals]) => ({ id: `${kind}_${target}`, kind, stat, target, crystals }));

export const ACHIEVEMENTS: AchievementDef[] = [
  ...ach('stage', (s) => s.stats.highestStage, [[10, 0], [25, 0], [50, 1], [100, 2], [150, 3], [200, 4], [300, 6]]),
  ...ach('taps', (s) => s.stats.taps, [[100, 0], [1000, 0], [10000, 1], [100000, 2]]),
  ...ach('kills', (s) => s.stats.kills, [[100, 0], [1000, 0], [10000, 1], [100000, 2]]),
  ...ach('boss', (s) => s.stats.bossKills, [[1, 0], [10, 0], [50, 1], [100, 2]]),
  ...ach('prestige', (s) => s.stats.prestiges, [[1, 1], [5, 2], [10, 3], [25, 5]]),
  ...ach('crits', (s) => s.stats.crits, [[100, 0], [1000, 1]]),
  ...ach('chests', (s) => s.stats.chests, [[1, 0], [25, 1]]),
  ...ach('blade', (s) => s.bladeLevel, [[100, 1]]),
  ...ach('guild', (s) => s.guild.filter((l) => l > 0).length, [[8, 2]]),
  ...ach('abilities', (s) => s.stats.abilitiesUsed, [[25, 1]]),
  ...ach('weak', (s) => s.stats.weakHits, [[10, 0], [100, 1], [1000, 2]]),
  ...ach('golden', (s) => s.stats.goldenKills, [[1, 0], [10, 1], [50, 2]]),
  ...ach('bestiary', (s) => totalBestiaryStars(s), [[5, 1], [15, 2]]),
];

/** Marca conquistas recém-atingidas como 'done'. Retorna os ids novos. */
export function checkAchievements(s: GameState): string[] {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.stat(s) >= a.target) {
      s.achievements[a.id] = 'done';
      fresh.push(a.id);
    }
  }
  return fresh;
}
