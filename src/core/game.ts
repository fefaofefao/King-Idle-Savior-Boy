import { BALANCE, type AbilityId, type AffixId, type CrystalUpgradeId, type MonsterId } from '../config/balance';
import { D, Decimal, maxAffordable } from './bignum';
import {
  arcaneCost,
  bladeCost,
  bossTimeSec,
  cooldownMult,
  critChance,
  crystalUpgradeCost,
  crystalUpgradeMaxed,
  crystalsForPrestige,
  enemyGold,
  goldMult,
  incomePerSec,
  mageHitDamage,
  mageUnlocked,
  memberCost,
  memberUnlocked,
  stageEnemyGold,
  stageEnemyHp,
  tapDamage,
  totalDps,
} from './formulas';
import {
  checkAchievements,
  ensureMissions,
  trackMissions,
  type TrackKind,
} from './retention';
import { createInitialState, isBossStage, type GameState } from './state';
import { currentStoryQuest, storyProgress } from './story';

export type BuyAmount = 1 | 10 | 25 | 'max';

export type GameEvent =
  | { type: 'hit'; amount: Decimal; crit: boolean; source: 'tap' | 'mage' | 'strike' | 'weak'; armor?: boolean }
  | { type: 'kill'; gold: Decimal; boss: boolean; monster: Monster }
  | { type: 'spawn'; boss: boolean; stage: number; monster: Monster }
  | { type: 'escaped' }
  | { type: 'armorBroken' }
  | { type: 'stageChanged'; stage: number }
  | { type: 'bossTimeout'; canExtend: boolean }
  | { type: 'bossFailed' }
  | { type: 'mageCast' }
  | { type: 'purchase'; what: string }
  | { type: 'levelMilestone' }
  | { type: 'ability'; id: AbilityId }
  | { type: 'achievement'; id: string }
  | { type: 'prestige'; crystals: Decimal }
  | { type: 'storyClaimed'; gold: Decimal; crystals: number; chapterDone: boolean };

/** Inimigo atual: tipo (modelo/nome) e variação rara. */
export interface Monster {
  type: MonsterId;
  affix: AffixId | null;
}

export interface GameOptions {
  rng?: () => number;
  /** Se true, ao esgotar o tempo do chefe o jogo pausa e oferece +15 s (anúncio). */
  offerBossExtension?: boolean;
  respawnDelaySec?: number;
}

export class Game {
  state: GameState;
  enemyHp: Decimal = D(0);
  enemyMaxHp: Decimal = D(1);
  bossTimeLeft = 0;
  /** Inimigo atual. */
  monster: Monster = { type: 'minion', affix: null };
  /** Armadura restante (inimigos Blindados). */
  armor: Decimal = D(0);
  armorMax: Decimal = D(0);
  /** Tempo até o Esqueleto Dourado fugir. */
  escapeTimer = 0;
  bossExtended = false;
  bossPaused = false;
  /** Tempo até o próximo inimigo aparecer (animação de morte). */
  respawnTimer = 0;
  awaitingSpawn = false;
  private mageTimer = 0;
  /** Último timestamp conhecido (ms), usado para buffs no momento do kill. */
  private now = Date.now();
  private pendingMage: { t: number; dmg: Decimal }[] = [];
  private listeners: ((e: GameEvent) => void)[] = [];
  private rng: () => number;
  opts: Required<GameOptions>;

  constructor(state?: GameState, opts: GameOptions = {}) {
    this.state = state ?? createInitialState();
    this.rng = opts.rng ?? Math.random;
    this.opts = {
      rng: this.rng,
      offerBossExtension: opts.offerBossExtension ?? false,
      respawnDelaySec: opts.respawnDelaySec ?? 0.6,
    };
    this.spawnEnemy();
  }

  on(fn: (e: GameEvent) => void): () => void {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }

  private emit(e: GameEvent): void {
    for (const l of this.listeners) l(e);
  }

  get isBoss(): boolean {
    return isBossStage(this.state.stage);
  }

  get enemyAlive(): boolean {
    return !this.awaitingSpawn && this.enemyHp.gt(0);
  }

  // ---------------- Ciclo ----------------

  /** Sorteia o tipo e a variação do próximo inimigo. */
  private rollMonster(): Monster {
    const s = this.state;
    // Chefe: Rei Esqueleto no fim de cada zona (a cada 50 fases), General Esqueleto nos demais.
    if (this.isBoss) return { type: s.stage % 50 === 0 ? 'king' : 'general', affix: null };
    const M = BALANCE.monsters;
    const pool = M.types.filter((t) => s.stage >= t.minStage);
    let r = this.rng() * pool.reduce((a, t) => a + t.weight, 0);
    let type: MonsterId = pool[0].id;
    for (const t of pool) {
      if ((r -= t.weight) < 0) {
        type = t.id;
        break;
      }
    }
    let affix: AffixId | null = null;
    const roll = this.rng();
    let acc = 0;
    for (const id of Object.keys(M.affixes) as AffixId[]) {
      const a = M.affixes[id];
      if (s.stage < a.minStage) continue;
      acc += a.chance;
      if (roll < acc) {
        affix = id;
        break;
      }
    }
    return { type, affix };
  }

  /** Multiplicadores de vida/ouro do inimigo atual (tipo × variação). */
  private monsterMult(): { hp: number; gold: number } {
    const M = BALANCE.monsters;
    const t = M.types.find((x) => x.id === this.monster.type);
    let hp = t?.hp ?? 1;
    let gold = t?.gold ?? 1;
    const a = this.monster.affix;
    if (a === 'golden') {
      hp *= M.affixes.golden.hp;
      gold *= M.affixes.golden.gold;
    } else if (a === 'armored') {
      gold *= M.affixes.armored.gold;
    } else if (a === 'giant') {
      hp *= M.affixes.giant.hp;
      gold *= M.affixes.giant.gold;
    }
    return { hp, gold };
  }

  spawnEnemy(): void {
    const s = this.state;
    this.monster = this.rollMonster();
    const mult = this.monsterMult();
    this.enemyMaxHp = stageEnemyHp(s.stage).times(mult.hp);
    this.enemyHp = this.enemyMaxHp;
    const A = BALANCE.monsters.affixes;
    // Blindado: parte da vida vira armadura (a vida total continua a mesma).
    this.armorMax = this.monster.affix === 'armored' ? this.enemyMaxHp.times(A.armored.armorFrac) : D(0);
    this.armor = this.armorMax;
    this.enemyHp = this.enemyMaxHp.minus(this.armorMax);
    this.escapeTimer = this.monster.affix === 'golden' ? A.golden.escapeSec : 0;
    this.awaitingSpawn = false;
    this.respawnTimer = 0;
    if (this.isBoss) {
      this.bossTimeLeft = bossTimeSec(s);
      this.bossExtended = false;
      this.bossPaused = false;
    }
    this.emit({ type: 'spawn', boss: this.isBoss, stage: s.stage, monster: this.monster });
  }

  update(dt: number, now: number): void {
    const s = this.state;
    this.now = now;
    s.stats.playTimeSec += dt;

    if (this.awaitingSpawn) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.spawnEnemy();
      return;
    }
    if (this.bossPaused) return;

    // Esqueleto Dourado foge se demorar.
    if (this.monster.affix === 'golden' && this.enemyAlive) {
      this.escapeTimer -= dt;
      if (this.escapeTimer <= 0) {
        this.emit({ type: 'escaped' });
        this.enemyHp = D(0);
        this.respawnTimer = this.opts.respawnDelaySec;
        this.awaitingSpawn = true;
        this.pendingMage = [];
        return;
      }
    }

    // DPS contínuo da guilda.
    const dps = totalDps(s);
    if (dps.gt(0)) {
      const guildPart = mageUnlocked(s) ? dps.div(1 + BALANCE.mage.dpsShare) : dps;
      this.damage(guildPart.times(dt));
    }

    // Mago: um projétil a cada intervalo, dano aplicado ao chegar.
    if (mageUnlocked(s) && dps.gt(0)) {
      this.mageTimer += dt;
      if (this.mageTimer >= BALANCE.mage.intervalSec) {
        this.mageTimer -= BALANCE.mage.intervalSec;
        this.pendingMage.push({ t: 0.35, dmg: mageHitDamage(s) });
        this.emit({ type: 'mageCast' });
      }
    }
    for (const p of this.pendingMage) p.t -= dt;
    while (this.pendingMage.length && this.pendingMage[0].t <= 0) {
      const p = this.pendingMage.shift()!;
      if (this.enemyAlive) {
        this.emit({ type: 'hit', amount: p.dmg, crit: false, source: 'mage', armor: this.armor.gt(0) });
        this.damage(p.dmg);
      }
    }

    // Timer do chefe.
    if (this.isBoss && this.enemyAlive) {
      this.bossTimeLeft -= dt;
      if (this.bossTimeLeft <= 0) {
        this.bossTimeLeft = 0;
        if (this.opts.offerBossExtension && !this.bossExtended) {
          this.bossPaused = true;
          this.emit({ type: 'bossTimeout', canExtend: true });
        } else {
          this.failBoss();
        }
      }
    }
  }

  tap(now: number): { damage: Decimal; crit: boolean } | null {
    const s = this.state;
    this.now = now;
    if (!this.enemyAlive || this.bossPaused) return null;
    s.stats.taps++;
    this.track('taps', 1);
    let dmg = tapDamage(s, now);
    const crit = this.rng() < critChance(s);
    if (crit) {
      dmg = dmg.times(BALANCE.crit.mult);
      s.stats.crits++;
      this.track('crits', 1);
    }
    this.emit({ type: 'hit', amount: dmg, crit, source: 'tap', armor: this.armor.gt(0) });
    this.damage(dmg, true);
    return { damage: dmg, crit };
  }

  /** Toque num Ponto Fraco: sempre crítico e multiplicado. Ignora a armadura (é um ponto fraco!). */
  weakSpotHit(now: number): Decimal | null {
    const s = this.state;
    this.now = now;
    if (!this.enemyAlive || this.bossPaused) return null;
    s.stats.taps++;
    s.stats.weakHits++;
    s.stats.crits++;
    this.track('taps', 1);
    this.track('crits', 1);
    this.track('weakHits', 1);
    const dmg = tapDamage(s, now).times(BALANCE.crit.mult).times(BALANCE.monsters.weakSpot.tapMult);
    this.emit({ type: 'hit', amount: dmg, crit: true, source: 'weak' });
    // Ponto fraco atravessa a armadura.
    this.armor = D(0);
    this.enemyHp = this.enemyHp.minus(dmg);
    if (this.enemyHp.lte(0)) this.kill(now);
    this.checkAchievements();
    return dmg;
  }

  /** Vida restante somando a armadura (para a barra de vida). */
  get enemyTotalHp(): Decimal {
    return this.enemyHp.plus(this.armor);
  }

  /** Aplica dano: a armadura absorve primeiro (toques causam só uma fração nela). */
  private damage(amount: Decimal, tapLike = false): void {
    if (!this.enemyAlive) return;
    if (this.armor.gt(0)) {
      const factor = tapLike ? BALANCE.monsters.affixes.armored.tapVsArmor : 1;
      const onArmor = amount.times(factor);
      if (onArmor.lt(this.armor)) {
        this.armor = this.armor.minus(onArmor);
        return;
      }
      // Quebrou a armadura: o que sobrou do golpe vai para a vida.
      amount = onArmor.minus(this.armor).div(factor);
      this.armor = D(0);
      this.emit({ type: 'armorBroken' });
    }
    this.enemyHp = this.enemyHp.minus(amount);
    if (this.enemyHp.lte(0)) this.kill(this.now);
  }

  private kill(now: number): void {
    const s = this.state;
    const boss = this.isBoss;
    this.enemyHp = D(0);
    // Ouro fracionário (sem arredondar para cima): no começo um inimigo vale menos de 1 de ouro.
    const gold = stageEnemyGold(s.stage).times(goldMult(s, now)).times(this.monsterMult().gold);
    this.addGold(gold);
    s.stats.kills++;
    s.bestiary[this.monster.type] = (s.bestiary[this.monster.type] ?? 0) + 1;
    if (this.monster.affix === 'golden') {
      s.stats.goldenKills++;
      this.track('golden', 1);
    }
    this.track('kills', 1);
    this.emit({ type: 'kill', gold, boss, monster: this.monster });
    this.respawnTimer = this.opts.respawnDelaySec;
    this.awaitingSpawn = true;
    this.pendingMage = [];

    if (boss) {
      s.stats.bossKills++;
      this.track('bossKills', 1);
      this.advanceStage();
    } else if (s.farming) {
      s.killsInStage = BALANCE.stage.enemiesPerStage;
    } else {
      s.killsInStage++;
      if (s.killsInStage >= BALANCE.stage.enemiesPerStage) this.advanceStage();
    }
    this.checkAchievements();
  }

  private advanceStage(): void {
    const s = this.state;
    s.stage++;
    s.killsInStage = 0;
    s.farming = false;
    if (s.stage > s.maxStage) {
      s.maxStage = s.stage;
      this.track('stages', 1);
    }
    s.stats.highestStage = Math.max(s.stats.highestStage, s.stage);
    this.emit({ type: 'stageChanged', stage: s.stage });
  }

  addGold(g: Decimal): void {
    this.state.gold = this.state.gold.plus(g);
    this.state.stats.totalGold = this.state.stats.totalGold.plus(g);
  }

  // ---------------- Chefe ----------------

  extendBoss(): void {
    if (!this.bossPaused) return;
    this.bossExtended = true;
    this.bossPaused = false;
    this.bossTimeLeft += BALANCE.ads.bossExtraSec;
  }

  failBoss(): void {
    const s = this.state;
    this.bossPaused = false;
    s.stage = Math.max(1, s.stage - 1);
    s.farming = true;
    s.killsInStage = BALANCE.stage.enemiesPerStage;
    this.emit({ type: 'bossFailed' });
    this.emit({ type: 'stageChanged', stage: s.stage });
    this.spawnEnemy();
  }

  fightBoss(): void {
    const s = this.state;
    if (!s.farming) return;
    s.farming = false;
    s.stage++;
    s.killsInStage = 0;
    this.emit({ type: 'stageChanged', stage: s.stage });
    this.spawnEnemy();
  }

  // ---------------- Compras ----------------

  private resolveAmount(base: number, growth: number, level: number, amount: BuyAmount, cap = Infinity): number {
    if (amount === 'max') return maxAffordable(base, growth, level, this.state.gold, cap);
    return Math.min(amount, cap);
  }

  bladeBuyInfo(amount: BuyAmount): { n: number; cost: Decimal } {
    const L = this.state.bladeLevel;
    const n = Math.max(1, this.resolveAmount(BALANCE.blade.baseCost, BALANCE.blade.costGrowth, L, amount));
    return { n, cost: bladeCost(L, n) };
  }

  buyBlade(amount: BuyAmount): boolean {
    const { n, cost } = this.bladeBuyInfo(amount);
    if (this.state.gold.lt(cost)) return false;
    const before = this.state.bladeLevel;
    this.state.gold = this.state.gold.minus(cost);
    this.state.bladeLevel += n;
    this.track('bladeLevels', n);
    if (BALANCE.blade.milestones.some((m) => before < m && this.state.bladeLevel >= m)) {
      this.emit({ type: 'levelMilestone' });
    }
    this.emit({ type: 'purchase', what: 'blade' });
    this.checkAchievements();
    return true;
  }

  arcaneUnlocked(): boolean {
    return this.state.stats.highestStage >= BALANCE.arcane.unlockStage;
  }

  buyArcane(): boolean {
    const s = this.state;
    if (!this.arcaneUnlocked() || s.arcaneLevel >= BALANCE.arcane.maxLevel) return false;
    const cost = arcaneCost(s.arcaneLevel);
    if (s.gold.lt(cost)) return false;
    s.gold = s.gold.minus(cost);
    s.arcaneLevel++;
    this.emit({ type: 'purchase', what: 'arcane' });
    return true;
  }

  memberBuyInfo(i: number, amount: BuyAmount): { n: number; cost: Decimal } {
    const m = BALANCE.guild.members[i];
    const L = this.state.guild[i];
    const n = Math.max(1, this.resolveAmount(m.baseCost, BALANCE.guild.costGrowth, L, amount));
    return { n, cost: memberCost(i, L, n) };
  }

  buyMember(i: number, amount: BuyAmount): boolean {
    const s = this.state;
    if (!memberUnlocked(s, i)) return false;
    const { n, cost } = this.memberBuyInfo(i, amount);
    if (s.gold.lt(cost)) return false;
    const before = s.guild[i];
    s.gold = s.gold.minus(cost);
    s.guild[i] += n;
    s.stats.guildLevelsBought += n;
    this.track('guildLevels', n);
    if (BALANCE.guild.milestones.some((m) => before < m.level && s.guild[i] >= m.level)) {
      this.emit({ type: 'levelMilestone' });
    }
    this.emit({ type: 'purchase', what: 'member' });
    this.checkAchievements();
    return true;
  }

  // ---------------- Habilidades ----------------

  abilityUnlocked(id: AbilityId): boolean {
    return this.state.stats.highestStage >= BALANCE.abilities[id].unlockStage;
  }

  abilityCooldownSec(id: AbilityId): number {
    return BALANCE.abilities[id].cooldownSec * cooldownMult(this.state);
  }

  useAbility(id: AbilityId, now: number): boolean {
    const s = this.state;
    this.now = now;
    if (!this.abilityUnlocked(id) || s.abilityReadyAt[id] > now) return false;
    s.abilityReadyAt[id] = now + this.abilityCooldownSec(id) * 1000;
    s.stats.abilitiesUsed++;
    this.track('abilities', 1);
    if (id === 'strike') {
      const dmg = totalDps(s).times(BALANCE.abilities.strike.dpsSeconds).max(tapDamage(s, now).times(10));
      if (this.enemyAlive) {
        this.emit({ type: 'hit', amount: dmg, crit: true, source: 'strike' });
        this.armor = D(0);
        this.damage(dmg);
      }
    } else {
      s.abilityActiveUntil[id] = now + BALANCE.abilities[id].durationSec * 1000;
    }
    this.emit({ type: 'ability', id });
    this.checkAchievements();
    return true;
  }

  // ---------------- Renascer ----------------

  canPrestige(): boolean {
    return this.state.maxStage >= BALANCE.prestige.minStage;
  }

  prestige(now: number): Decimal {
    const s = this.state;
    if (!this.canPrestige()) return D(0);
    const gain = crystalsForPrestige(s.maxStage);
    s.crystals = s.crystals.plus(gain);
    s.gold = D(0);
    s.stage = 1;
    s.maxStage = 1;
    s.killsInStage = 0;
    s.farming = false;
    s.bladeLevel = 0;
    s.arcaneLevel = 0;
    s.guild = s.guild.map(() => 0);
    s.abilityActiveUntil = { strike: 0, fury: 0, goldRain: 0 };
    s.runStartedAt = now;
    s.stats.prestiges++;
    this.pendingMage = [];
    this.mageTimer = 0;
    this.emit({ type: 'prestige', crystals: gain });
    this.emit({ type: 'stageChanged', stage: 1 });
    this.spawnEnemy();
    this.checkAchievements();
    return gain;
  }

  buyCrystalUpgrade(id: CrystalUpgradeId): boolean {
    const s = this.state;
    const lvl = s.crystalUpgrades[id] ?? 0;
    if (crystalUpgradeMaxed(id, lvl)) return false;
    const cost = crystalUpgradeCost(id, lvl);
    if (s.crystals.lt(cost)) return false;
    s.crystals = s.crystals.minus(cost);
    s.crystalUpgrades[id] = lvl + 1;
    this.emit({ type: 'purchase', what: 'crystal' });
    return true;
  }

  // ---------------- Jornada do Rei ----------------

  /** Ouro de uma conquista sem cristais: 3 min de renda (piso de 15 abates da fase). */
  achievementGold(now: number): Decimal {
    return this.incomeReward(180, now, 15);
  }

  /** Ouro da missão principal atual: segundos de renda, com piso de 5 abates da fase e ouro fixo. */
  storyGoldReward(now: number): Decimal {
    const quest = currentStoryQuest(this.state);
    return this.incomeReward(quest.incomeSec ?? 0, now, 5).max(quest.gold ?? 0);
  }

  /** Coleta a missão principal atual, se cumprida. Retorna false se ainda não está pronta. */
  claimStory(now: number): boolean {
    const s = this.state;
    const quest = currentStoryQuest(s);
    if (storyProgress(s, quest) < quest.target) return false;
    const gold = this.storyGoldReward(now);
    this.addGold(gold);
    const crystals = quest.crystals ?? 0;
    if (crystals) s.crystals = s.crystals.plus(crystals);
    s.story.index++;
    const next = currentStoryQuest(s);
    this.emit({ type: 'storyClaimed', gold, crystals, chapterDone: next.chapter !== quest.chapter });
    return true;
  }

  // ---------------- Retenção ----------------

  track(kind: TrackKind, amount: number): void {
    trackMissions(this.state, kind, amount);
  }

  checkAchievements(): void {
    for (const id of checkAchievements(this.state)) this.emit({ type: 'achievement', id });
  }

  ensureMissions(now: number): void {
    ensureMissions(this.state, now);
  }

  /** Valor de uma recompensa em "segundos de renda", com piso em kills da fase atual. */
  incomeReward(seconds: number, now: number, minKills = 5): Decimal {
    const s = this.state;
    const byIncome = incomePerSec(s, now).times(seconds);
    const byKills = enemyGold(s.stage).times(goldMult(s, now)).times(minKills);
    // Arredonda para cima: no começo do jogo a recompensa nunca fica em 0.
    return byIncome.max(byKills).ceil();
  }
}
