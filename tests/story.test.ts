import { describe, expect, it } from 'vitest';
import { Game } from '../src/core/game';
import { D } from '../src/core/bignum';
import { deserialize, serialize } from '../src/core/save';
import { SCHEMA_VERSION, createInitialState } from '../src/core/state';
import { CHAPTERS, STORY, currentStoryQuest, storyComplete, storyProgress } from '../src/core/story';
import { BALANCE } from '../src/config/balance';

describe('Jornada do Rei', () => {
  it('cadeia válida: capítulos 1..5 em ordem e membros existentes', () => {
    let last = 1;
    for (const q of STORY) {
      expect(q.chapter).toBeGreaterThanOrEqual(last);
      expect(q.chapter).toBeLessThanOrEqual(CHAPTERS);
      last = q.chapter;
      if (q.kind === 'hire' || q.kind === 'member') expect(BALANCE.guild.members[q.member!]).toBeDefined();
      expect(q.target).toBeGreaterThan(0);
    }
  });

  it('só coleta quando cumprida e dá a recompensa', () => {
    const g = new Game(undefined, { rng: () => 1 });
    expect(currentStoryQuest(g.state).kind).toBe('taps');
    expect(g.claimStory(0)).toBe(false);
    for (let i = 0; i < 10; i++) g.tap(0);
    expect(storyComplete(g.state)).toBe(true);
    const before = g.state.gold;
    expect(g.claimStory(0)).toBe(true);
    expect(g.state.gold.gt(before)).toBe(true);
    expect(g.state.story.index).toBe(1);
  });

  it('tutorial dá pouco ouro (o começo é pago pelos monstros, sem avalanche)', () => {
    const g = new Game(undefined, { rng: () => 1 });
    g.state.stats.taps = 10;
    g.claimStory(0);
    g.state.stats.kills = 5;
    g.claimStory(0);
    g.state.bladeLevel = 1;
    g.claimStory(0);
    g.state.guild[0] = 1;
    g.claimStory(0);
    // 4 primeiras missões juntas: menos que o custo do 1º Escudeiro (50).
    expect(g.state.gold.toNumber()).toBeLessThan(50);
    expect(g.state.gold.toNumber()).toBeGreaterThan(0);
  });

  it('depois da cadeia, missões infinitas de fase com cristais', () => {
    const s = createInitialState();
    s.story.index = STORY.length + 2;
    const q = currentStoryQuest(s);
    expect(q.kind).toBe('stage');
    expect(q.target).toBe(175);
    expect(q.crystals).toBeGreaterThan(0);
  });

  it('progresso lido do estado (contratar membro)', () => {
    const s = createInitialState();
    const quest = STORY.find((q) => q.kind === 'hire' && q.member === 1)!;
    expect(storyProgress(s, quest)).toBe(0);
    s.guild[1] = 1;
    expect(storyProgress(s, quest)).toBe(1);
  });

  it('cristais da missão entram no saldo', () => {
    const g = new Game();
    const idx = STORY.findIndex((q) => q.crystals);
    g.state.story.index = idx;
    g.state.bladeLevel = 1000;
    g.state.stats.highestStage = 1000;
    g.state.stats.bossKills = 1000;
    g.state.stats.taps = 1e6;
    g.state.stats.kills = 1e6;
    g.state.guild = g.state.guild.map(() => 100);
    expect(g.claimStory(0)).toBe(true);
    expect(g.state.crystals.eq(D(STORY[idx].crystals!))).toBe(true);
  });
});

describe('migração v2 → v3', () => {
  it('adiciona a jornada e pula o tutorial de quem já jogava', () => {
    const raw = JSON.parse(serialize(createInitialState()));
    raw.schemaVersion = 2;
    delete raw.story;
    delete raw.tutorial;
    raw.stats.taps = 300;
    const s = deserialize(JSON.stringify(raw));
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.story.index).toBe(0);
    expect(s.tutorial.tapHintDone).toBe(true);
  });
});
