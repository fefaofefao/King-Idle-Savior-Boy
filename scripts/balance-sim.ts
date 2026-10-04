/**
 * Simulador de balanceamento.
 *   npm run sim                  → modo ativo (2 h) + casual (3 dias)
 *   npm run sim -- --tps=4       → toques por segundo do jogador ativo
 *
 * Estratégia: compra gananciosa do upgrade com maior ganho de dano efetivo por ouro,
 * usa habilidades assim que ficam prontas e tenta o chefe de novo depois de 20 s farmando.
 */
import { BALANCE } from '../src/config/balance';
import { D, Decimal } from '../src/core/bignum';
import { Game } from '../src/core/game';
import {
  arcaneCost,
  bladeCost,
  bladeDamage,
  critChance,
  crystalUpgradeCost,
  crystalsForPrestige,
  globalDamageMult,
  mageUnlocked,
  memberCost,
  memberDps,
  memberUnlocked,
  tapDamage,
  totalDps,
} from '../src/core/formulas';
import { formatNumber, formatTime } from '../src/core/format';
import { applyOffline } from '../src/core/offline';
import { createInitialState } from '../src/core/state';
import { ABILITY_IDS } from '../src/config/balance';

const arg = (name: string, def: number) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : def;
};

const DT = 0.1;

// Sobrescreve constantes para experimentos: --set=enemy.hpGrowth=1.2,prestige.divisor=3
for (const a of process.argv.filter((x) => x.startsWith('--set='))) {
  for (const pair of a.slice(6).split(',')) {
    const [path, val] = pair.split('=');
    const keys = path.split('.');
    let obj: any = BALANCE;
    for (const k of keys.slice(0, -1)) obj = obj[k];
    obj[keys[keys.length - 1]] = Number(val);
    console.log(`override ${path} = ${val}`);
  }
}

interface Candidate {
  gain: Decimal;
  cost: Decimal;
  buy: () => boolean;
}

function candidates(g: Game, tps: number, now: number): Candidate[] {
  const s = g.state;
  const gm = globalDamageMult(s);
  const critF = 1 + critChance(s) * (BALANCE.crit.mult - 1);
  const mageF = mageUnlocked(s) ? 1 + BALANCE.mage.dpsShare : 1;
  const out: Candidate[] = [];
  out.push({
    gain: bladeDamage(s.bladeLevel + 1).minus(bladeDamage(s.bladeLevel)).times(gm).times(tps * critF),
    cost: bladeCost(s.bladeLevel),
    buy: () => g.buyBlade(1),
  });
  s.guild.forEach((lvl, i) => {
    if (!memberUnlocked(s, i)) return;
    out.push({
      gain: memberDps(i, lvl + 1).minus(memberDps(i, lvl)).times(gm).times(mageF),
      cost: memberCost(i, lvl),
      buy: () => g.buyMember(i, 1),
    });
  });
  if (g.arcaneUnlocked() && s.arcaneLevel < BALANCE.arcane.maxLevel && tps > 0) {
    out.push({
      gain: totalDps(s).times(BALANCE.arcane.dpsSharePerLevel * tps * critF),
      cost: arcaneCost(s.arcaneLevel),
      buy: () => g.buyArcane(),
    });
  }
  void now;
  return out;
}

/** Compra o melhor upgrade enquanto der. Retorna quantas compras fez. */
function greedyBuy(g: Game, tps: number, now: number): number {
  let bought = 0;
  for (let guard = 0; guard < 500; guard++) {
    const c = candidates(g, tps, now).filter((x) => x.gain.gt(0));
    if (!c.length) break;
    c.sort((a, b) => b.gain.div(b.cost).cmp(a.gain.div(a.cost)));
    const best = c[0];
    // Se o melhor ainda não é acessível, espera por ele (não gasta no segundo melhor
    // a não ser que este custe < 10% do melhor).
    const affordable = c.find((x) => g.state.gold.gte(x.cost));
    if (!affordable) break;
    if (affordable !== best && affordable.cost.gt(best.cost.times(0.1))) break;
    if (!affordable.buy()) break;
    bought++;
  }
  return bought;
}

interface PlayerSim {
  g: Game;
  now: number;
  farmTimer: number;
  lastBuyAt: number;
  maxGap: number;
}

function newPlayer(): PlayerSim {
  const s = createInitialState(0);
  const g = new Game(s, { rng: Math.random });
  return { g, now: 0, farmTimer: 0, lastBuyAt: 0, maxGap: 0 };
}

function step(p: PlayerSim, tps: number, track: boolean): void {
  const g = p.g;
  p.now += DT * 1000;
  // Toques distribuídos uniformemente.
  const tapsThisStep = Math.floor((p.now / 1000) * tps) - Math.floor(((p.now - DT * 1000) / 1000) * tps);
  for (let i = 0; i < tapsThisStep; i++) g.tap(p.now);
  g.update(DT, p.now);
  for (const id of ABILITY_IDS) if (tps > 0) g.useAbility(id, p.now);
  if (g.state.farming) {
    p.farmTimer += DT;
    if (p.farmTimer > 20) {
      p.farmTimer = 0;
      g.fightBoss();
    }
  }
  if (Math.round(p.now / 100) % 10 === 0) {
    // Métrica da meta: tempo máximo sem NENHUM upgrade acessível.
    if (track) {
      const anyAffordable = candidates(g, tps, p.now).some((c) => g.state.gold.gte(c.cost));
      if (anyAffordable) p.lastBuyAt = p.now;
      else p.maxGap = Math.max(p.maxGap, (p.now - p.lastBuyAt) / 1000);
    }
    greedyBuy(g, tps, p.now);
  }
}

function activeRun(tps: number, minutes: number) {
  console.log(`\n=== Jogador ATIVO (${tps} toques/s, ${minutes} min) ===`);
  const p = newPlayer();
  const marks = [10, 20, 30, 40, 50, 60, 80, 100];
  const hit: Record<number, number> = {};
  let firstPrestigeAt = 0;
  while (p.now < minutes * 60_000) {
    step(p, tps, p.now < 2 * 3600_000);
    for (const m of marks) if (!hit[m] && p.g.state.maxStage >= m) hit[m] = p.now / 1000;
    if (!firstPrestigeAt && p.g.canPrestige()) firstPrestigeAt = p.now / 1000;
  }
  for (const m of marks) console.log(`  fase ${String(m).padStart(3)}: ${hit[m] ? formatTime(hit[m]) : '—'}`);
  console.log(`  Renascer disponível em: ${firstPrestigeAt ? formatTime(firstPrestigeAt) : '—'}`);
  const s = p.g.state;
  console.log(
    `  final: fase ${s.maxStage}, DPS ${formatNumber(totalDps(s))}, toque ${formatNumber(tapDamage(s, p.now))}, ` +
      `lâmina ${s.bladeLevel}, guilda [${s.guild.join(',')}], arcano ${s.arcaneLevel}`,
  );
  console.log(`  cristais se renascer agora: ${crystalsForPrestige(s.maxStage)}`);
  console.log(`  maior intervalo sem nada para comprar (primeiras 2 h): ${formatTime(p.maxGap)}`);
  return { hit, firstPrestigeAt, maxGap: p.maxGap };
}

/** Jogador casual: 4 sessões de 10 min por dia, 2 toques/s, offline no resto do tempo. */
function casualRun(days: number) {
  console.log(`\n=== Jogador CASUAL (${days} dias, 4×10 min/dia, 2 toques/s) ===`);
  const p = newPlayer();
  const sessionMin = 10;
  const sessionsPerDay = 4;
  const gapMs = (24 * 60 * 60_000) / sessionsPerDay - sessionMin * 60_000;
  let stagnantSince = 0;
  let lastMax = 0;
  for (let d = 0; d < days; d++) {
    for (let k = 0; k < sessionsPerDay; k++) {
      const end = p.now + sessionMin * 60_000;
      while (p.now < end) {
        step(p, 2, false);
        if (p.g.state.maxStage > lastMax) {
          lastMax = p.g.state.maxStage;
          stagnantSince = p.now;
        }
        // Renasce quando trava por 5 min de jogo ativo e o ganho é razoável.
        if (
          p.g.canPrestige() &&
          p.now - stagnantSince > 5 * 60_000 &&
          crystalsForPrestige(p.g.state.maxStage).gte(p.g.state.crystals.max(5))
        ) {
          const c = p.g.prestige(p.now);
          console.log(`  dia ${d + 1} sessão ${k + 1}: Renascer na fase ${lastMax} (+${c} cristais)`);
          lastMax = 0;
          stagnantSince = p.now;
          // Compra upgrades de dano/ouro que custem até 15% dos cristais.
          for (let i = 0; i < 40; i++) {
            const id = i % 2 ? 'gold' : 'damage';
            const cost = crystalUpgradeCost(id, p.g.state.crystalUpgrades[id]);
            if (cost.gt(p.g.state.crystals.times(0.15))) continue;
            p.g.buyCrystalUpgrade(id);
          }
        }
      }
      p.g.state.lastSeen = p.now;
      p.now += gapMs;
      const off = applyOffline(p.g.state, p.now);
      p.g.addGold(off.gold);
      greedyBuy(p.g, 2, p.now);
    }
    console.log(
      `  fim do dia ${d + 1}: fase máx. da run ${p.g.state.maxStage}, recorde ${p.g.state.stats.highestStage}, ` +
        `cristais ${p.g.state.crystals}, renascimentos ${p.g.state.stats.prestiges}`,
    );
  }
  return p.g.state.stats.highestStage;
}

const tps = arg('tps', 3);
const a = activeRun(tps, arg('minutes', 120));
const casualBest = casualRun(arg('days', 3));

console.log('\n=== Metas ===');
const ok = (b: boolean) => (b ? 'OK ' : 'FORA');
const t10 = a.hit[10] ?? Infinity;
console.log(`  [${ok(t10 >= 120 && t10 <= 240)}] Fase 10 em 2–4 min: ${formatTime(t10)}`);
console.log(
  `  [${ok(a.firstPrestigeAt >= 35 * 60 && a.firstPrestigeAt <= 60 * 60)}] Renascer (fase 40) em 35–60 min: ${formatTime(a.firstPrestigeAt)}`,
);
const c40 = crystalsForPrestige(40).toNumber();
const c50 = crystalsForPrestige(50).toNumber();
console.log(`  [${ok(c40 >= 5 && c40 <= 15)}] Cristais no 1º Renascer (fase 40–50): ${c40}–${c50}`);
console.log(`  [${ok(casualBest >= 90)}] Fase ~100 no 3º dia casual: ${casualBest}`);
console.log(`  [${ok(a.maxGap <= 330)}] Nunca > ~5 min sem nada para comprar (2 h): ${formatTime(a.maxGap)}`);
void D;
