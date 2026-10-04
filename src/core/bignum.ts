import Decimal from 'break_infinity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;

export const D = (v: DecimalSource): Decimal => new Decimal(v);
export const ZERO = new Decimal(0);

/** Soma geométrica: custo de comprar `n` níveis a partir do nível `level`. */
export function bulkCost(baseCost: number, growth: number, level: number, n: number): Decimal {
  if (n <= 0) return ZERO;
  const first = D(baseCost).times(Decimal.pow(growth, level));
  return first.times(Decimal.pow(growth, n).minus(1)).div(growth - 1);
}

/** Quantos níveis dá para comprar com `money` (limitado a `cap`). */
export function maxAffordable(
  baseCost: number,
  growth: number,
  level: number,
  money: Decimal,
  cap = Infinity,
): number {
  const first = D(baseCost).times(Decimal.pow(growth, level));
  if (money.lt(first)) return 0;
  // n = floor(log_g(money*(g-1)/first + 1))
  const ratio = money.times(growth - 1).div(first).plus(1);
  let n = Math.floor(ratio.log10() / Math.log10(growth));
  n = Math.max(0, Math.min(n, cap));
  // Corrige erros de arredondamento.
  while (n > 0 && bulkCost(baseCost, growth, level, n).gt(money)) n--;
  while (n < cap && bulkCost(baseCost, growth, level, n + 1).lte(money)) n++;
  return n;
}
