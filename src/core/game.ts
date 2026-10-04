import { BALANCE, type AbilityId, type CrystalUpgradeId } from '../config/balance';
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
  | { type: 'hit'; amount: Decimal; crit: boolean; source: 'tap' | 'mage' | 'strike' }
  | { type: 'kill'; gold: Decimal; boss: boolean }
  | { type: 'spawn'; boss: boolean; stage: number }
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

  spawnEnemy(): void {
    const s = this.state;
    this.enemyMaxHp = stageEnemyHp(s.stage);
    this.enemyHp = this.enemyMaxHp;
    this.awaitingSpawn = false;
    this.respawnTimer = 0;
    if (this.isBoss) {
      this.bossTimeLeft = bossTimeSec(s);
      this.bossExtended = false;
      this.bossPaused = false;
    }
    this.emit({ type: 'spawn', boss: this.isBoss, stage: s.stage });
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
        this.emit({ type: 'hit', amount: p.dmg, crit: false, source: 'mage' });
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
    this.emit({ type: 'hit', amount: dmg, crit, source: 'tap' });
    this.damage(dmg);
    return { damage: dmg, crit };
  }

  private damage(amount: Decimal): void {
    if (!this.enemyAlive) return;
    this.enemyHp = this.enemyHp.minus(amount);
    if (this.enemyHp.lte(0)) this.kill(this.now);
  }

  private kill(now: number): void {
    const s = this.state;
    const boss = this.isBoss;
    this.enemyHp = D(0);
    const gold = stageEnemyGold(s.stage).times(goldMult(s, now)).ceil();
    this.addGold(gold);
    s.stats.kills++;
    this.track('kills', 1);
    this.emit({ type: 'kill', gold, boss });
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

  /** Coleta a missão principal atual, se cumprida. Retorna false se ainda não está pronta. */
  claimStory(now: number): boolean {
    const s = this.state;
    const quest = currentStoryQuest(s);
    if (storyProgress(s, quest) < quest.target) return false;
    const gold = (quest.incomeSec ? this.incomeReward(quest.incomeSec, now, 5) : D(0)).max(quest.gold ?? 0);
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
