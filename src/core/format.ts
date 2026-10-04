import { Decimal } from './bignum';
import type { Notation } from './state';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Sufixos depois de Dc: aa, ab, ac... */
function letterSuffix(tier: number): string {
  const n = tier - SUFFIXES.length;
  const a = String.fromCharCode(97 + Math.floor(n / 26) % 26);
  const b = String.fromCharCode(97 + (n % 26));
  return a + b;
}

export function formatNumber(value: Decimal | number, notation: Notation = 'short'): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (d.mantissa !== d.mantissa) return '0';
  const neg = d.lt(0);
  const abs = d.abs();
  if (abs.lt(1000)) {
    const n = abs.toNumber();
    const str = n < 10 && n % 1 !== 0 ? n.toFixed(1).replace(/\.0$/, '') : Math.floor(n).toString();
    return (neg ? '-' : '') + str;
  }
  const exp = abs.exponent;
  if (notation === 'scientific') {
    return (neg ? '-' : '') + abs.mantissa.toFixed(2) + 'e' + exp;
  }
  const tier = Math.floor(exp / 3);
  const scaled = abs.mantissa * Math.pow(10, exp - tier * 3);
  const suffix = tier < SUFFIXES.length ? SUFFIXES[tier] : letterSuffix(tier);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  // toFixed pode arredondar para 1000 (ex.: 999.99 → "1000"); aceitável visualmente.
  return (neg ? '-' : '') + scaled.toFixed(digits) + suffix;
}

export function formatTime(sec: number): string {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return `${s}s`;
}
