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
import { STORY, currentStoryQuest } from '../src/core/story';

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

/** Missão atual pede uma compra de guilda ainda não feita? (o jogador guarda ouro para ela) */
function savingForQuest(g: Game): boolean {
  const quest = currentStoryQuest(g.state);
  return (quest.kind === 'hire' || quest.kind === 'member') && g.state.guild[quest.member ?? 0] < quest.target;
}

/** Compra o que a missão principal atual pede, se der. */
function questBuy(g: Game): void {
  const quest = currentStoryQuest(g.state);
  switch (quest.kind) {
    case 'hire':
    case 'member':
      if (g.state.guild[quest.member ?? 0] < quest.target) g.buyMember(quest.member ?? 0, 1);
      break;
    case 'blade':
      g.buyBlade(1);
      break;
    case 'arcane':
      g.buyArcane();
      break;
    case 'crystalShop':
      for (const u of BALANCE.crystalShop) if (g.buyCrystalUpgrade(u.id)) break;
      break;
  }
}

interface PlayerSim {
  g: Game;
  now: number;
  farmTimer: number;
  lastBuyAt: number;
  maxGap: number;
  /** Instante (ms de jogo) em que cada missão da Jornada foi coletada. */
  story: number[];
}

function newPlayer(): PlayerSim {
  const s = createInitialState(0);
  const g = new Game(s, { rng: Math.random });
  return { g, now: 0, farmTimer: 0, lastBuyAt: 0, maxGap: 0, story: [] };
}

function step(p: PlayerSim, tps: number, track: boolean): void {
  const g = p.g;
  p.now += DT * 1000;
  // Toques distribuídos uniformemente.
  const tapsThisStep = Math.floor((p.now / 1000) * tps) - Math.floor(((p.now - DT * 1000) / 1000) * tps);
  for (let i = 0; i < tapsThisStep; i++) g.tap(p.now);
  // Ponto Fraco a cada ~5 s; o jogador ativo acerta ~70%.
  if (tps > 0 && g.state.stage >= BALANCE.monsters.weakSpot.minStage && Math.floor(p.now / 5000) > Math.floor((p.now - DT * 1000) / 5000) && Math.random() < 0.7) {
    g.weakSpotHit(p.now);
  }
  g.update(DT, p.now);
  // Jornada do Rei: o jogador segue a missão (compra o que ela pede) e coleta assim que fica pronta.
  questBuy(g);
  while (g.claimStory(p.now)) p.story.push(p.now);
  // Baú do Mensageiro: aparece a cada ~4 min e o jogador toca nele.
  if (tps > 0 && Math.floor(p.now / 240_000) > Math.floor((p.now - DT * 1000) / 240_000)) {
    g.addGold(g.incomeReward(BALANCE.chest.incomeSeconds, p.now, BALANCE.chest.enemyKills));
    g.state.stats.chests++;
  }
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
    if (!savingForQuest(g)) greedyBuy(g, tps, p.now);
  }
}

/** Tempo médio para derrotar um inimigo comum (s) em faixas de fases, no modo ativo. */
function ttkReport(p: PlayerSim, ttk: Map<number, number[]>): void {
  const bands = [[1, 5], [6, 10], [11, 20], [21, 40]];
  const parts = bands.map(([a, b]) => {
    const v: number[] = [];
    for (let st = a; st <= b; st++) v.push(...(ttk.get(st) ?? []));
    const avg = v.length ? v.reduce((x, y) => x + y, 0) / v.length : NaN;
    return `fases ${a}-${b}: ${avg.toFixed(1)}s`;
  });
  console.log(`  tempo médio por inimigo — ${parts.join(' | ')}`);
  void p;
}

function activeRun(tps: number, minutes: number) {
  console.log(`\n=== Jogador ATIVO (${tps} toques/s, ${minutes} min) ===`);
  const p = newPlayer();
  const marks = [10, 20, 30, 40, 50, 60, 80, 100];
  const hit: Record<number, number> = {};
  let firstPrestigeAt = 0;
  // Mede o tempo entre o surgimento e a morte de cada inimigo comum.
  const ttk = new Map<number, number[]>();
  let spawnAt = 0;
  p.g.on((e) => {
    if (e.type === 'spawn') spawnAt = p.now;
    if (e.type === 'kill' && !e.boss) {
      const st = p.g.state.stage;
      ttk.set(st, [...(ttk.get(st) ?? []), (p.now - spawnAt) / 1000]);
    }
  });
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
  printStory(p);
  ttkReport(p, ttk);
  const early: number[] = [];
  for (let st = 1; st <= 10; st++) early.push(...(ttk.get(st) ?? []));
  const earlyTtk = early.reduce((a, b) => a + b, 0) / Math.max(1, early.length);
  return { hit, firstPrestigeAt, maxGap: p.maxGap, earlyTtk };
}

/** Jogador casual: 4 sessões de 10 min por dia, 2 toques/s, offline no resto do tempo. */
function casualRun(days: number) {
  console.log(`\n=== Jogador CASUAL (${days} dias, 4×10 min/dia, 2 toques/s) ===`);
  const p = newPlayer();
  const sessionMin = 10;
  const sessionsPerDay = 4;
  const gapMs = (24 * 60 * 60_000) / sessionsPerDay - sessionMin * 60_000;
  let stagnantSince = 0;
  /** Cristais obtidos com Renascer (gastos ou não). */
  let totalCrystals = 0;
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
          crystalsForPrestige(p.g.state.maxStage).gte(Math.max(5, totalCrystals))
        ) {
          const c = p.g.prestige(p.now);
          totalCrystals += c.toNumber();
          console.log(`  dia ${d + 1} sessão ${k + 1}: Renascer na fase ${lastMax} (+${c} cristais)`);
          lastMax = 0;
          stagnantSince = p.now;
          // Compra upgrades de dano/ouro que custem até 30% dos cristais.
          for (let i = 0; i < 40; i++) {
            const id = i % 2 ? 'gold' : 'damage';
            const cost = crystalUpgradeCost(id, p.g.state.crystalUpgrades[id]);
            if (cost.gt(p.g.state.crystals.times(0.3))) continue;
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
  printStory(p, true);
  return p.g.state.stats.highestStage;
}

/** Linha do tempo da Jornada do Rei. */
function printStory(p: PlayerSim, days = false): void {
  const label = (ms: number) => (days ? `dia ${Math.floor(ms / 86_400_000) + 1}` : formatTime(ms / 1000));
  const parts = p.story.map((ms, i) => `${i + 1}:${STORY[i] ? STORY[i].kind + STORY[i].target : 'inf'}@${label(ms)}`);
  console.log(`  Jornada (${p.story.length}/${STORY.length} coletadas): ${parts.join('  ')}`);
}

const tps = arg('tps', 5);
const a = activeRun(tps, arg('minutes', 120));
const casualBest = casualRun(arg('days', 3));

console.log('\n=== Metas ===');
const ok = (b: boolean) => (b ? 'OK ' : 'FORA');
const t10 = a.hit[10] ?? Infinity;
console.log(`  [${ok(a.earlyTtk >= 1.5 && a.earlyTtk <= 4)}] Inimigo das fases 1–10 dura 1,5–4 s: ${a.earlyTtk.toFixed(1)}s`);
console.log(`  [${ok(t10 >= 240 && t10 <= 420)}] Fase 10 em 4–7 min: ${formatTime(t10)}`);
console.log(
  `  [${ok(a.firstPrestigeAt >= 35 * 60 && a.firstPrestigeAt <= 60 * 60)}] Renascer (fase 40) em 35–60 min: ${formatTime(a.firstPrestigeAt)}`,
);
const c40 = crystalsForPrestige(40).toNumber();
const c50 = crystalsForPrestige(50).toNumber();
console.log(`  [${ok(c40 >= 5 && c40 <= 15)}] Cristais no 1º Renascer (fase 40–50): ${c40}–${c50}`);
console.log(`  [${ok(casualBest >= 80)}] Fase ~100 (80+) no 3º dia casual: ${casualBest}`);
console.log(`  [${ok(a.maxGap <= 330)}] Nunca > ~5 min sem nada para comprar (2 h): ${formatTime(a.maxGap)}`);
void D;
