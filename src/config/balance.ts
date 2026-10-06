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
    hpGrowth: 1.26,
    bossHpMult: 10,
    goldPerHp: 0.1,
    /**
     * Ouro cresce MAIS DEVAGAR que o HP: ouro(n) = HP(n) × goldPerHp × goldStageDecay^(n−1).
     * É isso que cria a "parede" que torna o Renascer necessário (sem isso a guilda passava sozinha).
     */
    goldStageDecay: 0.95,
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
    /** Fase mínima para renascer (~7 min de jogo). A parede (chefe da fase 40) vem por volta de 12–15 min. */
    minStage: 30,
    offset: 20,
    divisor: 2.5,
    exponent: 1.4,
    /** Bônus de dano global por cristal NÃO gasto. */
    damagePerCrystal: 0.1,
    /**
     * Fim de jogo: a partir de lateStart os cristais crescem ×lateGrowth por fase.
     * Sem isso o jogo "empacava" (a vida dos monstros cresce exponencialmente e os cristais não).
     */
    lateStart: 65,
    lateGrowth: 1.05,
  },

  /** Loja de Cristais: passos pequenos e custo crescente (antes +25% por 1 cristal quebrava o jogo). */
  crystalShop: [
    { id: 'damage', baseCost: 2, costGrowth: 1.5, maxLevel: 0, perLevel: 0.15 },
    { id: 'gold', baseCost: 2, costGrowth: 1.5, maxLevel: 0, perLevel: 0.1 },
    { id: 'crit', baseCost: 4, costGrowth: 1.6, maxLevel: 15, perLevel: 0.01 },
    { id: 'bossTime', baseCost: 4, costGrowth: 1.7, maxLevel: 10, perLevel: 2 },
    { id: 'offline', baseCost: 5, costGrowth: 1.7, maxLevel: 16, perLevel: 1 },
    { id: 'cooldown', baseCost: 6, costGrowth: 1.8, maxLevel: 10, perLevel: 0.05 },
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
      { crystals: 2 },
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
      // Criaturas procedurais (low-poly feitas por código), com animações próprias.
      { id: 'slime', minStage: 2, weight: 3, hp: 0.75, gold: 0.8 },
      { id: 'mushroom', minStage: 8, weight: 2.5, hp: 0.95, gold: 1 },
      { id: 'bat', minStage: 16, weight: 2.5, hp: 0.7, gold: 0.85 },
      { id: 'golem', minStage: 36, weight: 1.5, hp: 1.6, gold: 1.6 },
      { id: 'imp', minStage: 46, weight: 1.8, hp: 1, gold: 1.15 },
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

  /**
   * Relíquias: caem dos chefes (General 25%, Rei 100%), sobem de nível com repetidas e
   * dão bônus permanentes (sobrevivem ao Renascer). Coleção de longo prazo.
   */
  relics: {
    dropChance: { general: 0.15, king: 1 },
    maxLevel: 25,
    /** Relíquia repetida com nível máximo vira cristais. */
    maxedCrystals: 2,
    list: [
      { id: 'sword', stat: 'tap', perLevel: 0.1 },
      { id: 'banner', stat: 'dps', perLevel: 0.1 },
      { id: 'purse', stat: 'gold', perLevel: 0.08 },
      { id: 'eye', stat: 'crit', perLevel: 0.005 },
      { id: 'lens', stat: 'weak', perLevel: 0.1 },
      { id: 'hourglass', stat: 'bossTime', perLevel: 1 },
      { id: 'clover', stat: 'golden', perLevel: 0.1 },
      { id: 'lantern', stat: 'offline', perLevel: 0.5 },
      { id: 'horn', stat: 'cooldown', perLevel: 0.03 },
      { id: 'crown', stat: 'crystals', perLevel: 0.05 },
      { id: 'chalice', stat: 'chest', perLevel: 0.15 },
      { id: 'grimoire', stat: 'mage', perLevel: 0.1 },
    ],
  },

  /** Visuais do Cavaleiro: desbloqueados por marcos; cada um dá +1% de dano (coleção). */
  skins: {
    damagePerSkin: 0.01,
    list: [
      { id: 'classic', tint: '#ffffff', emissive: '#000000', unlock: null },
      { id: 'royal', tint: '#ffe0a0', emissive: '#2a1a00', unlock: { kind: 'stage', n: 50 } },
      { id: 'crimson', tint: '#ff9f90', emissive: '#2a0000', unlock: { kind: 'boss', n: 30 } },
      { id: 'shadow', tint: '#8a7ab0', emissive: '#12062a', unlock: { kind: 'prestige', n: 3 } },
      { id: 'frost', tint: '#c4e8ff', emissive: '#062236', unlock: { kind: 'bestiary', n: 10 } },
      { id: 'golden', tint: '#ffe680', emissive: '#4a3000', unlock: { kind: 'golden', n: 25 } },
      { id: 'arcane', tint: '#d0b0ff', emissive: '#2a0a5a', unlock: { kind: 'relics', n: 8 } },
      { id: 'savior', tint: '#ffffff', emissive: '#3a3a10', unlock: { kind: 'stage', n: 150 } },
    ],
  },

  /**
   * Árvore de Talentos (permanente, sobrevive ao Renascer).
   * Abre no 1º Renascer. Pontos = 1 por Renascer + 1 a cada 25 fases da maior fase já alcançada.
   * Nó k de um ramo exige `unlockPerTier × k` pontos gastos naquele ramo. Redistribuir é grátis.
   */
  talents: {
    pointsPerPrestige: 1,
    stagesPerPoint: 25,
    unlockPerTier: 3,
    branches: ['blade', 'guild', 'fortune'],
    list: [
      { id: 'sharpBlade', branch: 'blade', stat: 'tap', perLevel: 0.15, max: 10, cost: 1 },
      { id: 'quickHands', branch: 'blade', stat: 'crit', perLevel: 0.01, max: 5, cost: 1 },
      { id: 'hunterEye', branch: 'blade', stat: 'weak', perLevel: 0.2, max: 5, cost: 1 },
      { id: 'furyCombo', branch: 'blade', stat: 'comboDmg', perLevel: 0.1, max: 5, cost: 1 },
      { id: 'finalBlow', branch: 'blade', stat: 'critMult', perLevel: 0.5, max: 1, cost: 5 },
      { id: 'commander', branch: 'guild', stat: 'dps', perLevel: 0.15, max: 10, cost: 1 },
      { id: 'apprentice', branch: 'guild', stat: 'mage', perLevel: 0.2, max: 5, cost: 1 },
      { id: 'camp', branch: 'guild', stat: 'offlineRate', perLevel: 0.1, max: 5, cost: 1 },
      { id: 'contracts', branch: 'guild', stat: 'guildCost', perLevel: 0.03, max: 5, cost: 1 },
      { id: 'warCry', branch: 'guild', stat: 'cooldown', perLevel: 0.15, max: 1, cost: 5 },
      { id: 'heavyPurse', branch: 'fortune', stat: 'gold', perLevel: 0.1, max: 10, cost: 1 },
      { id: 'goldenNose', branch: 'fortune', stat: 'golden', perLevel: 0.15, max: 5, cost: 1 },
      { id: 'courierVault', branch: 'fortune', stat: 'chest', perLevel: 0.2, max: 5, cost: 1 },
      { id: 'crystalline', branch: 'fortune', stat: 'crystals', perLevel: 0.04, max: 5, cost: 1 },
      { id: 'midas', branch: 'fortune', stat: 'relicDrop', perLevel: 0.1, max: 1, cost: 5 },
    ],
    /** Combo Furioso: +0,2% de dano de toque por toque do combo, até o teto do talento. */
    comboDmgPerTap: 0.002,
  },

  /**
   * Conjuntos de relíquias: com as 3 relíquias do conjunto (nível ≥ 1) liga o 1º bônus;
   * com as 3 no nível `tier2Level`, liga também o 2º.
   */
  relicSets: {
    tier2Level: 10,
    list: [
      { id: 'hunter', relics: ['sword', 'eye', 'lens'], tiers: [{ stat: 'weakFreq', value: 0.25 }, { stat: 'weak', value: 0.5 }] },
      { id: 'warlord', relics: ['banner', 'horn', 'grimoire'], tiers: [{ stat: 'dps', value: 0.25 }, { stat: 'cooldown', value: 0.1 }] },
      { id: 'treasurer', relics: ['purse', 'chalice', 'clover'], tiers: [{ stat: 'gold', value: 0.25 }, { stat: 'goldenTime', value: 0.5 }] },
      { id: 'royal', relics: ['crown', 'hourglass', 'lantern'], tiers: [{ stat: 'bossTime', value: 2 }, { stat: 'crystals', value: 0.1 }] },
    ],
  },

  /** Combo: toques seguidos (até 0,6 s entre eles) somam; marcos dão um pouco de ouro. */
  combo: { windowSec: 0.6, milestones: [50, 100, 200, 400, 800], rewardKills: 3 },

  saveIntervalSec: 10,
} as const;

export type MemberId = (typeof BALANCE.guild.members)[number]['id'];
export type CrystalUpgradeId = (typeof BALANCE.crystalShop)[number]['id'];
export type AbilityId = keyof typeof BALANCE.abilities;
/** 'general' = chefe comum (fases 10, 20, 30, 40); 'king' = Rei Esqueleto (a cada 50 fases). */
export type MonsterId = (typeof BALANCE.monsters.types)[number]['id'] | 'general' | 'king';
export type AffixId = keyof typeof BALANCE.monsters.affixes;
export const MONSTER_IDS: MonsterId[] = [
  'minion', 'slime', 'rogue', 'skmage', 'mushroom', 'bat', 'fallen', 'witch', 'golem', 'imp', 'general', 'king',
];
export type RelicId = (typeof BALANCE.relics.list)[number]['id'];
export type RelicStat = (typeof BALANCE.relics.list)[number]['stat'];
export type TalentId = (typeof BALANCE.talents.list)[number]['id'];
export type TalentBranch = (typeof BALANCE.talents.branches)[number];
export type RelicSetId = (typeof BALANCE.relicSets.list)[number]['id'];
/** Tudo que relíquias, talentos e conjuntos podem aumentar. */
export type BonusStat =
  | RelicStat
  | (typeof BALANCE.talents.list)[number]['stat']
  | (typeof BALANCE.relicSets.list)[number]['tiers'][number]['stat'];
export type SkinId = (typeof BALANCE.skins.list)[number]['id'];
export const ABILITY_IDS: AbilityId[] = ['strike', 'fury', 'goldRain'];
