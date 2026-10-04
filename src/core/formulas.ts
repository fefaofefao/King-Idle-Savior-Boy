import { BALANCE, type CrystalUpgradeId } from '../config/balance';
import { D, Decimal, bulkCost } from './bignum';
import { isBossStage, type GameState } from './state';

const E = BALANCE.enemy;

// ---------- Inimigos ----------
export const enemyHp = (stage: number): Decimal =>
  D(E.hpBase).times(Decimal.pow(E.hpGrowth, stage - 1));
export const bossHp = (stage: number): Decimal => enemyHp(stage).times(E.bossHpMult);
export const enemyGold = (stage: number): Decimal =>
  enemyHp(stage).times(E.goldPerHp).times(Decimal.pow(E.goldStageDecay, stage - 1));
export const bossGold = (stage: number): Decimal => enemyGold(stage).times(E.bossGoldMult);

export const stageEnemyHp = (stage: number): Decimal =>
  isBossStage(stage) ? bossHp(stage) : enemyHp(stage);
export const stageEnemyGold = (stage: number): Decimal =>
  isBossStage(stage) ? bossGold(stage) : enemyGold(stage);

// ---------- Lâmina (toque) ----------
export const bladeCost = (level: number, n = 1): Decimal =>
  bulkCost(BALANCE.blade.baseCost, BALANCE.blade.costGrowth, level, n);

export function bladeMilestoneMult(level: number): number {
  let m = 1;
  for (const ms of BALANCE.blade.milestones) if (level >= ms) m *= BALANCE.blade.milestoneMult;
  return m;
}

/** Dano de toque base (sem multiplicadores globais). */
export const bladeDamage = (level: number): Decimal =>
  D(1 + level * BALANCE.blade.damagePerLevel).times(bladeMilestoneMult(level));

// ---------- Toque Arcano ----------
export const arcaneCost = (level: number): Decimal =>
  D(BALANCE.arcane.baseCost).times(Decimal.pow(BALANCE.arcane.costGrowth, level));

// ---------- Guilda ----------
export const memberCost = (index: number, level: number, n = 1): Decimal =>
  bulkCost(BALANCE.guild.members[index].baseCost, BALANCE.guild.costGrowth, level, n);

export function memberMilestoneMult(level: number): number {
  let m = 1;
  for (const ms of BALANCE.guild.milestones) if (level >= ms.level) m *= ms.mult;
  return m;
}

/** DPS de um membro sem multiplicadores globais. */
export const memberDps = (index: number, level: number): Decimal =>
  level <= 0
    ? D(0)
    : D(BALANCE.guild.members[index].baseDps).times(level).times(memberMilestoneMult(level));

/** Um membro só pode ser contratado depois que o anterior tem pelo menos 1 nível. */
export const memberUnlocked = (s: GameState, index: number): boolean =>
  index === 0 || s.guild[index - 1] > 0;

// ---------- Cristais ----------
export const crystalLevel = (s: GameState, id: CrystalUpgradeId): number => s.crystalUpgrades[id] ?? 0;

export function crystalUpgradeCost(id: CrystalUpgradeId, level: number): Decimal {
  const u = BALANCE.crystalShop.find((x) => x.id === id)!;
  return D(Math.ceil(u.baseCost * Math.pow(u.costGrowth, level)));
}

export function crystalUpgradeMaxed(id: CrystalUpgradeId, level: number): boolean {
  const u = BALANCE.crystalShop.find((x) => x.id === id)!;
  return u.maxLevel > 0 && level >= u.maxLevel;
}

const perLevel = (id: CrystalUpgradeId): number =>
  BALANCE.crystalShop.find((x) => x.id === id)!.perLevel;

export function crystalsForPrestige(maxStage: number): Decimal {
  const P = BALANCE.prestige;
  if (maxStage < P.minStage) return D(0);
  return D(Math.floor(Math.pow((maxStage - P.offset) / P.divisor, P.exponent)));
}

// ---------- Multiplicadores ----------
export function globalDamageMult(s: GameState, crystals: Decimal = s.crystals): Decimal {
  const fromCrystals = crystals.times(BALANCE.prestige.damagePerCrystal).plus(1);
  const fromShop = 1 + crystalLevel(s, 'damage') * perLevel('damage');
  return fromCrystals.times(fromShop);
}

// ---------- Bestiário ----------
/** Estrelas (0..4) de um tipo de monstro pelo número de abates. */
export function bestiaryStars(kills: number): number {
  return BALANCE.monsters.bestiary.tiers.filter((t) => kills >= t).length;
}

export function totalBestiaryStars(s: GameState): number {
  return Object.values(s.bestiary).reduce((a, k) => a + bestiaryStars(k ?? 0), 0);
}

/** Bônus permanente de ouro do Bestiário (+2% por estrela). */
export const bestiaryGoldMult = (s: GameState): number =>
  1 + totalBestiaryStars(s) * BALANCE.monsters.bestiary.goldPerStar;

export function goldMult(s: GameState, now: number): number {
  let m = (1 + crystalLevel(s, 'gold') * perLevel('gold')) * bestiaryGoldMult(s);
  if (s.adGoldBuffUntil > now || s.noAds) m *= BALANCE.ads.goldBuffMult;
  if (s.abilityActiveUntil.goldRain > now) m *= BALANCE.abilities.goldRain.goldMult;
  return m;
}

export const critChance = (s: GameState): number =>
  Math.min(1, BALANCE.crit.chance + crystalLevel(s, 'crit') * perLevel('crit'));

export const bossTimeSec = (s: GameState): number =>
  BALANCE.stage.bossTimeSec + crystalLevel(s, 'bossTime') * perLevel('bossTime');

export const offlineCapSec = (s: GameState): number =>
  (BALANCE.offline.baseCapHours + crystalLevel(s, 'offline') * perLevel('offline')) * 3600;

export const cooldownMult = (s: GameState): number =>
  Math.max(0.2, 1 - crystalLevel(s, 'cooldown') * perLevel('cooldown'));

// ---------- Dano total ----------
export function guildDps(s: GameState): Decimal {
  let sum = D(0);
  s.guild.forEach((lvl, i) => (sum = sum.plus(memberDps(i, lvl))));
  return sum.times(globalDamageMult(s));
}

export const mageUnlocked = (s: GameState): boolean => s.maxStage >= BALANCE.mage.unlockStage;

/** DPS total efetivo (guilda + Mago). */
export function totalDps(s: GameState): Decimal {
  const g = guildDps(s);
  return mageUnlocked(s) ? g.times(1 + BALANCE.mage.dpsShare) : g;
}

/** Dano do projétil do Mago (um pacote a cada intervalo). */
export const mageHitDamage = (s: GameState): Decimal =>
  guildDps(s).times(BALANCE.mage.dpsShare * BALANCE.mage.intervalSec);

export function tapDamage(s: GameState, now: number): Decimal {
  let dmg = bladeDamage(s.bladeLevel).times(globalDamageMult(s));
  if (s.arcaneLevel > 0) {
    dmg = dmg.plus(totalDps(s).times(s.arcaneLevel * BALANCE.arcane.dpsSharePerLevel));
  }
  if (s.abilityActiveUntil.fury > now) dmg = dmg.times(BALANCE.abilities.fury.tapMult);
  return dmg;
}

/** Ouro por segundo que o DPS atual geraria na fase atual. */
export function incomePerSec(s: GameState, now: number): Decimal {
  const hp = enemyHp(s.stage);
  const gold = enemyGold(s.stage).times(goldMult(s, now));
  return totalDps(s).div(hp).times(gold);
}

/** Multiplicador de dano que o jogador terá depois de renascer. */
export function prestigeDamageGain(s: GameState): Decimal {
  const after = s.crystals.plus(crystalsForPrestige(s.maxStage));
  return globalDamageMult(s, after).div(globalDamageMult(s));
}
