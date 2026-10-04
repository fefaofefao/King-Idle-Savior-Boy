import { BALANCE } from '../config/balance';
import { D, Decimal } from './bignum';
import { incomePerSec, offlineCapSec } from './formulas';
import type { GameState } from './state';

export interface OfflineResult {
  seconds: number;
  cappedSeconds: number;
  gold: Decimal;
  /** O relógio do aparelho voltou para trás. */
  clockRewound: boolean;
}

/**
 * Calcula os ganhos offline desde `s.lastSeen`.
 * Ouro = renda/s do DPS atual × segundos (limitado) × taxa offline.
 * Não altera o estado; quem chama decide aplicar e atualizar `lastSeen`.
 */
export function computeOffline(s: GameState, now: number): OfflineResult {
  if (now < s.lastSeen) {
    return { seconds: 0, cappedSeconds: 0, gold: D(0), clockRewound: true };
  }
  const seconds = Math.floor((now - s.lastSeen) / 1000);
  const cappedSeconds = Math.min(seconds, offlineCapSec(s));
  // Buffs temporários não contam offline: usa a renda "base" no instante now=lastSeen
  // sem buffs de tempo limitado (ouro ×2 permanente do "remover anúncios" conta).
  const base = { ...s, adGoldBuffUntil: 0, abilityActiveUntil: { strike: 0, fury: 0, goldRain: 0 } };
  const gold = incomePerSec(base, s.lastSeen).times(cappedSeconds).times(BALANCE.offline.rate).floor();
  return { seconds, cappedSeconds, gold, clockRewound: false };
}

/** Aplica proteção de relógio: se voltou no tempo, apenas reajusta o timestamp. */
export function applyOffline(s: GameState, now: number): OfflineResult {
  const r = computeOffline(s, now);
  s.lastSeen = now;
  return r;
}
