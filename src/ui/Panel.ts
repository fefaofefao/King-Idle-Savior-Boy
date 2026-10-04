import type { App } from '../App';
import { sfx } from '../audio/Sfx';
import { FEATURES } from '../config/app';
import { BALANCE, MONSTER_IDS, type CrystalUpgradeId, type SkinId } from '../config/balance';
import { formatNumber, formatTime } from '../core/format';
import type { Decimal } from '../core/bignum';
import {
  arcaneCost,
  bestiaryGoldMult,
  bestiaryStars,
  bladeDamage,
  crystalUpgradeCost,
  crystalUpgradeMaxed,
  crystalsForPrestige,
  globalDamageMult,
  guildDps,
  memberDps,
  memberMilestoneMult,
  memberUnlocked,
  prestigeDamageGain,
  relicCount,
  skinProgress,
  skinUnlocked,
  tapDamage,
} from '../core/formulas';
import { relicStatText } from './relicText';
import type { BuyAmount } from '../core/game';
import { ACHIEVEMENTS, canClaimDaily, missionDef } from '../core/retention';
import { STORY, currentStoryQuest, storyComplete, storyProgress } from '../core/story';
import { chapterTitle, storyText } from './storyText';
import type { Notation } from '../core/state';
import { LANGUAGES, t, tk } from '../i18n';
import { h, setDisabled, setText, toggleClass } from './dom';
import { openExternal } from '../platform/platform';
import { FLAGS, ICONS, MEMBER_ICONS, MONSTER_ICONS, RELIC_ICONS, skinIcon } from './icons';

/** URL pública da política de privacidade (GitHub Pages). Ajuste após publicar — veja SETUP_CONTAS.md. */
export const SITE_URL = 'https://fefaofefao.github.io/King-Idle-Savior-Boy/';
export const PRIVACY_URL = `${SITE_URL}privacy-policy/`;
export const TERMS_URL = `${SITE_URL}terms/`;
/** Âncora da página no idioma do jogo (#pt, #en, #es). */
const langAnchor = (lang: string) => `#${lang.slice(0, 2)}`;

const COLLAPSE_KEY = 'kisb.panelCollapsed';
function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

type TabId = 'hero' | 'guild' | 'prestige' | 'quests' | 'menu';
const TABS: TabId[] = ['hero', 'guild', 'prestige', 'quests', 'menu'];

interface Row {
  el: HTMLElement;
  title: HTMLElement;
  desc: HTMLElement;
  level: HTMLElement;
  btn: HTMLButtonElement;
  btnLabel: HTMLElement;
  btnCost: HTMLElement;
}

/**
 * Botão de compra com "segurar para comprar": um toque compra 1 vez; segurando, repete
 * cada vez mais rápido enquanto houver ouro. Cada compra dá um "pop" no botão.
 */
export function holdToBuy(btn: HTMLButtonElement, onBuy: () => void): void {
  let timer = 0;
  let held = false;
  let interval = 260;
  const pop = () => {
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
  };
  const fire = () => {
    if (btn.disabled) return stop();
    onBuy();
    pop();
    held = true;
    interval = Math.max(70, interval * 0.82);
    timer = window.setTimeout(fire, interval);
  };
  const stop = () => {
    clearTimeout(timer);
    timer = 0;
    interval = 260;
  };
  btn.addEventListener('pointerdown', () => {
    stop();
    held = false;
    timer = window.setTimeout(fire, 420);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
  btn.addEventListener('click', () => {
    // Depois de segurar, o "click" final não compra de novo.
    if (held) {
      held = false;
      return;
    }
    if (btn.disabled) return;
    onBuy();
    pop();
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** Preenche o botão de compra com o quanto do custo você já tem (mostra que falta pouco). */
function afford(btn: HTMLElement, have: Decimal, cost: Decimal): void {
  const f = cost.lte(0) ? 1 : Math.max(0, Math.min(1, have.div(cost).toNumber()));
  const v = (Math.round(f * 50) / 50).toString();
  if (btn.style.getPropertyValue('--afford') !== v) btn.style.setProperty('--afford', v);
}

function row(icon: string, onBuy: () => void, extraClass = ''): Row {
  const title = h('div', { class: 'row-title' });
  const desc = h('div', { class: 'row-desc' });
  const level = h('span', { class: 'row-level' });
  const btnLabel = h('span', { class: 'btn-label' });
  const btnCost = h('span', { class: 'btn-cost' });
  const btn = h('button', { class: 'btn buy' }, [btnLabel, btnCost]);
  holdToBuy(btn, onBuy);
  const el = h('div', { class: `row ${extraClass}` }, [
    h('div', { class: 'row-icon', html: icon }),
    h('div', { class: 'row-main' }, [h('div', { class: 'row-head' }, [title, level]), desc]),
    btn,
  ]);
  return { el, title, desc, level, btn, btnLabel, btnCost };
}

export class Panel {
  private active: TabId = 'hero';
  private content!: HTMLElement;
  private tabButtons: Partial<Record<TabId, HTMLButtonElement>> = {};
  private updaters: (() => void)[] = [];
  private lastFull = 0;

  constructor(
    private app: App,
    private root: HTMLElement,
  ) {
    this.build();
  }

  build(): void {
    this.root.innerHTML = '';
    this.content = h('div', { class: 'tab-content' });
    const nav = h('nav', { class: 'tabs' });
    for (const id of TABS) {
      const b = h(
        'button',
        { class: 'tab', onClick: () => this.onTab(id) },
        [h('span', { class: 'ico', html: ICONS[id] }), h('span', { class: 'tab-label', text: t(`tab.${id}`) }), h('i', { class: 'badge' })],
      );
      this.tabButtons[id] = b;
      nav.appendChild(b);
    }
    // Alça no topo do painel: recolhe/expande (o jogo ocupa a tela toda quando recolhido).
    this.handle = h('button', { class: 'panel-handle', 'aria-label': t('panel.toggle'), onClick: () => this.setCollapsed(!this.collapsed) }, [
      h('i', { class: 'chev' }),
    ]);
    this.root.append(this.handle, this.content, nav);
    this.enableSwipe();
    this.setCollapsed(this.collapsed, false);
    this.renderTab();
  }

  // ---------------- Recolher ----------------

  collapsed = loadCollapsed();
  private handle!: HTMLButtonElement;

  setCollapsed(on: boolean, sound = true): void {
    this.collapsed = on;
    toggleClass(this.root, 'collapsed', on);
    for (const id of TABS) toggleClass(this.tabButtons[id]!, 'active', !on && id === this.active);
    if (sound) sfx.play('tap');
    try {
      localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0');
    } catch {
      /* armazenamento indisponível: só não lembra a escolha */
    }
  }

  /** Toque numa aba: recolhido → abre nela; aba atual → recolhe; outra → troca. */
  private onTab(id: TabId): void {
    if (this.collapsed) {
      this.setCollapsed(false);
      if (this.active !== id) {
        this.active = id;
        this.renderTab();
      }
      return;
    }
    if (this.active === id) return this.setCollapsed(true);
    this.select(id);
  }

  /** Deslizar o dedo para os lados troca de aba. */
  private enableSwipe(): void {
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    this.content.addEventListener('pointerdown', (e) => {
      x0 = e.clientX;
      y0 = e.clientY;
      t0 = performance.now();
    });
    this.content.addEventListener('pointerup', (e) => {
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (performance.now() - t0 > 600 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      if ((e.target as HTMLElement).closest('input, .vol')) return;
      const i = TABS.indexOf(this.active) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < TABS.length) this.select(TABS[i]);
    });
  }

  select(id: TabId): void {
    if (this.collapsed) this.setCollapsed(false, false);
    if (this.active === id) return;
    this.active = id;
    sfx.play('tap');
    this.renderTab();
  }

  private renderTab(): void {
    for (const id of TABS) toggleClass(this.tabButtons[id]!, 'active', !this.collapsed && id === this.active);
    this.content.innerHTML = '';
    this.content.scrollTop = 0;
    this.updaters = [];
    const builders: Record<TabId, () => void> = {
      hero: () => this.buildHero(),
      guild: () => this.buildGuild(),
      prestige: () => this.buildPrestige(),
      quests: () => this.buildQuests(),
      menu: () => this.buildMenu(),
    };
    builders[this.active]();
    this.content.classList.remove('enter');
    void this.content.offsetWidth;
    this.content.classList.add('enter');
    this.update(true);
  }

  /** Chamado ~10x/s pelo App; atualiza só a aba visível. */
  update(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastFull < 200) return;
    this.lastFull = now;
    if (!this.collapsed) for (const u of this.updaters) u();
    this.updateBadges();
  }

  private updateBadges(): void {
    const s = this.app.state;
    const now = Date.now();
    const questReady =
      storyComplete(s) ||
      canClaimDaily(s, now) ||
      s.missions.list.some((m) => !m.claimed && m.progress >= m.target) ||
      Object.values(s.achievements).includes('done');
    toggleClass(this.tabButtons.quests!, 'has-badge', questReady);
    // Renascer: bolinha só quando vale a pena (dano pelo menos ×2).
    toggleClass(this.tabButtons.prestige!, 'has-badge', this.app.game.canPrestige() && prestigeDamageGain(s).gte(2));
    // Algo para comprar? Bolinha verde nas abas Herói/Guilda.
    const g = this.app.game;
    const heroBuy = s.gold.gte(g.bladeBuyInfo(1).cost);
    const guildBuy = BALANCE.guild.members.some((_, i) => memberUnlocked(s, i) && s.gold.gte(g.memberBuyInfo(i, 1).cost));
    toggleClass(this.tabButtons.hero!, 'can-buy', heroBuy);
    toggleClass(this.tabButtons.guild!, 'can-buy', guildBuy);
  }

  private amountSelector(): HTMLElement {
    const opts: BuyAmount[] = [1, 10, 25, 'max'];
    const wrap = h('div', { class: 'amount-sel' });
    const buttons = opts.map((a) => {
      const b = h('button', {
        class: 'chip',
        text: a === 'max' ? t('hero.max') : `×${a}`,
        onClick: () => {
          this.app.buyAmount = a;
          refresh();
          this.update(true);
        },
      });
      wrap.appendChild(b);
      return b;
    });
    const refresh = () => buttons.forEach((b, i) => toggleClass(b, 'active', opts[i] === this.app.buyAmount));
    refresh();
    return wrap;
  }

  // ---------------- Herói ----------------

  private buildHero(): void {
    const app = this.app;
    const g = app.game;
    this.content.appendChild(this.amountSelector());

    const blade = row(ICONS.blade, () => g.buyBlade(app.buyAmount));
    const arcane = row(ICONS.arcane, () => g.buyArcane(), 'arcane');
    this.content.append(blade.el, arcane.el);

    this.updaters.push(() => {
      const s = g.state;
      const n = s.settings.notation;
      const now = Date.now();
      setText(blade.title, t('hero.blade'));
      setText(blade.level, t('hero.level', { n: s.bladeLevel }));
      const next = BALANCE.blade.milestones.find((m) => m > s.bladeLevel);
      setText(
        blade.desc,
        t('hero.bladeDesc', { dmg: formatNumber(tapDamage(s, now), n) }) +
          (next ? ` · ${t('hero.nextMilestone', { n: next, m: BALANCE.blade.milestoneMult })}` : ''),
      );
      const info = g.bladeBuyInfo(app.buyAmount);
      // Mostra quanto o toque vai ganhar com a compra.
      const gain = bladeDamage(s.bladeLevel + info.n).minus(bladeDamage(s.bladeLevel)).times(globalDamageMult(s));
      setText(blade.btnLabel, `+${info.n} · ${t('hero.gain', { n: formatNumber(gain, n) })}`);
      setText(blade.btnCost, formatNumber(info.cost, n));
      setDisabled(blade.btn, s.gold.lt(info.cost));
      afford(blade.btn, s.gold, info.cost);

      setText(arcane.title, t('hero.arcane'));
      setText(arcane.level, `${s.arcaneLevel}/${BALANCE.arcane.maxLevel}`);
      const unlocked = g.arcaneUnlocked();
      toggleClass(arcane.el, 'locked', !unlocked);
      if (!unlocked) {
        setText(arcane.desc, t('hero.arcaneLocked', { n: BALANCE.arcane.unlockStage }));
        setText(arcane.btnLabel, '');
        setText(arcane.btnCost, '🔒');
        setDisabled(arcane.btn, true);
      } else if (s.arcaneLevel >= BALANCE.arcane.maxLevel) {
        setText(arcane.desc, t('hero.arcaneDesc', { pct: s.arcaneLevel }));
        setText(arcane.btnLabel, t('hero.max'));
        setText(arcane.btnCost, '');
        setDisabled(arcane.btn, true);
      } else {
        setText(arcane.desc, t('hero.arcaneDesc', { pct: s.arcaneLevel + 1 }));
        const cost = arcaneCost(s.arcaneLevel);
        setText(arcane.btnLabel, '+1');
        setText(arcane.btnCost, formatNumber(cost, n));
        setDisabled(arcane.btn, s.gold.lt(cost));
        afford(arcane.btn, s.gold, cost);
      }
    });
    this.buildSkins();
    this.buildRelics();
  }

  /** Visuais do herói: grade com cadeado/progresso; tocar num liberado equipa. */
  private buildSkins(): void {
    const app = this.app;
    this.content.appendChild(h('h3', { html: `${ICONS.hero}<span>${t('skins.title')}</span>` }));
    const note = h('p', { class: 'section-note' });
    const grid = h('div', { class: 'card-grid skins' });
    this.content.append(note, grid);
    const cards = BALANCE.skins.list.map((sk) => {
      const name = h('div', { class: 'card-name' });
      const sub = h('div', { class: 'card-sub' });
      const icon = h('div', { class: 'card-icon', html: skinIcon(sk.id === 'classic' ? '#c9d2de' : sk.tint, sk.emissive === '#000000' ? '#3a4a6a' : sk.emissive) });
      const el = h('button', { class: 'card skin-card', onClick: () => app.setSkin(sk.id as SkinId) }, [icon, name, sub]);
      grid.appendChild(el);
      return { sk, el, name, sub };
    });
    this.updaters.push(() => {
      const s = app.state;
      const owned = cards.filter((c) => skinUnlocked(s, c.sk.id as SkinId)).length;
      setText(note, `${t('skins.desc')} (${owned}/${cards.length})`);
      for (const c of cards) {
        const open = skinUnlocked(s, c.sk.id as SkinId);
        const using = s.skin === c.sk.id;
        setText(c.name, tk(`skin.${c.sk.id}`));
        if (using) setText(c.sub, t('skins.equipped'));
        else if (open) setText(c.sub, t('skins.equip'));
        else if (c.sk.unlock) {
          const have = Math.min(skinProgress(s, c.sk.unlock.kind), c.sk.unlock.n);
          setText(c.sub, `${tk(`skinLock.${c.sk.unlock.kind}`, { n: c.sk.unlock.n })} · ${have}/${c.sk.unlock.n}`);
        }
        toggleClass(c.el, 'locked', !open);
        toggleClass(c.el, 'active', using);
        c.el.disabled = !open || using;
      }
    });
  }

  /** Coleção de relíquias (caem dos chefes; permanentes). */
  private buildRelics(): void {
    const app = this.app;
    const R = BALANCE.relics;
    this.content.appendChild(h('h3', { html: `${RELIC_ICONS.crown}<span>${t('relics.title')}</span>` }));
    const note = h('p', { class: 'section-note' });
    const grid = h('div', { class: 'card-grid relics' });
    this.content.append(note, grid);
    const cards = R.list.map((r) => {
      const name = h('div', { class: 'card-name' });
      const sub = h('div', { class: 'card-sub' });
      const lvl = h('span', { class: 'card-level' });
      const el = h('div', { class: 'card relic-card' }, [h('div', { class: 'card-icon', html: RELIC_ICONS[r.id] }), lvl, name, sub]);
      grid.appendChild(el);
      return { r, el, name, sub, lvl };
    });
    this.updaters.push(() => {
      const s = app.state;
      setText(note, `${t('relics.desc')} ${t('relics.count', { n: relicCount(s), max: R.list.length })}`);
      for (const c of cards) {
        const level = s.relics[c.r.id] ?? 0;
        setText(c.name, level > 0 ? tk(`relic.${c.r.id}`) : t('relics.unknown'));
        setText(c.sub, relicStatText(c.r.stat, c.r.perLevel * Math.max(1, level)));
        setText(c.lvl, level > 0 ? t('relics.level', { n: level, max: R.maxLevel }) : '');
        toggleClass(c.el, 'locked', level === 0);
        toggleClass(c.el, 'maxed', level >= R.maxLevel);
      }
    });
  }

  // ---------------- Guilda ----------------

  private buildGuild(): void {
    const app = this.app;
    const g = app.game;
    this.content.appendChild(this.amountSelector());
    const total = h('div', { class: 'section-note' });
    const mageRow = h('div', { class: 'mage-row' }, [h('span', { class: 'ico', html: ICONS.mage }), h('span')]);
    this.content.append(total, mageRow);
    const rows = BALANCE.guild.members.map((m, i) => {
      const r = row(MEMBER_ICONS[m.id], () => g.buyMember(i, app.buyAmount), 'member');
      r.el.appendChild(h('span', { class: 'best-tag', text: t('ux.best') }));
      this.content.appendChild(r.el);
      return r;
    });
    this.updaters.push(() => {
      const s = g.state;
      const n = s.settings.notation;
      setText(total, t('guild.dps', { dps: formatNumber(guildDps(s), n) }));
      const mageText = mageRow.lastChild as HTMLElement;
      const mageOn = s.maxStage >= BALANCE.mage.unlockStage;
      setText(
        mageText,
        mageOn
          ? t('guild.mageActive', { pct: Math.round(BALANCE.mage.dpsShare * 100) })
          : t('guild.mage', { n: BALANCE.mage.unlockStage }),
      );
      toggleClass(mageRow, 'locked', !mageOn);
      const gm = globalDamageMult(s);
      // Melhor compra: maior ganho de DPS por ouro entre os membros liberados.
      let best = -1;
      let bestRatio = 0;
      BALANCE.guild.members.forEach((_, i) => {
        if (!memberUnlocked(s, i)) return;
        const info = g.memberBuyInfo(i, app.buyAmount);
        if (info.n <= 0 || info.cost.lte(0)) return;
        const ratio = memberDps(i, s.guild[i] + info.n).minus(memberDps(i, s.guild[i])).div(info.cost).toNumber();
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = i;
        }
      });
      BALANCE.guild.members.forEach((m, i) => {
        toggleClass(rows[i].el, 'best', i === best);
        const r = rows[i];
        const lvl = s.guild[i];
        const unlocked = memberUnlocked(s, i);
        toggleClass(r.el, 'locked', !unlocked);
        toggleClass(r.el, 'hidden', !unlocked && i > 0 && !memberUnlocked(s, i - 1));
        setText(r.title, tk(`member.${m.id}`));
        setText(r.level, lvl > 0 ? t('hero.level', { n: lvl }) : '');
        const nextMs = BALANCE.guild.milestones.find((ms) => ms.level > lvl);
        setText(
          r.desc,
          unlocked
            ? t('guild.dps', { dps: formatNumber(memberDps(i, Math.max(lvl, 1)).times(gm).times(lvl > 0 ? 1 : 1), n) }) +
                (lvl === 0 ? '' : ` · ×${memberMilestoneMult(lvl)}`) +
                (nextMs ? ` · ${t('hero.nextMilestone', { n: nextMs.level, m: nextMs.mult })}` : '')
            : t('guild.locked'),
        );
        const info = g.memberBuyInfo(i, app.buyAmount);
        const dpsGain = memberDps(i, lvl + info.n).minus(memberDps(i, lvl)).times(gm);
        setText(r.btnLabel, `${lvl === 0 ? t('guild.hire') : `+${info.n}`} · ${t('guild.dpsGain', { n: formatNumber(dpsGain, n) })}`);
        setText(r.btnCost, formatNumber(info.cost, n));
        setDisabled(r.btn, !unlocked || s.gold.lt(info.cost));
        afford(r.btn, unlocked ? s.gold : s.gold.times(0), info.cost);
      });
    });
  }

  // ---------------- Renascer ----------------

  private buildPrestige(): void {
    const app = this.app;
    const g = app.game;
    const crystals = h('div', { class: 'crystal-count' });
    const desc = h('p', { class: 'section-note', text: t('prestige.desc') });
    const locked = h('p', { class: 'section-note warn' });
    const gain = h('div', { class: 'prestige-gain' });
    const advice = h('p', { class: 'prestige-advice' });
    const btn = h('button', { class: 'btn primary big prestige-btn', onClick: () => void app.prestige() });
    const box = h('div', { class: 'prestige-box' }, [crystals, desc, gain, advice, locked, btn]);
    this.content.append(box);
    this.content.appendChild(h('h3', { text: t('prestige.shop') }));
    const rows = BALANCE.crystalShop.map((u) => {
      const r = row(ICONS.crystal, () => g.buyCrystalUpgrade(u.id as CrystalUpgradeId), 'crystal-row');
      this.content.appendChild(r.el);
      return { r, id: u.id as CrystalUpgradeId };
    });
    this.updaters.push(() => {
      const s = g.state;
      const n = s.settings.notation;
      setText(crystals.querySelector('span') ?? crystals, '');
      crystals.innerHTML = `${ICONS.crystal}<span>${t('prestige.crystals', { n: formatNumber(s.crystals, n) })}</span>`;
      const can = g.canPrestige();
      setText(locked, can ? '' : t('prestige.locked', { n: BALANCE.prestige.minStage }));
      setText(btn, t('prestige.button', { n: formatNumber(crystalsForPrestige(s.maxStage, s), n) }));
      setDisabled(btn, !can);
      const mult = can ? prestigeDamageGain(s).toNumber() : 1;
      setText(gain, can ? t('prestige.gain', { x: mult >= 100 ? formatNumber(mult) : mult.toFixed(2) }) : '');
      // Recomendação: renascer agora pelo menos dobra o dano.
      const worth = can && mult >= 2;
      let nextStage = s.maxStage + 1;
      const cur = crystalsForPrestige(s.maxStage, s);
      while (can && nextStage < s.maxStage + 200 && crystalsForPrestige(nextStage, s).lte(cur)) nextStage++;
      setText(advice, !can ? '' : worth ? t('prestige.recommend') : `${t('prestige.notYet')} ${t('prestige.next', { n: nextStage })}`);
      toggleClass(box, 'worth', worth);
      toggleClass(btn, 'glow', worth);
      for (const { r, id } of rows) {
        const lvl = s.crystalUpgrades[id] ?? 0;
        const maxed = crystalUpgradeMaxed(id, lvl);
        const cost = crystalUpgradeCost(id, lvl);
        setText(r.title, tk(`crystal.${id}`));
        const max = BALANCE.crystalShop.find((x) => x.id === id)!.maxLevel;
        setText(r.level, max ? `${lvl}/${max}` : t('hero.level', { n: lvl }));
        const u = BALANCE.crystalShop.find((x) => x.id === id)!;
        const total = lvl * u.perLevel;
        const shown =
          id === 'bossTime' ? `+${total} s` : id === 'offline' ? `+${total} h` : `${id === 'cooldown' ? '−' : '+'}${Math.round(total * 100)}%`;
        setText(r.desc, lvl > 0 ? t('crystal.current', { v: shown }) : '');
        setText(r.btnLabel, maxed ? t('hero.max') : '+1');
        const costHtml = maxed ? '' : `${ICONS.crystal}${formatNumber(cost, n)}`;
        if (r.btnCost.innerHTML !== costHtml) r.btnCost.innerHTML = costHtml;
        setDisabled(r.btn, maxed || s.crystals.lt(cost));
        afford(r.btn, maxed ? s.crystals.times(0) : s.crystals, cost);
      }
    });
  }

  // ---------------- Missões & Conquistas ----------------

  private buildQuests(): void {
    const app = this.app;
    const s = app.state;
    // Coletar tudo: missões + conquistas prontas, com um toque.
    const claimAll = h('button', {
      class: 'btn primary claim-all glow',
      onClick: () => {
        const st = app.state;
        st.missions.list.forEach((m, i) => {
          if (!m.claimed && m.progress >= m.target) app.claimMission(i);
        });
        for (const a of ACHIEVEMENTS) if (st.achievements[a.id] === 'done') app.claimAchievement(a.id);
        this.update(true);
      },
    });
    this.content.appendChild(claimAll);
    this.updaters.push(() => {
      const st = app.state;
      const n =
        st.missions.list.filter((m) => !m.claimed && m.progress >= m.target).length +
        ACHIEVEMENTS.filter((a) => st.achievements[a.id] === 'done').length;
      toggleClass(claimAll, 'hidden', n < 2);
      setText(claimAll, t('quests.claimAll', { n }));
    });

    // Jornada do Rei (missão principal)
    this.content.appendChild(h('h3', { html: `${ICONS.quests}<span>${t('story.title')}</span>` }));
    const chTitle = h('div', { class: 'story-chapter' });
    const chFill = h('i');
    const qText = h('div', { class: 'row-title' });
    const qReward = h('div', { class: 'row-desc' });
    const qFill = h('i');
    const qLabel = h('span');
    const qBtn = h('button', { class: 'btn primary small', onClick: () => app.claimStory() });
    const storyBtn = h('button', { class: 'btn secondary small story-read', text: '📖', 'aria-label': t('story.title'), onClick: () => app.showChapterIntro() });
    this.content.appendChild(
      h('div', { class: 'story-card' }, [
        h('div', { class: 'story-head' }, [chTitle, storyBtn]),
        h('div', { class: 'story-chbar' }, [chFill]),
        h('div', { class: 'quest story-quest' }, [
          h('div', { class: 'quest-main' }, [qText, h('div', { class: 'qbar' }, [qFill, qLabel]), qReward]),
          qBtn,
        ]),
      ]),
    );
    this.updaters.push(() => {
      const st = app.state;
      const quest = currentStoryQuest(st);
      const inChapter = STORY.filter((x) => x.chapter === quest.chapter);
      const doneInChapter = STORY.slice(0, st.story.index).filter((x) => x.chapter === quest.chapter).length;
      setText(chTitle, chapterTitle(quest.chapter));
      chFill.style.width = inChapter.length ? `${(doneInChapter / inChapter.length) * 100}%` : '100%';
      setText(qText, storyText(quest));
      const prog = Math.min(storyProgress(st, quest), quest.target);
      qFill.style.width = `${(prog / quest.target) * 100}%`;
      setText(qLabel, `${formatNumber(prog)}/${formatNumber(quest.target)}`);
      const rewards = [];
      rewards.push(`🪙 ${formatNumber(app.game.storyGoldReward(Date.now()), st.settings.notation)}`);
      if (quest.crystals) rewards.push(`💎 ${quest.crystals}`);
      setText(qReward, `${t('story.reward')} ${rewards.join('  ')}`);
      setText(qBtn, t('quests.claim'));
      setDisabled(qBtn, prog < quest.target);
      toggleClass(qBtn, 'glow', prog >= quest.target);
    });

    // Recompensa diária
    this.content.appendChild(h('h3', { html: `${ICONS.calendar}<span>${t('quests.daily')}</span>` }));
    const days = h('div', { class: 'daily' });
    const cells = BALANCE.daily.rewards.map((r, i) => {
      const c = h('div', { class: 'day' }, [
        h('span', { class: 'day-n', text: t('quests.day', { n: i + 1 }) }),
        h('span', { class: 'ico', html: 'crystals' in r ? ICONS.crystal : ICONS.gold }),
        h('span', { class: 'day-v', text: 'crystals' in r ? `+${r.crystals}` : '' }),
      ]);
      days.appendChild(c);
      return c;
    });
    const dailyBtn = h('button', { class: 'btn primary', onClick: () => (app.claimDaily(), this.update(true)) });
    this.content.append(days, dailyBtn);

    // Missões
    this.content.appendChild(h('h3', { text: t('quests.missions') }));
    const missionRows = s.missions.list.map((m, i) => {
      const def = missionDef(m.id)!;
      const fill = h('i');
      const label = h('span');
      const btn = h('button', { class: 'btn primary small claim', onClick: () => (app.claimMission(i), this.update(true)) });
      const el = h('div', { class: 'quest' }, [
        h('div', { class: 'quest-main' }, [
          h('div', { class: 'row-title', text: tk(`mission.${def.kind}`, { n: def.target }) }),
          h('div', { class: 'qbar' }, [fill, label]),
        ]),
        btn,
      ]);
      this.content.appendChild(el);
      return { el, fill, label, btn, i };
    });

    // Bestiário
    this.content.appendChild(h('h3', { html: `<span>📖 ${t('bestiary.title')}</span>` }));
    const bonus = h('div', { class: 'section-note' });
    this.content.append(h('p', { class: 'section-note', text: t('bestiary.desc') }), bonus);
    const bestRows = MONSTER_IDS.map((id) => {
      const stars = h('span', { class: 'stars' });
      const kills = h('div', { class: 'row-desc' });
      const name = h('div', { class: 'row-title' });
      const el = h('div', { class: 'quest bestiary-row' }, [
        h('div', { class: `best-icon ${id}`, html: MONSTER_ICONS[id] ?? '' }),
        h('div', { class: 'quest-main' }, [name, kills]),
        stars,
      ]);
      this.content.appendChild(el);
      return { id, el, stars, kills, name };
    });
    this.updaters.push(() => {
      const st = app.state;
      setText(bonus, t('bestiary.bonus', { pct: Math.round((bestiaryGoldMult(st) - 1) * 100) }));
      for (const r of bestRows) {
        const k = st.bestiary[r.id] ?? 0;
        const n = bestiaryStars(k);
        const next = BALANCE.monsters.bestiary.tiers[n];
        setText(r.name, k > 0 ? tk(`monster.${r.id}`) : t('bestiary.unknown'));
        setText(r.kills, `${t('bestiary.kills', { n: formatNumber(k) })}${next ? ` · ${t('bestiary.next', { n: formatNumber(next) })}` : ''}`);
        setText(r.stars, '★'.repeat(n) + '☆'.repeat(BALANCE.monsters.bestiary.tiers.length - n));
        toggleClass(r.el, 'unknown', k === 0);
      }
    });

    // Conquistas
    this.content.appendChild(h('h3', { html: `${ICONS.trophy}<span>${t('quests.achievements')}</span>` }));
    // Ordem: prontas para coletar primeiro, depois as mais perto de completar; coletadas no fim.
    const achList = h('div', { class: 'ach-list' });
    this.content.appendChild(achList);
    const achRows = ACHIEVEMENTS.map((a) => {
      const fill = h('i');
      const label = h('span');
      const btn = h('button', { class: 'btn primary small claim', onClick: () => (app.claimAchievement(a.id), this.update(true)) });
      const el = h('div', { class: 'quest ach' }, [
        h('div', { class: 'quest-main' }, [
          h('div', { class: 'row-title', text: tk(`ach.${a.kind}`, { n: formatNumber(a.target) }) }),
          h('div', { class: 'qbar' }, [fill, label]),
        ]),
        btn,
      ]);
      achList.appendChild(el);
      return { a, el, fill, label, btn };
    });

    this.updaters.push(() => {
      const st = app.state;
      const now = Date.now();
      const claimable = canClaimDaily(st, now);
      cells.forEach((c, i) => {
        toggleClass(c, 'claimed', i < st.daily.index || (!claimable && i === st.daily.index - 1));
        toggleClass(c, 'today', claimable && i === st.daily.index);
      });
      setText(dailyBtn, claimable ? `${t('quests.claim')} · ${t('quests.day', { n: st.daily.index + 1 })}` : t('quests.comeBack'));
      setDisabled(dailyBtn, !claimable);

      for (const mr of missionRows) {
        const m = st.missions.list[mr.i];
        if (!m) continue;
        mr.fill.style.width = `${(m.progress / m.target) * 100}%`;
        setText(mr.label, `${formatNumber(m.progress)}/${formatNumber(m.target)}`);
        const done = m.progress >= m.target;
        setText(mr.btn, m.claimed ? t('quests.claimed') : t('quests.claim'));
        setDisabled(mr.btn, m.claimed || !done);
        toggleClass(mr.el, 'done', m.claimed);
      }
      for (const ar of achRows) {
        const state = st.achievements[ar.a.id];
        const v = Math.min(ar.a.stat(st), ar.a.target);
        ar.fill.style.width = `${(v / ar.a.target) * 100}%`;
        setText(ar.label, `${formatNumber(v)}/${formatNumber(ar.a.target)}`);
        ar.btn.innerHTML =
          state === 'claimed'
            ? t('quests.claimed')
            : ar.a.crystals > 0
              ? `${ICONS.crystal}+${ar.a.crystals}`
              : `${ICONS.gold}${formatNumber(app.game.achievementGold(Date.now()), st.settings.notation)}`;
        setDisabled(ar.btn, state !== 'done');
        toggleClass(ar.el, 'done', state === 'claimed');
        toggleClass(ar.btn, 'glow', state === 'done');
        const order = state === 'done' ? 0 : state === 'claimed' ? 2000 : 1000 - Math.round((v / ar.a.target) * 999);
        if (ar.el.style.order !== String(order)) ar.el.style.order = String(order);
      }
    });
  }

  // ---------------- Menu ----------------

  private toggleRow(label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
    const sw = h('button', { class: 'switch', role: 'switch' });
    const refresh = () => {
      const on = get();
      toggleClass(sw, 'on', on);
      sw.setAttribute('aria-checked', String(on));
      sw.textContent = on ? t('menu.on') : t('menu.off');
    };
    sw.addEventListener('click', () => {
      set(!get());
      refresh();
      this.app.applySettings();
      this.app.queueSave();
    });
    refresh();
    return h('div', { class: 'setting' }, [h('span', { text: label }), sw]);
  }

  private volumeRow(label: string, get: () => number, set: (v: number) => void): HTMLElement {
    const input = h('input', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': label });
    input.value = String(Math.round(get() * 100));
    input.addEventListener('input', () => {
      set(Number(input.value) / 100);
      this.app.applySettings();
    });
    input.addEventListener('change', () => {
      sfx.play('coin');
      this.app.queueSave();
    });
    return h('label', { class: 'slider' }, [h('span', { text: label }), input]);
  }

  private buildMenu(): void {
    const app = this.app;
    const st = app.state.settings;
    const c = this.content;
    c.appendChild(h('h3', { text: t('menu.settings') }));
    c.append(
      this.toggleRow(t('menu.sound'), () => st.sound, (v) => (st.sound = v)),
      this.toggleRow(t('menu.music'), () => st.music, (v) => (st.music = v)),
      this.toggleRow(t('menu.vibration'), () => st.vibration, (v) => (st.vibration = v)),
      this.toggleRow(t('menu.notifications'), () => st.notifications, (v) => app.setNotifications(v)),
      this.volumeRow(t('menu.sfxVolume'), () => st.sfxVolume, (v) => (st.sfxVolume = v)),
      this.volumeRow(t('menu.musicVolume'), () => st.musicVolume, (v) => (st.musicVolume = v)),
    );

    // Idioma (3 opções)
    const langs = h('div', { class: 'seg' });
    for (const l of LANGUAGES) {
      langs.appendChild(
        h('button', {
          class: `chip lang ${st.lang === l.id ? 'active' : ''}`,
          html: `<span class="flag">${FLAGS[l.id]}</span>${l.label}`,
          onClick: () => app.setLanguage(l.id),
        }),
      );
    }
    c.append(h('div', { class: 'setting col' }, [h('span', { text: t('menu.language') }), langs]));

    const notation = h('div', { class: 'seg' });
    const opts: [Notation, string][] = [
      ['short', t('menu.notationShort')],
      ['scientific', t('menu.notationSci')],
    ];
    const notationBtns = opts.map(([id, label]) => {
      const b = h('button', {
        class: 'chip',
        text: label,
        onClick: () => {
          st.notation = id;
          notationBtns.forEach((x, i) => toggleClass(x, 'active', opts[i][0] === id));
          app.queueSave();
        },
      });
      toggleClass(b, 'active', st.notation === id);
      notation.appendChild(b);
      return b;
    });
    c.append(h('div', { class: 'setting col' }, [h('span', { text: t('menu.notation') }), notation]));

    const grid = h('div', { class: 'menu-grid' });
    const add = (label: string, fn: () => void, hidden = false) =>
      !hidden && grid.appendChild(h('button', { class: 'btn secondary', text: label, onClick: fn }));
    add(t('menu.stats'), () => this.openStats());
    add(t('menu.export'), () => this.openExport());
    add(t('menu.import'), () => this.openImport());
    add(t('menu.privacy'), () => void app.ads.showPrivacyOptions());
    add(t('menu.privacyPolicy'), () => openExternal(PRIVACY_URL + langAnchor(app.state.settings.lang)));
    add(t('menu.terms'), () => openExternal(TERMS_URL + langAnchor(app.state.settings.lang)));
    add(t('menu.credits'), () => this.openCredits());
    add(t('menu.removeAds'), () => void app.purchases.buyNoAds(), !FEATURES.ENABLE_IAP);
    c.appendChild(grid);
    const version = h('p', { class: 'version', text: `v${__APP_VERSION__}${FEATURES.TEST_TOOLS ? ' · TEST' : ''}` });
    c.appendChild(version);
    if (FEATURES.TEST_TOOLS) {
      let taps = 0;
      version.addEventListener('click', () => {
        if (++taps === 5) {
          app.floaters.toast(t('debug.unlocked'));
          this.buildTestTools(c);
        }
      });
    }
  }

  /** Painel de testes (só no APK de teste): atalhos para testar o jogo rapidamente. */
  private buildTestTools(c: HTMLElement): void {
    const app = this.app;
    const g = app.game;
    const grid = h('div', { class: 'menu-grid test-tools' });
    const add = (label: string, fn: () => void) => grid.appendChild(h('button', { class: 'btn danger', text: label, onClick: fn }));
    add(t('debug.gold'), () => g.addGold(g.incomeReward(600, Date.now(), 100)));
    add(t('debug.crystals'), () => (g.state.crystals = g.state.crystals.plus(25)));
    add(t('debug.stages'), () => {
      const s = g.state;
      s.stage += 10;
      s.maxStage = Math.max(s.maxStage, s.stage);
      s.stats.highestStage = Math.max(s.stats.highestStage, s.stage);
      s.killsInStage = 0;
      s.farming = false;
      g.spawnEnemy();
      app.scene.setZone(Math.floor((s.stage - 1) / 50) % 5);
      app.scene.setMageVisible(s.maxStage >= BALANCE.mage.unlockStage);
    });
    add(t('debug.offline'), () => app.debugOffline(8 * 3600));
    add(t('debug.relic'), () => g.rollRelic(true));
    add(t('debug.cooldowns'), () => {
      for (const k of Object.keys(g.state.abilityReadyAt) as (keyof typeof g.state.abilityReadyAt)[]) g.state.abilityReadyAt[k] = 0;
    });
    add(t('debug.reset'), () => void app.debugReset());
    c.append(h('h3', { text: t('debug.title') }), grid);
  }

  private openStats(): void {
    const s = this.app.state;
    const n = s.settings.notation;
    const rows: [string, string][] = [
      [t('stats.highestStage'), String(s.stats.highestStage)],
      [t('stats.taps'), formatNumber(s.stats.taps, n)],
      [t('stats.crits'), formatNumber(s.stats.crits, n)],
      [t('stats.kills'), formatNumber(s.stats.kills, n)],
      [t('stats.bossKills'), formatNumber(s.stats.bossKills, n)],
      [t('stats.prestiges'), String(s.stats.prestiges)],
      [t('stats.chests'), String(s.stats.chests)],
      [t('stats.totalGold'), formatNumber(s.stats.totalGold, n)],
      [t('stats.playTime'), formatTime(s.stats.playTimeSec)],
    ];
    this.app.modals.open({
      title: t('menu.stats'),
      body: [h('table', { class: 'stats' }, rows.map(([k, v]) => h('tr', {}, [h('td', { text: k }), h('td', { text: v })])))],
    });
  }

  private openExport(): void {
    const code = this.app.exportCode();
    const ta = h('textarea', { class: 'code', readOnly: true, rows: 5 });
    ta.value = code;
    this.app.modals.open({
      title: t('menu.export'),
      body: [ta],
      buttons: [
        {
          label: t('common.ok'),
          kind: 'primary',
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(code);
              this.app.floaters.toast(t('menu.copied'));
            } catch {
              ta.select();
            }
          },
        },
      ],
    });
  }

  private openImport(): void {
    const ta = h('textarea', { class: 'code', rows: 5, placeholder: 'ITK1.…' });
    this.app.modals.open({
      title: t('menu.import'),
      body: [h('p', { text: t('menu.importPrompt') }), ta],
      buttons: [
        { label: t('common.cancel'), kind: 'secondary' },
        {
          label: t('menu.import'),
          kind: 'primary',
          onClick: async () => {
            const ok = await this.app.importCode(ta.value);
            this.app.floaters.toast(ok ? t('menu.importOk') : t('menu.importFail'));
            return ok;
          },
        },
      ],
    });
  }

  private openCredits(): void {
    this.app.modals.open({
      title: t('menu.credits'),
      body: [h('p', { text: t('credits.text') }), h('p', { text: t('credits.font') }), h('p', { text: t('credits.code') })],
    });
  }
}
