import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import {
  BACKUP_KEY,
  MemoryStore,
  SAVE_KEY,
  SaveManager,
  deserialize,
  exportSave,
  importSave,
  serialize,
} from '../src/core/save';
import { SCHEMA_VERSION, createInitialState } from '../src/core/state';

describe('serialização', () => {
  it('ida e volta preserva números grandes', () => {
    const s = createInitialState(123);
    s.gold = D('1.5e300');
    s.crystals = D(42);
    s.stage = 77;
    s.guild[2] = 13;
    const back = deserialize(serialize(s));
    expect(back.gold.toString()).toBe(s.gold.toString());
    expect(back.crystals.toNumber()).toBe(42);
    expect(back.stage).toBe(77);
    expect(back.guild[2]).toBe(13);
    expect(JSON.parse(serialize(s)).gold).toBe('1.5e+300');
  });
});

describe('migração', () => {
  it('v1 → v3 converte idioma e marca idioma escolhido', () => {
    const v1 = {
      schemaVersion: 1,
      gold: '100',
      crystals: '0',
      stage: 12,
      maxStage: 12,
      guild: [3, 1],
      settings: { lang: 'pt', sound: false },
      stats: { taps: 50, totalGold: '500' },
    };
    const s = deserialize(JSON.stringify(v1));
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.settings.lang).toBe('pt-BR');
    expect(s.settings.langChosen).toBe(true);
    expect(s.settings.sound).toBe(false);
    expect(s.settings.vibration).toBe(true);
    expect(s.noAds).toBe(false);
    expect(s.guild).toEqual([3, 1, 0, 0, 0, 0, 0, 0]);
    expect(s.stats.taps).toBe(50);
    expect(s.stats.totalGold.toNumber()).toBe(500);
  });
  it('recusa save de versão futura', () => {
    expect(() => deserialize(JSON.stringify({ schemaVersion: 999, stage: 1 }))).toThrow();
  });
});

describe('exportar/importar', () => {
  it('código com checksum', () => {
    const s = createInitialState();
    s.stage = 33;
    const code = exportSave(s);
    expect(importSave(code).stage).toBe(33);
  });
  it('rejeita código adulterado', () => {
    const code = exportSave(createInitialState());
    const parts = code.split('.');
    const tampered = parts[0] + '.' + parts[1] + '.' + btoa(atob(parts[2]).replace('"stage":1', '"stage":9'));
    expect(() => importSave(tampered)).toThrow(/Checksum/);
    expect(() => importSave('lixo')).toThrow();
  });
});

describe('SaveManager', () => {
  it('mantém backup e restaura quando o save principal corrompe', async () => {
    const store = new MemoryStore();
    const mgr = new SaveManager(store);
    const s = createInitialState();
    s.stage = 5;
    await mgr.save(s);
    s.stage = 6;
    await mgr.save(s);
    expect(deserialize((await store.get(BACKUP_KEY))!).stage).toBe(5);
    await store.set(SAVE_KEY, '{corrompido');
    const r = await mgr.load();
    expect(r.restoredFromBackup).toBe(true);
    expect(r.state!.stage).toBe(5);
  });
  it('sem save retorna null', async () => {
    const r = await new SaveManager(new MemoryStore()).load();
    expect(r.state).toBeNull();
  });

  it('v5 → v6: notificação vira opt-in e guarda se já foi pedida', () => {
    const v5 = JSON.parse(serialize(createInitialState()));
    v5.schemaVersion = 5;
    v5.settings.notifications = true;
    delete v5.settings.notifAsked;
    const s = deserialize(JSON.stringify(v5));
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.settings.notifications).toBe(true);
    expect(s.settings.notifAsked).toBe(true);
  });

  it('jogo novo: notificação desligada e nunca pedida', () => {
    const s = createInitialState();
    expect(s.settings.notifications).toBe(false);
    expect(s.settings.notifAsked).toBe(false);
  });
});
