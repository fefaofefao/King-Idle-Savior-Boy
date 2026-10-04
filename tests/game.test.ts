import { describe, expect, it } from 'vitest';
import { Game } from '../src/core/game';
import { D } from '../src/core/bignum';
import { canClaimDaily, dayKey, ensureMissions, markDailyClaimed } from '../src/core/retention';
import { createInitialState } from '../src/core/state';

const run = (g: Game, sec: number, now = 0) => {
  for (let t = 0; t < sec; t += 0.1) g.update(0.1, now + t * 1000);
};

describe('Game', () => {
  it('10 kills avançam a fase', () => {
    const g = new Game(undefined, { rng: () => 1, respawnDelaySec: 0 });
    for (let i = 0; i < 10; i++) {
      while (g.enemyAlive) g.tap(0);
      g.update(0.01, 0);
    }
    expect(g.state.stage).toBe(2);
    expect(g.state.gold.gt(0)).toBe(true);
  });

  it('chefe falha quando o tempo acaba e volta uma fase', () => {
    const s = createInitialState();
    s.stage = 10;
    s.maxStage = 10;
    const g = new Game(s, { rng: () => 1 });
    expect(g.isBoss).toBe(true);
    run(g, 31);
    expect(g.state.stage).toBe(9);
    expect(g.state.farming).toBe(true);
    g.fightBoss();
    expect(g.state.stage).toBe(10);
    expect(g.bossTimeLeft).toBe(30);
  });

  it('oferece +15 s uma vez por chefe', () => {
    const s = createInitialState();
    s.stage = 10;
    const g = new Game(s, { rng: () => 1, offerBossExtension: true });
    const events: string[] = [];
    g.on((e) => events.push(e.type));
    run(g, 31);
    expect(g.bossPaused).toBe(true);
    expect(events).toContain('bossTimeout');
    g.extendBoss();
    run(g, 16);
    expect(g.state.stage).toBe(9);
  });

  it('compra respeita o ouro disponível', () => {
    const g = new Game();
    expect(g.buyBlade(1)).toBe(false);
    g.state.gold = D(1000);
    expect(g.buyBlade('max')).toBe(true);
    expect(g.state.gold.gte(0)).toBe(true);
    expect(g.state.bladeLevel).toBeGreaterThan(10);
  });

  it('guilda é desbloqueada em sequência', () => {
    const g = new Game();
    g.state.gold = D(1e6);
    expect(g.buyMember(1, 1)).toBe(false);
    expect(g.buyMember(0, 1)).toBe(true);
    expect(g.buyMember(1, 1)).toBe(true);
  });

  it('Renascer zera a run e dá cristais', () => {
    const g = new Game();
    g.state.maxStage = 50;
    g.state.stage = 50;
    g.state.gold = D(1e20);
    g.state.guild[0] = 100;
    const gain = g.prestige(0);
    expect(gain.toNumber()).toBeGreaterThan(0);
    expect(g.state.crystals.eq(gain)).toBe(true);
    expect(g.state.stage).toBe(1);
    expect(g.state.gold.toNumber()).toBe(0);
    expect(g.state.guild[0]).toBe(0);
    expect(g.state.stats.prestiges).toBe(1);
  });

  it('habilidade respeita cooldown', () => {
    const g = new Game();
    g.state.stats.highestStage = 100;
    expect(g.useAbility('fury', 0)).toBe(true);
    expect(g.useAbility('fury', 1000)).toBe(false);
    expect(g.useAbility('fury', 481_000)).toBe(true);
  });
});

describe('retenção', () => {
  it('recompensa diária: uma por dia, ciclo de 7, dia perdido não zera', () => {
    const s = createInitialState(0);
    const day = 24 * 3600 * 1000;
    const t0 = new Date(2026, 0, 1, 12).getTime();
    expect(canClaimDaily(s, t0)).toBe(true);
    markDailyClaimed(s, t0);
    expect(canClaimDaily(s, t0 + 1000)).toBe(false);
    markDailyClaimed(s, t0 + 3 * day); // pulou dias
    expect(s.daily.index).toBe(2);
    for (let i = 0; i < 5; i++) markDailyClaimed(s, t0 + (4 + i) * day);
    expect(s.daily.index).toBe(0);
    expect(dayKey(t0)).toBe('2026-01-01');
  });
  it('3 missões diárias de tipos diferentes', () => {
    const s = createInitialState(0);
    ensureMissions(s, Date.UTC(2026, 0, 1));
    expect(s.missions.list).toHaveLength(3);
    expect(ensureMissions(s, Date.UTC(2026, 0, 1))).toBe(false);
  });
});
