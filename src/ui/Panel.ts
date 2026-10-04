import type { App } from '../App';
import { sfx } from '../audio/Sfx';
import { FEATURES } from '../config/app';
import { BALANCE, type CrystalUpgradeId } from '../config/balance';
import { formatNumber, formatTime } from '../core/format';
import {
  arcaneCost,
  bladeDamage,
  crystalUpgradeCost,
  crystalUpgradeMaxed,
  crystalsForPrestige,
  globalDamageMult,
  guildDps,
  memberDps,
  memberMilestoneMult,
  memberUnlocked,
  tapDamage,
} from '../core/formulas';
import type { BuyAmount } from '../core/game';
import { ACHIEVEMENTS, canClaimDaily, dailyReward, missionDef } from '../core/retention';
import type { Notation } from '../core/state';
import { LANGUAGES, t, tk } from '../i18n';
import { h, setDisabled, setText, toggleClass } from './dom';
import { FLAGS, ICONS, MEMBER_ICONS } from './icons';

/** URL pública da política de privacidade (GitHub Pages). Ajuste após publicar — veja SETUP_CONTAS.md. */
export const PRIVACY_URL = 'https://fefaofefao.github.io/King-Idle-Savior-Boy/privacy-policy/';

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

function row(icon: string, onBuy: () => void, extraClass = ''): Row {
  const title = h('div', { class: 'row-title' });
  const desc = h('div', { class: 'row-desc' });
  const level = h('span', { class: 'row-level' });
  const btnLabel = h('span', { class: 'btn-label' });
  const btnCost = h('span', { class: 'btn-cost' });
  const btn = h('button', { class: 'btn buy', onClick: onBuy }, [btnLabel, btnCost]);
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
        { class: 'tab', onClick: () => this.select(id) },
        [h('span', { class: 'ico', html: ICONS[id] }), h('span', { class: 'tab-label', text: t(`tab.${id}`) }), h('i', { class: 'badge' })],
      );
      this.tabButtons[id] = b;
      nav.appendChild(b);
    }
    this.root.append(this.content, nav);
    this.renderTab();
  }

  select(id: TabId): void {
    if (this.active === id) return;
    this.active = id;
    sfx.play('tap');
    this.renderTab();
  }

  private renderTab(): void {
    for (const id of TABS) toggleClass(this.tabButtons[id]!, 'active', id === this.active);
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
    this.update(true);
  }

  /** Chamado ~10x/s pelo App; atualiza só a aba visível. */
  update(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastFull < 200) return;
    this.lastFull = now;
    for (const u of this.updaters) u();
    this.updateBadges();
  }

  private updateBadges(): void {
    const s = this.app.state;
    const now = Date.now();
    const questReady =
      canClaimDaily(s, now) ||
      s.missions.list.some((m) => !m.claimed && m.progress >= m.target) ||
      Object.values(s.achievements).includes('done');
    toggleClass(this.tabButtons.quests!, 'has-badge', questReady);
    toggleClass(this.tabButtons.prestige!, 'has-badge', this.app.game.canPrestige());
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
      setText(blade.btnLabel, `+${info.n}`);
      setText(blade.btnCost, formatNumber(info.cost, n));
      setDisabled(blade.btn, s.gold.lt(info.cost));
      void bladeDamage;

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
      BALANCE.guild.members.forEach((m, i) => {
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
        setText(r.btnLabel, lvl === 0 ? t('guild.hire') : `+${info.n}`);
        setText(r.btnCost, formatNumber(info.cost, n));
        setDisabled(r.btn, !unlocked || s.gold.lt(info.cost));
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
    const btn = h('button', { class: 'btn primary big prestige-btn', onClick: () => void app.prestige() });
    this.content.append(h('div', { class: 'prestige-box' }, [crystals, desc, locked, btn]));
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
      setText(btn, t('prestige.button', { n: formatNumber(crystalsForPrestige(s.maxStage), n) }));
      setDisabled(btn, !can);
      for (const { r, id } of rows) {
        const lvl = s.crystalUpgrades[id] ?? 0;
        const maxed = crystalUpgradeMaxed(id, lvl);
        const cost = crystalUpgradeCost(id, lvl);
        setText(r.title, tk(`crystal.${id}`));
        const max = BALANCE.crystalShop.find((x) => x.id === id)!.maxLevel;
        setText(r.level, max ? `${lvl}/${max}` : t('hero.level', { n: lvl }));
        setText(r.desc, '');
        setText(r.btnLabel, maxed ? t('hero.max') : '+1');
        r.btnCost.innerHTML = maxed ? '' : `${ICONS.crystal}${formatNumber(cost, n)}`;
        setDisabled(r.btn, maxed || s.crystals.lt(cost));
      }
    });
  }

  // ---------------- Missões & Conquistas ----------------

  private buildQuests(): void {
    const app = this.app;
    const s = app.state;
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
      const btn = h('button', { class: 'btn small', onClick: () => (app.claimMission(i), this.update(true)) });
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

    // Conquistas
    this.content.appendChild(h('h3', { html: `${ICONS.trophy}<span>${t('quests.achievements')}</span>` }));
    const achRows = ACHIEVEMENTS.map((a) => {
      const fill = h('i');
      const label = h('span');
      const btn = h('button', { class: 'btn small', onClick: () => (app.claimAchievement(a.id), this.update(true)) });
      const el = h('div', { class: 'quest ach' }, [
        h('div', { class: 'quest-main' }, [
          h('div', { class: 'row-title', text: tk(`ach.${a.kind}`, { n: formatNumber(a.target) }) }),
          h('div', { class: 'qbar' }, [fill, label]),
        ]),
        btn,
      ]);
      this.content.appendChild(el);
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
      const r = dailyReward(st.daily.index);
      setText(dailyBtn, claimable ? `${t('quests.claim')} · ${t('quests.day', { n: st.daily.index + 1 })}${'crystals' in r ? '' : ''}` : t('quests.comeBack'));
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
        ar.btn.innerHTML = state === 'claimed' ? t('quests.claimed') : `${ICONS.crystal}+${ar.a.crystals}`;
        setDisabled(ar.btn, state !== 'done');
        toggleClass(ar.el, 'done', state === 'claimed');
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

  private buildMenu(): void {
    const app = this.app;
    const st = app.state.settings;
    const c = this.content;
    c.appendChild(h('h3', { text: t('menu.settings') }));
    c.append(
      this.toggleRow(t('menu.sound'), () => st.sound, (v) => (st.sound = v)),
      this.toggleRow(t('menu.music'), () => st.music, (v) => (st.music = v)),
      this.toggleRow(t('menu.vibration'), () => st.vibration, (v) => (st.vibration = v)),
      this.toggleRow(t('menu.notifications'), () => st.notifications, (v) => (st.notifications = v)),
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
    add(t('menu.privacyPolicy'), () => window.open(PRIVACY_URL, '_blank'));
    add(t('menu.credits'), () => this.openCredits());
    add(t('menu.removeAds'), () => void app.purchases.buyNoAds(), !FEATURES.ENABLE_IAP);
    c.appendChild(grid);
    c.appendChild(h('p', { class: 'version', text: `v${__APP_VERSION__}` }));
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
