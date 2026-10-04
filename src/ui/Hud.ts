import type { App } from '../App';
import { BALANCE, ABILITY_IDS, type AbilityId } from '../config/balance';
import { formatNumber, formatTime } from '../core/format';
import { bossTimeSec, incomePerSec } from '../core/formulas';
import { currentStoryQuest, storyComplete, storyProgress } from '../core/story';
import { storyText } from './storyText';
import { zoneIndex } from '../core/state';
import { t, tk } from '../i18n';
import { h, setText, toggleClass } from './dom';
import { ICONS } from './icons';

/** Topo (ouro, cristais, fase, chefe) e barra de habilidades. */
export class Hud {
  goldAnchor!: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private abilityEls: Record<AbilityId, { btn: HTMLButtonElement; cd: HTMLElement; label: HTMLElement; timer: HTMLElement }> =
    {} as never;
  private wrap: HTMLElement;
  private abilityBar!: HTMLElement;

  constructor(
    private app: App,
    stage: HTMLElement,
  ) {
    this.wrap = h('div', { class: 'hud' });
    stage.appendChild(this.wrap);
    this.build();
  }

  build(): void {
    const E = this.els;
    this.wrap.innerHTML = '';
    E.gold = h('span', { class: 'num' });
    E.income = h('span', { class: 'sub' });
    E.crystals = h('span', { class: 'num' });
    this.goldAnchor = h('div', { class: 'res gold' }, [
      h('span', { class: 'ico', html: ICONS.gold }),
      h('div', { class: 'res-col' }, [E.gold, E.income]),
    ]);
    const crystalBox = h('div', { class: 'res crystal' }, [h('span', { class: 'ico', html: ICONS.crystal }), E.crystals]);

    E.buffTimer = h('span', { class: 'buff-timer' });
    const buffBtn = h(
      'button',
      { class: 'buff-btn', 'aria-label': t('hud.goldBuffAd'), onClick: () => this.openBuffModal() },
      [h('span', { class: 'ico', html: ICONS.ad }), h('span', { class: 'buff-label', text: t('hud.goldBuff') }), E.buffTimer],
    );
    E.buffBtn = buffBtn;

    E.stage = h('div', { class: 'stage-title' });
    E.zone = h('div', { class: 'zone-name' });
    E.progressFill = h('i');
    E.progressText = h('span');
    E.progress = h('div', { class: 'stage-progress' }, [E.progressFill, E.progressText]);
    E.enemyName = h('span', { class: 'enemy-name-text' });
    E.affix = h('span', { class: 'affix-chip' });
    E.nameRow = h('div', { class: 'enemy-name' }, [E.affix, E.enemyName]);
    E.hpFill = h('i', { class: 'hp-fill' });
    E.hpLag = h('i', { class: 'hp-lag' });
    E.armorFill = h('i', { class: 'armor-fill' });
    E.hpText = h('span', { class: 'hp-text' });
    E.hp = h('div', { class: 'hp-bar' }, [E.hpLag, E.hpFill, E.armorFill, E.hpText]);
    E.escapeFill = h('i');
    E.escape = h('div', { class: 'escape-bar' }, [E.escapeFill]);
    E.fightBoss = h('button', {
      class: 'btn boss-btn',
      text: t('hud.fightBoss'),
      onClick: () => this.app.game.fightBoss(),
    });

    const top = h('div', { class: 'hud-top' }, [
      h('div', { class: 'hud-row' }, [this.goldAnchor, crystalBox, buffBtn]),
      (E.stageBox = h('div', { class: 'stage-box' }, [E.stage, E.zone, E.progress])),
      (E.quest = this.buildQuestTracker()),
    ]);
    const enemyBox = h('div', { class: 'enemy-box' }, [E.nameRow, E.hp, E.escape, E.fightBoss]);
    E.enemyBox = enemyBox;

    const bar = h('div', { class: 'abilities' });
    this.abilityBar = bar;
    for (const id of ABILITY_IDS) {
      const cd = h('div', { class: 'cd' });
      const label = h('span', { class: 'ab-name' });
      const timer = h('span', { class: 'ab-timer' });
      const btn = h(
        'button',
        { class: `ability ${id}`, 'aria-label': tk(`ability.${id}`), onClick: () => this.app.game.useAbility(id, Date.now()) },
        [h('span', { class: 'ico', html: ICONS[id] }), cd, timer, label],
      );
      this.abilityEls[id] = { btn, cd, label, timer };
      bar.appendChild(btn);
    }
    this.wrap.append(top, enemyBox, bar);
    this.update();
  }

  /** Rastreador da missão principal (Jornada do Rei), logo abaixo da fase. */
  private buildQuestTracker(): HTMLElement {
    const E = this.els;
    E.questText = h('span', { class: 'qt-text' });
    E.questFill = h('i');
    E.questCount = h('span', { class: 'qt-count' });
    return h(
      'button',
      {
        class: 'quest-tracker',
        onClick: () => (storyComplete(this.app.state) ? this.app.claimStory() : this.app.panel.select('quests')),
      },
      [
        h('span', { class: 'ico', html: ICONS.quests }),
        h('div', { class: 'qt-main' }, [E.questText, h('div', { class: 'qt-bar' }, [E.questFill])]),
        E.questCount,
      ],
    );
  }

  private updateQuestTracker(): void {
    const E = this.els;
    const s = this.app.state;
    const quest = currentStoryQuest(s);
    const prog = Math.min(storyProgress(s, quest), quest.target);
    const done = prog >= quest.target;
    setText(E.questText, done ? t('story.ready') : storyText(quest));
    E.questFill.style.width = `${(prog / quest.target) * 100}%`;
    setText(E.questCount, quest.target > 1 ? `${formatNumber(prog)}/${formatNumber(quest.target)}` : done ? '✓' : '');
    toggleClass(E.quest, 'ready', done);
  }

  private openBuffModal(): void {
    if (this.app.goldBuffFull()) return;
    this.app.modals.open({
      title: t('ads.buffTitle'),
      body: [h('p', { text: t('ads.buffText') }), h('p', { class: 'ad-note', text: t('ads.isAd') })],
      buttons: [
        { label: t('common.cancel'), kind: 'secondary' },
        {
          label: t('ads.watch'),
          kind: 'ad',
          icon: ICONS.ad,
          onClick: async () => {
            await this.app.watchGoldBuffAd();
          },
        },
      ],
    });
  }

  update(): void {
    const app = this.app;
    const g = app.game;
    const s = g.state;
    const now = Date.now();
    const n = s.settings.notation;
    const E = this.els;
    setText(E.gold, formatNumber(s.gold.floor(), n));
    setText(E.income, `+${formatNumber(incomePerSec(s, now), n)}${t('hud.perSec')}`);
    setText(E.crystals, formatNumber(s.crystals, n));

    const buffLeft = Math.max(0, (s.adGoldBuffUntil - now) / 1000);
    setText(E.buffTimer, buffLeft > 0 ? formatTime(buffLeft) : '');
    toggleClass(E.buffBtn, 'active', buffLeft > 0 || s.noAds);
    toggleClass(E.buffBtn, 'full', app.goldBuffFull(now));

    const z = zoneIndex(s.stage);
    setText(E.stage, t('hud.stage', { n: s.stage }));
    setText(E.zone, tk(`zone.${z}`));
    const boss = g.isBoss;
    toggleClass(E.progress, 'boss', boss);
    if (boss) {
      const full = g.bossExtended ? BALANCE.ads.bossExtraSec : bossTimeSec(s);
      const frac = Math.min(1, g.bossTimeLeft / full);
      E.progressFill.style.width = `${frac * 100}%`;
      setText(E.progressText, `${t('hud.boss')} · ${Math.ceil(g.bossTimeLeft)}s`);
    } else {
      const kills = s.killsInStage;
      E.progressFill.style.width = `${(kills / BALANCE.stage.enemiesPerStage) * 100}%`;
      setText(E.progressText, s.farming ? `${t('hud.farming')} · ${kills}/${BALANCE.stage.enemiesPerStage}` : `${kills}/${BALANCE.stage.enemiesPerStage}`);
    }
    toggleClass(E.fightBoss, 'show', s.farming);
    this.updateQuestTracker();
    // Faixa livre para a luta: abaixo do rastreador (+ nome/HP do inimigo) e acima das habilidades.
    const stageH = this.wrap.clientHeight;
    const top = E.quest.offsetTop + E.quest.offsetHeight + 46;
    const bottom = stageH - this.abilityBar.offsetTop + 4;
    app.scene.setInsets(top, Math.max(0, bottom));

    // Nome + HP acompanham a cabeça do inimigo.
    const pos = app.scene.enemyScreenPos();
    const rect = this.wrap.getBoundingClientRect();
    const x = Math.min(rect.width - 90, Math.max(90, pos.x - rect.left));
    const minY = E.quest.offsetTop + E.quest.offsetHeight + E.enemyBox.offsetHeight + 6;
    const y = Math.max(minY, pos.y - rect.top - 6);
    E.enemyBox.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;

    // Nome: tipo do monstro + zona; variação rara num selo colorido.
    const m = g.monster;
    setText(E.enemyName, t('enemy.name', { monster: tk(`monster.${m.type}`), zone: tk(`zoneOf.${z}`) }));
    toggleClass(E.nameRow, 'boss', boss);
    setText(E.affix, m.affix ? tk(`affix.${m.affix}`) : '');
    E.affix.className = `affix-chip ${m.affix ?? ''}`;
    // Barra de vida: vermelho = vida, azul = armadura, faixa clara = dano recente (efeito "lag").
    const max = g.enemyMaxHp;
    const alive = g.enemyAlive;
    const hpFrac = alive ? Math.max(0, Math.min(1, g.enemyHp.div(max).toNumber())) : 0;
    const armorFrac = alive ? Math.max(0, Math.min(1, g.armor.div(max).toNumber())) : 0;
    E.hpFill.style.width = `${hpFrac * 100}%`;
    E.armorFill.style.left = `${hpFrac * 100}%`;
    E.armorFill.style.width = `${armorFrac * 100}%`;
    E.hpLag.style.width = `${(hpFrac + armorFrac) * 100}%`;
    setText(E.hpText, alive ? formatNumber(g.enemyTotalHp.max(0), n) : '');
    const golden = alive && m.affix === 'golden';
    toggleClass(E.escape, 'show', golden);
    if (golden) E.escapeFill.style.width = `${(g.escapeTimer / BALANCE.monsters.affixes.golden.escapeSec) * 100}%`;

    for (const id of ABILITY_IDS) {
      const el = this.abilityEls[id];
      const unlocked = g.abilityUnlocked(id);
      const readyIn = Math.max(0, (s.abilityReadyAt[id] - now) / 1000);
      const active = Math.max(0, (s.abilityActiveUntil[id] - now) / 1000);
      toggleClass(el.btn, 'locked', !unlocked);
      toggleClass(el.btn, 'ready', unlocked && readyIn <= 0);
      toggleClass(el.btn, 'active', active > 0);
      el.btn.disabled = !unlocked || readyIn > 0;
      const frac = readyIn > 0 ? readyIn / g.abilityCooldownSec(id) : 0;
      el.cd.style.background = frac > 0 ? `conic-gradient(rgba(10,14,30,.72) ${frac * 360}deg, transparent 0)` : 'none';
      setText(
        el.timer,
        !unlocked ? t('ability.locked', { n: BALANCE.abilities[id].unlockStage }) : active > 0 ? `${Math.ceil(active)}s` : readyIn > 0 ? formatTime(readyIn) : '',
      );
      setText(el.label, tk(`ability.${id}`));
    }
  }
}
