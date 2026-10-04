import { describe, expect, it } from 'vitest';
import { LANGUAGES, LOCALES, detectLang } from '../src/i18n';
import { ACHIEVEMENTS, MISSION_POOL } from '../src/core/retention';
import { BALANCE, MONSTER_IDS } from '../src/config/balance';

describe('i18n', () => {
  it('3 idiomas com as mesmas chaves e sem textos vazios', () => {
    expect(LANGUAGES.map((l) => l.id)).toEqual(['pt-BR', 'en', 'es']);
    const ref = Object.keys(LOCALES['pt-BR']).sort();
    for (const l of LANGUAGES) {
      const loc = LOCALES[l.id];
      expect(Object.keys(loc).sort()).toEqual(ref);
      for (const [k, v] of Object.entries(loc)) expect(v.trim(), `${l.id}:${k}`).not.toBe('');
    }
  });
  it('placeholders iguais em todos os idiomas', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of Object.keys(LOCALES['pt-BR']) as (keyof (typeof LOCALES)['pt-BR'])[]) {
      for (const l of LANGUAGES) expect(ph(LOCALES[l.id][key]), `${l.id}:${key}`).toBe(ph(LOCALES['pt-BR'][key]));
    }
  });
  it('chaves dinâmicas existem (membros, missões, conquistas, zonas)', () => {
    const keys = new Set(Object.keys(LOCALES.en));
    for (const m of BALANCE.guild.members) expect(keys.has(`member.${m.id}`)).toBe(true);
    for (const m of MISSION_POOL) expect(keys.has(`mission.${m.kind}`)).toBe(true);
    for (const a of ACHIEVEMENTS) expect(keys.has(`ach.${a.kind}`)).toBe(true);
    for (const u of BALANCE.crystalShop) expect(keys.has(`crystal.${u.id}`)).toBe(true);
    for (let z = 0; z < 5; z++) expect(keys.has(`zone.${z}`) && keys.has(`zoneOf.${z}`)).toBe(true);
    for (const id of MONSTER_IDS) expect(keys.has(`monster.${id}`)).toBe(true);
    for (const id of Object.keys(BALANCE.monsters.affixes)) expect(keys.has(`affix.${id}`)).toBe(true);
  });
  it('detecta o idioma do aparelho', () => {
    expect(detectLang(['pt-PT'])).toBe('pt-BR');
    expect(detectLang(['es-MX', 'en'])).toBe('es');
    expect(detectLang(['fr-FR', 'en-GB'])).toBe('en');
    expect(detectLang(['ja'])).toBe('en');
  });
  it('cerca de 30 conquistas', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
