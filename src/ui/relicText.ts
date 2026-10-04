import type { RelicStat } from '../config/balance';
import { tk } from '../i18n';

/** Valores mostrados: porcentagens viram "10", segundos/horas ficam como estão. */
const ABSOLUTE: RelicStat[] = ['bossTime', 'offline'];

export function relicStatText(stat: RelicStat, value: number): string {
  const v = ABSOLUTE.includes(stat) ? value : value * 100;
  const shown = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');
  return tk(`relicStat.${stat}`, { v: shown });
}
