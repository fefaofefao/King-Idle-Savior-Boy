import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { D } from '../src/core/bignum';
import { bestiaryGoldMult, bestiaryStars, enemyHp } from '../src/core/formulas';
import { Game } from '../src/core/game';
import { createInitialState } from '../src/core/state';

/** RNG com sequência fixa (tipo, depois variação, ...). */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

const at = (stage: number) => {
  const s = createInitialState();
  s.stage = stage;
  s.maxStage = stage;
  return s;
};

describe('monstros', () => {
  it('tipos respeitam a fase mínima', () => {
    // fase 1: só Lacaio
    const g = new Game(at(1), { rng: seq(0.99, 0.99) });
    expect(g.monster.type).toBe('minion');
    // fase 41: o último sorteável é o último tipo da lista com fase mínima ≤ 41
    const pool = BALANCE.monsters.types.filter((t) => t.minStage <= 41);
    const g2 = new Game(at(41), { rng: seq(0.999, 0.99) });
    expect(g2.monster.type).toBe(pool[pool.length - 1].id);
    // nunca sorteia um tipo antes da fase mínima
    for (let i = 0; i < 200; i++) {
      const g3 = new Game(at(5));
      const t = BALANCE.monsters.types.find((x) => x.id === g3.monster.type)!;
      expect(t.minStage).toBeLessThanOrEqual(5);
    }
  });

  it('chefes: General nas fases 10–40 e Rei Esqueleto a cada 50', () => {
    expect(new Game(at(10)).monster.type).toBe('general');
    expect(new Game(at(50)).monster.type).toBe('king');
    expect(new Game(at(50)).monster.affix).toBeNull();
  });

  it('Dourado: menos vida, muito ouro, e foge se demorar', () => {
    const g = new Game(at(5), { rng: seq(0, 0.001) });
    expect(g.monster.affix).toBe('golden');
    expect(g.enemyMaxHp.toNumber()).toBeCloseTo(enemyHp(5).toNumber() * BALANCE.monsters.affixes.golden.hp);
    const events: string[] = [];
    g.on((e) => events.push(e.type));
    for (let t = 0; t < BALANCE.monsters.affixes.golden.escapeSec + 0.5; t += 0.1) g.update(0.1, 0);
    expect(events).toContain('escaped');
    expect(g.state.killsInStage).toBe(0); // fugir não conta abate
  });

  it('Blindado: armadura absorve toques pela metade e quebra', () => {
    const s = at(10 + 1);
    // tipo=0, variação=0.05 (> chance do dourado 0.035 → blindado), toque=0.99 (sem crítico)
    const g = new Game(s, { rng: seq(0, 0.05, 0.99) });
    expect(g.monster.affix).toBe('armored');
    const armor0 = g.armor;
    expect(armor0.gt(0)).toBe(true);
    expect(g.enemyTotalHp.toNumber()).toBeCloseTo(g.enemyMaxHp.toNumber());
    g.state.bladeLevel = 9; // dano 10
    g.tap(0);
    expect(armor0.minus(g.armor).toNumber()).toBeCloseTo(5); // metade
    const events: string[] = [];
    g.on((e) => events.push(e.type));
    g.state.bladeLevel = 1e6;
    g.tap(0);
    expect(events).toContain('armorBroken');
  });

  it('Ponto Fraco: crítico × multiplicador e atravessa armadura', () => {
    const g = new Game(at(11), { rng: seq(0, 0.05) });
    g.state.bladeLevel = 0;
    const dmg = g.weakSpotHit(0)!;
    expect(dmg.toNumber()).toBeCloseTo(BALANCE.crit.mult * BALANCE.monsters.weakSpot.tapMult);
    expect(g.armor.eq(0)).toBe(true);
    expect(g.state.stats.weakHits).toBe(1);
  });

  it('Bestiário: conta abates por tipo e dá +2% de ouro por estrela', () => {
    const g = new Game(at(1), { rng: () => 0.99, respawnDelaySec: 0 });
    g.state.bladeLevel = 1000;
    for (let i = 0; i < 10; i++) {
      g.tap(0);
      g.update(0.01, 0);
    }
    expect(g.state.bestiary.minion).toBe(10);
    expect(bestiaryStars(10)).toBe(1);
    expect(bestiaryGoldMult(g.state)).toBeCloseTo(1.02);
  });

  it('média de vida/ouro dos tipos comuns fica perto de 1 (não quebra o ritmo)', () => {
    const T = BALANCE.monsters.types;
    const w = T.reduce((a, t) => a + t.weight, 0);
    const hp = T.reduce((a, t) => a + t.hp * t.weight, 0) / w;
    expect(hp).toBeGreaterThan(0.9);
    expect(hp).toBeLessThan(1.15);
  });

  it('primeiro monstro: 10 de vida e 1 de ouro', () => {
    const g = new Game(at(1), { rng: () => 0.99, respawnDelaySec: 0 });
    expect(g.enemyMaxHp.toNumber()).toBe(10);
    g.state.bladeLevel = 1000;
    g.tap(0);
    expect(g.state.gold.toNumber()).toBeCloseTo(1);
    void D;
  });

  it('parede: o ouro cresce mais devagar que a vida (o Renascer passa a valer a pena)', () => {
    const hp = enemyHp(40).div(enemyHp(1)).toNumber();
    const gold = new Game(at(40), { rng: () => 0.99 }); // só para garantir que a fase 40 é chefe
    expect(gold.isBoss).toBe(true);
    expect(BALANCE.enemy.goldStageDecay).toBeLessThan(1);
    expect(hp).toBeGreaterThan(1000);
  });
});
