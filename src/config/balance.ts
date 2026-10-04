/**
 * Todas as constantes de balanceamento do jogo.
 * Ajustadas com `npm run sim` (scripts/balance-sim.ts). Veja DECISIONS.md.
 */

export const BALANCE = {
  stage: {
    enemiesPerStage: 10,
    bossEvery: 10,
    bossTimeSec: 30,
  },

  enemy: {
    hpBase: 55,
    hpGrowth: 1.19,
    bossHpMult: 10,
    goldPerHp: 0.0045,
    /** Ouro cresce um pouco mais devagar que o HP: ouro(n) = HP(n) × goldPerHp × goldStageDecay^(n−1). */
    goldStageDecay: 1,
    bossGoldMult: 6,
  },

  blade: {
    baseCost: 10,
    costGrowth: 1.07,
    damagePerLevel: 1,
    milestones: [25, 50, 100, 200, 400],
    milestoneMult: 2,
  },

  crit: {
    chance: 0.05,
    mult: 5,
  },

  arcane: {
    maxLevel: 10,
    dpsSharePerLevel: 0.01,
    baseCost: 2.5e4,
    costGrowth: 12,
    unlockStage: 20,
  },

  guild: {
    costGrowth: 1.075,
    members: [
      { id: 'squire', baseCost: 50, baseDps: 11 },
      { id: 'archer', baseCost: 500, baseDps: 66 },
      { id: 'cleric', baseCost: 5e3, baseDps: 400 },
      { id: 'rogue', baseCost: 6e4, baseDps: 2.4e3 },
      { id: 'barbarian', baseCost: 8e5, baseDps: 1.55e4 },
      { id: 'druid', baseCost: 1.2e7, baseDps: 1e5 },
      { id: 'paladin', baseCost: 2e8, baseDps: 6.6e5 },
      { id: 'dragoon', baseCost: 4e9, baseDps: 4.85e6 },
    ],
    milestones: [
      { level: 10, mult: 2 },
      { level: 25, mult: 2 },
      { level: 50, mult: 2 },
      { level: 100, mult: 2 },
      { level: 200, mult: 4 },
    ],
  },

  mage: {
    unlockStage: 5,
    intervalSec: 1.5,
    /** Fração do DPS total que o Mago causa (em pacotes a cada intervalSec). */
    dpsShare: 0.2,
  },

  abilities: {
    strike: { unlockStage: 15, cooldownSec: 300, dpsSeconds: 30 },
    fury: { unlockStage: 30, cooldownSec: 480, durationSec: 30, tapMult: 3 },
    goldRain: { unlockStage: 60, cooldownSec: 600, durationSec: 30, goldMult: 2 },
  },

  prestige: {
    minStage: 40,
    offset: 30,
    divisor: 3.5,
    exponent: 1.55,
    /** Bônus de dano global por cristal NÃO gasto. */
    damagePerCrystal: 0.05,
  },

  crystalShop: [
    { id: 'damage', baseCost: 1, costGrowth: 1.3, maxLevel: 0, perLevel: 0.25 },
    { id: 'gold', baseCost: 1, costGrowth: 1.3, maxLevel: 0, perLevel: 0.2 },
    { id: 'crit', baseCost: 3, costGrowth: 1.5, maxLevel: 20, perLevel: 0.01 },
    { id: 'bossTime', baseCost: 3, costGrowth: 1.6, maxLevel: 15, perLevel: 2 },
    { id: 'offline', baseCost: 4, costGrowth: 1.6, maxLevel: 16, perLevel: 1 },
    { id: 'cooldown', baseCost: 5, costGrowth: 1.7, maxLevel: 10, perLevel: 0.05 },
  ],

  offline: {
    /** Fração da renda (ouro/s com o DPS atual) concedida offline. */
    rate: 0.5,
    baseCapHours: 8,
    /** Abaixo disso não mostra o modal "Bem-vindo de volta". */
    minSecondsForModal: 60,
  },

  ads: {
    goldBuffMinutesPerAd: 5,
    goldBuffMaxMinutes: 30,
    goldBuffMult: 2,
    bossExtraSec: 15,
    interstitialMinIntervalSec: 180,
    interstitialFirstSessionGraceSec: 600,
    interstitialAfterRewardedGraceSec: 60,
  },

  chest: {
    minIntervalSec: 180,
    maxIntervalSec: 300,
    visibleSec: 8,
    firstSessionGraceSec: 180,
    /** Bônus = max(segundos de renda, kills do inimigo atual). */
    incomeSeconds: 60,
    enemyKills: 8,
    adMult: 5,
  },

  daily: {
    /** Prêmios em "segundos de renda" (mínimo garantido em kills da fase atual); o dia 7 dá cristais. */
    rewards: [
      { incomeSec: 120 },
      { incomeSec: 180 },
      { incomeSec: 300 },
      { incomeSec: 420 },
      { incomeSec: 600 },
      { incomeSec: 900 },
      { crystals: 5 },
    ],
  },

  /** Bestiário de monstros: tipos, variações raras e Pontos Fracos. */
  monsters: {
    /** Tipos comuns. hp/gold multiplicam os valores da fase (média ≈ 1 para não quebrar o ritmo). */
    types: [
      { id: 'minion', minStage: 1, weight: 5, hp: 1, gold: 1 },
      { id: 'rogue', minStage: 3, weight: 3, hp: 0.85, gold: 0.95 },
      { id: 'skmage', minStage: 6, weight: 2.5, hp: 0.9, gold: 1.05 },
      { id: 'fallen', minStage: 21, weight: 2, hp: 1.3, gold: 1.35 },
      { id: 'witch', minStage: 31, weight: 1.6, hp: 1.15, gold: 1.25 },
    ],
    /** Variações raras (nunca no chefe). */
    affixes: {
      /** Esqueleto Dourado: pouca vida, muito ouro, foge se não for derrotado a tempo. */
      golden: { minStage: 3, chance: 0.035, hp: 0.6, gold: 10, escapeSec: 7 },
      /** Blindado: parte da vida é armadura; toques causam metade do dano nela. */
      armored: { minStage: 8, chance: 0.08, armorFrac: 0.4, tapVsArmor: 0.5, gold: 1.6 },
      /** Gigante: maior, mais vida e mais ouro. */
      giant: { minStage: 12, chance: 0.06, hp: 2, gold: 2.6, scale: 1.3 },
    },
    /** Ponto Fraco: alvo brilhante que aparece no inimigo; tocá-lo causa um golpe enorme. */
    weakSpot: { minStage: 2, intervalMin: 3.5, intervalMax: 6.5, durationSec: 1.7, tapMult: 8 },
    /** Bestiário: estrelas por número de abates de cada tipo; cada estrela dá +ouro permanente. */
    bestiary: { tiers: [10, 100, 1000, 10000], goldPerStar: 0.02 },
  },

  saveIntervalSec: 10,
} as const;

export type MemberId = (typeof BALANCE.guild.members)[number]['id'];
export type CrystalUpgradeId = (typeof BALANCE.crystalShop)[number]['id'];
export type AbilityId = keyof typeof BALANCE.abilities;
/** 'general' = chefe comum (fases 10, 20, 30, 40); 'king' = Rei Esqueleto (a cada 50 fases). */
export type MonsterId = (typeof BALANCE.monsters.types)[number]['id'] | 'general' | 'king';
export type AffixId = keyof typeof BALANCE.monsters.affixes;
export const MONSTER_IDS: MonsterId[] = ['minion', 'rogue', 'skmage', 'fallen', 'witch', 'general', 'king'];
export const ABILITY_IDS: AbilityId[] = ['strike', 'fury', 'goldRain'];
