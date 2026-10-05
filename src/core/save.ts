import { D } from './bignum';
import { createInitialState, SCHEMA_VERSION, type GameState } from './state';

/** Armazenamento chave/valor assíncrono (Capacitor Preferences no app, memória nos testes). */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const SAVE_KEY = 'itk_save';
export const BACKUP_KEY = 'itk_save_backup';

// ---------- Serialização ----------

/** Converte o estado em JSON (Decimals viram string). */
export function serialize(s: GameState): string {
  return JSON.stringify({
    ...s,
    gold: s.gold.toString(),
    crystals: s.crystals.toString(),
    stats: { ...s.stats, totalGold: s.stats.totalGold.toString() },
  });
}

type Raw = Record<string, any>;

/** Migrações: a chave é a versão de origem; cada uma leva para versão+1. */
export const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  // v1 → v2: adicionou o 3º idioma, a escolha de idioma na primeira abertura e o "sem anúncios".
  1: (raw) => {
    const settings = raw.settings ?? {};
    const lang = settings.lang === 'pt' ? 'pt-BR' : settings.lang;
    return {
      ...raw,
      noAds: false,
      settings: { ...settings, lang: lang ?? 'en', langChosen: true },
      schemaVersion: 2,
    };
  },
  // v2 → v3: adicionou a Jornada do Rei (missões principais) e o tutorial.
  // Quem já jogava não vê o tutorial e começa a jornada do início (as missões já cumpridas
  // aparecem prontas para coletar, porque o progresso é lido do estado).
  2: (raw) => ({
    ...raw,
    story: { index: 0 },
    tutorial: { tapHintDone: (raw.stats?.taps ?? 0) > 0 },
    schemaVersion: 3,
  }),
  // v3 → v4: Bestiário e estatísticas de Pontos Fracos / Dourados (campos novos com valor padrão).
  3: (raw) => ({ ...raw, bestiary: {}, schemaVersion: 4 }),
  // v4 → v5: Relíquias e visuais do Cavaleiro.
  4: (raw) => ({ ...raw, relics: {}, skin: 'classic', schemaVersion: 5 }),
  // v5 → v6: a permissão de notificação deixou de ser pedida na 1ª abertura.
  // A preferência antiga é mantida; ao abrir, o jogo desliga se o Android não deu a permissão.
  5: (raw) => ({
    ...raw,
    settings: { ...raw.settings, notifAsked: Boolean(raw.settings?.notifications) },
    schemaVersion: 6,
  }),
};

export function migrate(raw: Raw): Raw {
  let v = Number(raw.schemaVersion ?? 1);
  while (v < SCHEMA_VERSION) {
    const fn = MIGRATIONS[v];
    if (!fn) throw new Error(`Sem migração para a versão ${v}`);
    raw = fn(raw);
    v = Number(raw.schemaVersion);
  }
  if (v > SCHEMA_VERSION) throw new Error(`Save de versão mais nova (${v})`);
  return raw;
}

/** Converte JSON em estado. Campos ausentes recebem o valor padrão. Lança erro se inválido. */
export function deserialize(json: string): GameState {
  const raw = migrate(JSON.parse(json));
  if (typeof raw !== 'object' || raw === null || typeof raw.stage !== 'number') {
    throw new Error('Save inválido');
  }
  const base = createInitialState(raw.firstPlayedAt ?? Date.now());
  const s: GameState = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    stats: { ...base.stats, ...raw.stats, totalGold: D(raw.stats?.totalGold ?? 0) },
    crystalUpgrades: { ...base.crystalUpgrades, ...raw.crystalUpgrades },
    abilityReadyAt: { ...base.abilityReadyAt, ...raw.abilityReadyAt },
    abilityActiveUntil: { ...base.abilityActiveUntil, ...raw.abilityActiveUntil },
    daily: { ...base.daily, ...raw.daily },
    story: { ...base.story, ...raw.story },
    tutorial: { ...base.tutorial, ...raw.tutorial },
    bestiary: { ...raw.bestiary },
    relics: { ...raw.relics },
    skin: raw.skin ?? 'classic',
    missions: raw.missions ?? base.missions,
    achievements: raw.achievements ?? {},
    guild: base.guild.map((_, i) => Number(raw.guild?.[i] ?? 0)),
    gold: D(raw.gold ?? 0),
    crystals: D(raw.crystals ?? 0),
    schemaVersion: SCHEMA_VERSION,
  };
  if (!Number.isFinite(s.stage) || s.stage < 1 || s.gold.mantissa !== s.gold.mantissa) {
    throw new Error('Save corrompido');
  }
  return s;
}

// ---------- Exportar / importar ----------

/** Checksum FNV-1a de 32 bits em hex. */
export function checksum(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const toBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

const fromBase64 = (b64: string): string => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function exportSave(s: GameState): string {
  const json = serialize(s);
  return `ITK1.${checksum(json)}.${toBase64(json)}`;
}

export function importSave(code: string): GameState {
  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'ITK1') throw new Error('Formato inválido');
  const json = fromBase64(parts[2]);
  if (checksum(json) !== parts[1]) throw new Error('Checksum inválido');
  return deserialize(json);
}

// ---------- Gerenciador ----------

export class SaveManager {
  constructor(private store: KeyValueStore) {}

  /** Grava o save atual, movendo o anterior para o backup. */
  async save(s: GameState): Promise<void> {
    const json = serialize(s);
    const previous = await this.store.get(SAVE_KEY);
    if (previous && previous !== json) {
      try {
        deserialize(previous);
        await this.store.set(BACKUP_KEY, previous);
      } catch {
        // Não sobrescreve um backup bom com um save corrompido.
      }
    }
    await this.store.set(SAVE_KEY, json);
  }

  /** Carrega o save; se estiver corrompido, restaura o backup. */
  async load(): Promise<{ state: GameState | null; restoredFromBackup: boolean }> {
    const main = await this.store.get(SAVE_KEY);
    if (main) {
      try {
        return { state: deserialize(main), restoredFromBackup: false };
      } catch (e) {
        console.warn('[save] save principal corrompido, tentando backup', e);
      }
    }
    const backup = await this.store.get(BACKUP_KEY);
    if (backup) {
      try {
        const state = deserialize(backup);
        await this.store.set(SAVE_KEY, backup);
        return { state, restoredFromBackup: true };
      } catch (e) {
        console.warn('[save] backup também corrompido', e);
      }
    }
    return { state: null, restoredFromBackup: false };
  }

  async wipe(): Promise<void> {
    await this.store.remove(SAVE_KEY);
    await this.store.remove(BACKUP_KEY);
  }
}

export class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async get(k: string) {
    return this.data.get(k) ?? null;
  }
  async set(k: string, v: string) {
    this.data.set(k, v);
  }
  async remove(k: string) {
    this.data.delete(k);
  }
}
