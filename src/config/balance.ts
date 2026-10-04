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
    hpBase: 10,
    hpGrowth: 1.19,
    bossHpMult: 10,
    goldPerHp: 0.017,
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
      { id: 'squire', baseCost: 50, baseDps: 5 },
      { id: 'archer', baseCost: 500, baseDps: 30 },
      { id: 'cleric', baseCost: 5e3, baseDps: 180 },
      { id: 'rogue', baseCost: 6e4, baseDps: 1.1e3 },
      { id: 'barbarian', baseCost: 8e5, baseDps: 7e3 },
      { id: 'druid', baseCost: 1.2e7, baseDps: 4.5e4 },
      { id: 'paladin', baseCost: 2e8, baseDps: 3e5 },
      { id: 'dragoon', baseCost: 4e9, baseDps: 2.2e6 },
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
    divisor: 2.5,
    exponent: 1.3,
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

  saveIntervalSec: 10,
} as const;

export type MemberId = (typeof BALANCE.guild.members)[number]['id'];
export type CrystalUpgradeId = (typeof BALANCE.crystalShop)[number]['id'];
export type AbilityId = keyof typeof BALANCE.abilities;
export const ABILITY_IDS: AbilityId[] = ['strike', 'fury', 'goldRain'];
