import { describe, expect, it } from 'vitest';
import { D, bulkCost, maxAffordable } from '../src/core/bignum';
import {
  bladeCost,
  bladeDamage,
  bossGold,
  bossHp,
  crystalsForPrestige,
  enemyGold,
  enemyHp,
  globalDamageMult,
  memberCost,
  memberDps,
  tapDamage,
  totalDps,
} from '../src/core/formulas';
import { createInitialState } from '../src/core/state';
import { BALANCE } from '../src/config/balance';
import { formatNumber, formatTime } from '../src/core/format';

describe('inimigos', () => {
  it('HP cresce 1.19 por fase', () => {
    expect(enemyHp(1).toNumber()).toBeCloseTo(10);
    expect(enemyHp(2).toNumber()).toBeCloseTo(11.9);
    expect(enemyHp(11).toNumber()).toBeCloseTo(10 * Math.pow(1.19, 10));
  });
  it('chefe tem HP ×10 e ouro ×6', () => {
    expect(bossHp(10).div(enemyHp(10)).toNumber()).toBeCloseTo(10);
    expect(bossGold(10).div(enemyGold(10)).toNumber()).toBeCloseTo(6);
    expect(enemyGold(1).toNumber()).toBeCloseTo(10 * BALANCE.enemy.goldPerHp);
  });
});

describe('Lâmina', () => {
  it('custo 10 × 1.07^L', () => {
    expect(bladeCost(0).toNumber()).toBeCloseTo(10);
    expect(bladeCost(5).toNumber()).toBeCloseTo(10 * Math.pow(1.07, 5));
  });
  it('compra em lote = soma geométrica', () => {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += 10 * Math.pow(1.07, 3 + i);
    expect(bladeCost(3, 10).toNumber()).toBeCloseTo(sum, 6);
  });
  it('marcos dobram o dano', () => {
    expect(bladeDamage(0).toNumber()).toBe(1);
    expect(bladeDamage(24).toNumber()).toBe(25);
    expect(bladeDamage(25).toNumber()).toBe(52);
    expect(bladeDamage(50).toNumber()).toBe(51 * 4);
  });
});

describe('guilda', () => {
  it('custo e DPS com marcos', () => {
    expect(memberCost(0, 0).toNumber()).toBeCloseTo(50);
    expect(memberCost(1, 2).toNumber()).toBeCloseTo(500 * 1.075 ** 2);
    expect(memberDps(0, 9).toNumber()).toBe(45);
    expect(memberDps(0, 10).toNumber()).toBe(100);
    expect(memberDps(0, 200).toNumber()).toBe(5 * 200 * 2 * 2 * 2 * 2 * 4);
    expect(memberDps(3, 0).toNumber()).toBe(0);
  });
  it('DPS total inclui o Mago (20%) depois da fase 5', () => {
    const s = createInitialState();
    s.guild[0] = 1;
    expect(totalDps(s).toNumber()).toBe(5);
    s.maxStage = 5;
    expect(totalDps(s).toNumber()).toBeCloseTo(6);
  });
});

describe('maxAffordable', () => {
  it('nunca excede o dinheiro e não deixa sobrar um nível comprável', () => {
    for (const money of [5, 10, 100, 12345, 1e9]) {
      const n = maxAffordable(10, 1.07, 7, D(money));
      expect(bulkCost(10, 1.07, 7, n).lte(money)).toBe(true);
      expect(bulkCost(10, 1.07, 7, n + 1).gt(money)).toBe(true);
    }
  });
});

describe('toque', () => {
  it('Toque Arcano soma % do DPS e Fúria multiplica', () => {
    const s = createInitialState();
    s.guild[0] = 10; // 100 DPS
    s.arcaneLevel = 3;
    const now = 1000;
    expect(tapDamage(s, now).toNumber()).toBeCloseTo(1 + 3);
    s.abilityActiveUntil.fury = now + 1;
    expect(tapDamage(s, now).toNumber()).toBeCloseTo(12);
  });
});

describe('cristais', () => {
  it('nenhum cristal antes da fase mínima', () => {
    expect(crystalsForPrestige(BALANCE.prestige.minStage - 1).toNumber()).toBe(0);
  });
  it('fórmula floor(((max-offset)/div)^exp)', () => {
    const P = BALANCE.prestige;
    const m = 55;
    expect(crystalsForPrestige(m).toNumber()).toBe(
      Math.floor(Math.pow((m - P.offset) / P.divisor, P.exponent)),
    );
  });
  it('primeiro Renascer na fase 40-50 dá entre 5 e 15 cristais', () => {
    for (const m of [40, 45, 50]) {
      const c = crystalsForPrestige(m).toNumber();
      expect(c).toBeGreaterThanOrEqual(5);
      expect(c).toBeLessThanOrEqual(15);
    }
  });
  it('cada cristal não gasto dá +5% de dano', () => {
    const s = createInitialState();
    s.crystals = D(10);
    expect(globalDamageMult(s).toNumber()).toBeCloseTo(1.5);
  });
});

describe('formatação', () => {
  it('sufixos curtos e científica', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1500)).toBe('1.50K');
    expect(formatNumber(2.5e6)).toBe('2.50M');
    expect(formatNumber(D('1e40'))).toMatch(/[a-z]{2}$/);
    expect(formatNumber(12345, 'scientific')).toBe('1.23e4');
    expect(formatTime(75)).toBe('1:15');
  });
});
