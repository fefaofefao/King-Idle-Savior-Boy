import { BALANCE } from '../config/balance';
import type { GameState } from './state';

/**
 * "Jornada do Rei": cadeia de missões principais, em 5 capítulos (um por zona), que guia o jogador.
 * O progresso é lido do estado (não acumulado), então é robusto a saves antigos e ao Renascer.
 * Ao fim da cadeia, missões infinitas de "alcance a fase X" continuam dando cristais.
 */
export type StoryKind =
  | 'taps'
  | 'kills'
  | 'stage'
  | 'blade'
  | 'hire'
  | 'member'
  | 'boss'
  | 'ability'
  | 'chest'
  | 'arcane'
  | 'prestige'
  | 'crystalShop'
  | 'crits';

export interface StoryQuest {
  kind: StoryKind;
  target: number;
  /** Índice do membro da guilda (para 'hire' e 'member'). */
  member?: number;
  /** Recompensa em segundos de renda (com piso em kills da fase). */
  incomeSec?: number;
  crystals?: number;
  /** Ouro fixo mínimo (garante a próxima compra no tutorial). */
  gold?: number;
  /** Capítulo (1..5) — muda o título exibido. */
  chapter: number;
}

const q = (chapter: number, kind: StoryKind, target: number, reward: Partial<StoryQuest> = {}): StoryQuest => ({
  chapter,
  kind,
  target,
  incomeSec: 30,
  ...reward,
});

export const STORY: StoryQuest[] = [
  // Capítulo 1 — A Floresta Sombria (tutorial)
  q(1, 'taps', 10, { incomeSec: 10, gold: 2 }),
  q(1, 'kills', 5, { incomeSec: 10, gold: 3 }),
  q(1, 'blade', 1, { incomeSec: 15, gold: 5 }),
  q(1, 'hire', 1, { member: 0, incomeSec: 20, gold: 10 }),
  q(1, 'stage', 5, { incomeSec: 60 }),
  q(1, 'member', 10, { member: 0, incomeSec: 60 }),
  q(1, 'boss', 1, { incomeSec: 60, gold: 50 }),
  q(1, 'hire', 1, { member: 1, incomeSec: 90 }),
  q(1, 'blade', 25, { incomeSec: 120, crystals: 1 }),
  // Capítulo 2 — As Cavernas de Cristal
  q(2, 'stage', 15, { incomeSec: 120 }),
  q(2, 'ability', 1, { incomeSec: 120 }),
  q(2, 'hire', 1, { member: 2, incomeSec: 120 }),
  q(2, 'stage', 20, { incomeSec: 150 }),
  q(2, 'chest', 1, { incomeSec: 150 }),
  q(2, 'stage', 25, { incomeSec: 150 }),
  q(2, 'boss', 3, { incomeSec: 180, crystals: 1 }),
  // Capítulo 3 — O Deserto do Renascer
  q(3, 'stage', 30, { incomeSec: 180 }),
  q(3, 'crits', 100, { incomeSec: 180 }),
  q(3, 'stage', 40, { incomeSec: 240 }),
  q(3, 'prestige', 1, { incomeSec: 60, crystals: 3 }),
  q(3, 'crystalShop', 2, { incomeSec: 120 }),
  q(3, 'stage', 45, { incomeSec: 240, crystals: 2 }),
  q(3, 'hire', 1, { member: 3, incomeSec: 240 }),
  // Capítulo 4 — Os Picos Gelados
  q(4, 'stage', 50, { incomeSec: 240 }),
  q(4, 'blade', 100, { incomeSec: 240 }),
  q(4, 'stage', 60, { incomeSec: 300 }),
  q(4, 'arcane', 1, { incomeSec: 300 }),
  q(4, 'prestige', 3, { incomeSec: 120, crystals: 3 }),
  q(4, 'hire', 1, { member: 4, incomeSec: 300 }),
  q(4, 'stage', 75, { incomeSec: 300, crystals: 3 }),
  // Capítulo 5 — O Vulcão do Rei Esqueleto
  q(5, 'crystalShop', 10, { incomeSec: 300 }),
  q(5, 'hire', 1, { member: 5, incomeSec: 300 }),
  q(5, 'stage', 90, { incomeSec: 300 }),
  q(5, 'boss', 25, { incomeSec: 300, crystals: 3 }),
  q(5, 'stage', 100, { incomeSec: 360, crystals: 5 }),
  q(5, 'prestige', 5, { incomeSec: 300, crystals: 5 }),
];

export const CHAPTERS = 5;

/** Missão atual (cadeia ou, depois dela, infinita). */
export function currentStoryQuest(s: GameState): StoryQuest {
  const i = s.story.index;
  if (i < STORY.length) return STORY[i];
  // Infinitas: a cada 25 fases além da maior fase já alcançada na época.
  const step = i - STORY.length + 1;
  const target = 100 + step * 25;
  return { chapter: CHAPTERS + 1, kind: 'stage', target, incomeSec: 300, crystals: 3 + Math.floor(step / 2) };
}

export function storyProgress(s: GameState, quest: StoryQuest = currentStoryQuest(s)): number {
  switch (quest.kind) {
    case 'taps':
      return s.stats.taps;
    case 'kills':
      return s.stats.kills;
    case 'stage':
      return s.stats.highestStage;
    case 'blade':
      return s.bladeLevel;
    case 'hire':
      return s.guild[quest.member ?? 0] > 0 ? 1 : 0;
    case 'member':
      return s.guild[quest.member ?? 0];
    case 'boss':
      return s.stats.bossKills;
    case 'ability':
      return s.stats.abilitiesUsed;
    case 'chest':
      return s.stats.chests;
    case 'arcane':
      return s.arcaneLevel;
    case 'prestige':
      return s.stats.prestiges;
    case 'crystalShop':
      return Object.values(s.crystalUpgrades).reduce((a, b) => a + b, 0);
    case 'crits':
      return s.stats.crits;
  }
}

export const storyComplete = (s: GameState): boolean => {
  const quest = currentStoryQuest(s);
  return storyProgress(s, quest) >= quest.target;
};

/** Membro da guilda pedido pela missão, para o texto. */
export const storyMemberId = (quest: StoryQuest): string =>
  BALANCE.guild.members[quest.member ?? 0].id;
