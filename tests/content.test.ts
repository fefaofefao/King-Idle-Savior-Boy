import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { D } from '../src/core/bignum';
import {
  crystalsForPrestige,
  globalDamageMult,
  relicBonus,
  skinUnlocked,
  skinsUnlocked,
  tapDamage,
} from '../src/core/formulas';
import { Game } from '../src/core/game';
import { deserialize, serialize } from '../src/core/save';
import { SCHEMA_VERSION, createInitialState } from '../src/core/state';

const at = (stage: number) => {
  const s = createInitialState();
  s.stage = stage;
  s.maxStage = stage;
  return s;
};

const killBoss = (g: Game) => {
  g.state.bladeLevel = 1e9;
  g.tap(0);
};

describe('relíquias', () => {
  it('o Rei (fase 50) sempre deixa uma relíquia; General às vezes', () => {
    const g = new Game(at(50), { rng: () => 0.5 });
    const events: string[] = [];
    g.on((e) => events.push(e.type));
    killBoss(g);
    expect(events).toContain('relic');
    expect(Object.values(g.state.relics).reduce((a, b) => a + (b ?? 0), 0)).toBe(1);
    // General com rng alto (> 25%): sem relíquia
    const g2 = new Game(at(10), { rng: () => 0.9 });
    killBoss(g2);
    expect(Object.keys(g2.state.relics)).toHaveLength(0);
  });

  it('bônus por nível e relíquia no máximo vira cristais', () => {
    const s = createInitialState();
    s.relics.sword = 3;
    expect(relicBonus(s, 'tap')).toBeCloseTo(0.3);
    const base = tapDamage(createInitialState(), 0).toNumber();
    expect(tapDamage(s, 0).toNumber()).toBeCloseTo(base * 1.3);
    // todas no máximo → cristais
    const g = new Game(at(50), { rng: () => 0.5 });
    for (const r of BALANCE.relics.list) g.state.relics[r.id] = BALANCE.relics.maxLevel;
    killBoss(g);
    expect(g.state.crystals.toNumber()).toBe(BALANCE.relics.maxedCrystals);
  });

  it('Coroa aumenta os cristais do Renascer', () => {
    const s = createInitialState();
    const base = crystalsForPrestige(60, s).toNumber();
    s.relics.crown = 4;
    expect(crystalsForPrestige(60, s).toNumber()).toBeGreaterThan(base);
  });
});

describe('visuais do Cavaleiro', () => {
  it('desbloqueio por marco e bônus de dano por visual', () => {
    const s = createInitialState();
    expect(skinUnlocked(s, 'classic')).toBe(true);
    expect(skinUnlocked(s, 'royal')).toBe(false);
    s.stats.highestStage = 50;
    expect(skinUnlocked(s, 'royal')).toBe(true);
    expect(skinsUnlocked(s)).toBe(1);
    expect(globalDamageMult(s).toNumber()).toBeCloseTo(1 + BALANCE.skins.damagePerSkin);
  });
});

describe('combo', () => {
  it('toques seguidos somam; parar zera; marco dá ouro', () => {
    const g = new Game(at(1), { rng: () => 0.99, respawnDelaySec: 0 });
    g.state.bladeLevel = 0;
    const events: string[] = [];
    g.on((e) => events.push(e.type));
    let t = 0;
    for (let i = 0; i < 50; i++) {
      g.tap(t);
      g.update(0.01, t);
      t += 200;
    }
    expect(g.state.stats.maxCombo).toBe(50);
    expect(events).toContain('combo');
    t += 5000;
    g.tap(t);
    expect(g.combo).toBe(1);
  });
});

describe('save v5', () => {
  it('relíquias e visual sobrevivem ao save e ao Renascer', () => {
    const g = new Game(at(45));
    g.state.relics.banner = 2;
    g.state.skin = 'royal';
    g.prestige(0);
    expect(g.state.relics.banner).toBe(2);
    const back = deserialize(serialize(g.state));
    expect(back.relics.banner).toBe(2);
    expect(back.skin).toBe('royal');
    expect(back.schemaVersion).toBe(SCHEMA_VERSION);
  });
  it('migração v4 → v5', () => {
    const raw = JSON.parse(serialize(createInitialState()));
    raw.schemaVersion = 4;
    delete raw.relics;
    delete raw.skin;
    const s = deserialize(JSON.stringify(raw));
    expect(s.relics).toEqual({});
    expect(s.skin).toBe('classic');
    void D;
  });
});

describe('versão final', () => {
  it('General só deixa relíquia depois do 1º Renascer', () => {
    const g = new Game(at(10), { rng: () => 0.01 });
    killBoss(g);
    expect(Object.keys(g.state.relics)).toHaveLength(0);
    const s = at(10);
    s.stats.prestiges = 1;
    const g2 = new Game(s, { rng: () => 0.01 });
    killBoss(g2);
    expect(Object.keys(g2.state.relics)).toHaveLength(1);
  });

  it('avisa só dos visuais novos e só troca para um liberado', () => {
    const s = createInitialState();
    s.stats.highestStage = 60; // 'royal' já liberado ao carregar: sem aviso
    const g = new Game(s);
    const got: string[] = [];
    g.on((e) => e.type === 'skinUnlocked' && got.push(e.id));
    g.checkAchievements();
    expect(got).toEqual([]);
    g.state.stats.bossKills = 30;
    g.checkAchievements();
    expect(got).toEqual(['crimson']);
    expect(g.setSkin('crimson')).toBe(true);
    expect(g.state.skin).toBe('crimson');
    expect(g.setSkin('savior')).toBe(false);
  });

  it('cristais crescem no fim de jogo (sem platô)', () => {
    const P = BALANCE.prestige;
    const c = (st: number) => crystalsForPrestige(st).toNumber();
    // Antes de lateStart a curva é a antiga; depois cresce bem mais rápido.
    expect(c(P.lateStart + 40) / c(P.lateStart + 20)).toBeGreaterThan(Math.pow(P.lateGrowth, 20));
  });

  it('missões novas da Jornada leem o estado', async () => {
    const { storyProgress } = await import('../src/core/story');
    const s = createInitialState();
    s.relics = { sword: 3, eye: 2 };
    s.stats.maxCombo = 120;
    s.stats.goldenKills = 4;
    s.stats.weakHits = 9;
    const q = (kind: string) => ({ chapter: 6, kind, target: 1 }) as never;
    expect(storyProgress(s, q('relics'))).toBe(2);
    expect(storyProgress(s, q('relicLevels'))).toBe(5);
    expect(storyProgress(s, q('combo'))).toBe(120);
    expect(storyProgress(s, q('golden'))).toBe(4);
    expect(storyProgress(s, q('weakHits'))).toBe(9);
  });

  it('combo: toques seguidos somam e o marco 50 dá ouro', () => {
    const g = new Game(at(5));
    g.enemyHp = D(1e30); // inimigo que não morre durante o teste
    let combo = 0;
    g.on((e) => e.type === 'combo' && (combo = e.count));
    for (let i = 0; i < 50; i++) g.tap(1000 + i * 200);
    expect(g.combo).toBe(50);
    expect(combo).toBe(50);
    g.tap(1000 + 50 * 200 + 2000); // pausa longa: zera
    expect(g.combo).toBe(1);
  });
});
