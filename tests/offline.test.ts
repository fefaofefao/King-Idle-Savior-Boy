import { describe, expect, it } from 'vitest';
import { applyOffline, computeOffline } from '../src/core/offline';
import { incomePerSec } from '../src/core/formulas';
import { createInitialState } from '../src/core/state';

const H = 3600 * 1000;

describe('ganhos offline', () => {
  it('renda × segundos × 0.5', () => {
    const s = createInitialState(0);
    s.guild[0] = 10;
    s.stage = 5;
    s.lastSeen = 0;
    const r = computeOffline(s, 1000 * 1000);
    expect(r.cappedSeconds).toBe(1000);
    expect(r.gold.toNumber()).toBe(Math.floor(incomePerSec(s, 0).toNumber() * 1000 * 0.5));
  });
  it('limite padrão de 8h e +1h por nível da loja', () => {
    const s = createInitialState(0);
    s.guild[0] = 10;
    expect(computeOffline(s, 20 * H).cappedSeconds).toBe(8 * 3600);
    s.crystalUpgrades.offline = 2;
    expect(computeOffline(s, 20 * H).cappedSeconds).toBe(10 * 3600);
  });
  it('relógio voltando no tempo não concede nada e reajusta o timestamp', () => {
    const s = createInitialState(10 * H);
    s.guild[0] = 10;
    const r = applyOffline(s, 5 * H);
    expect(r.clockRewound).toBe(true);
    expect(r.gold.toNumber()).toBe(0);
    expect(s.lastSeen).toBe(5 * H);
    // Depois do reajuste, o tempo volta a contar normalmente a partir do novo ponto.
    expect(computeOffline(s, 5 * H + 60_000).cappedSeconds).toBe(60);
  });
  it('buff temporário de anúncio não multiplica o offline', () => {
    const s = createInitialState(0);
    s.guild[0] = 10;
    const a = computeOffline(s, H).gold;
    s.adGoldBuffUntil = 10 * H;
    expect(computeOffline(s, H).gold.eq(a)).toBe(true);
  });
});
