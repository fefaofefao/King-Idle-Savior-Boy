import { AdMobAdService } from './ads/AdMobAdService';
import { canShowInterstitial } from './ads/AdPolicy';
import type { AdService, RewardedPlacement } from './ads/AdService';
import { MockAdService } from './ads/MockAdService';
import { sfx } from './audio/Sfx';
import { BALANCE, type SkinId } from './config/balance';
import { relicStatText } from './ui/relicText';
import { D, Decimal } from './core/bignum';
import { formatNumber, formatTime } from './core/format';
import { offlineCapSec, mageUnlocked, totalDps, prestigeDamageGain, relicSetTier, talentPointsEarned } from './core/formulas';
import { Game, type BuyAmount, type GameEvent } from './core/game';
import { applyOffline } from './core/offline';
import {
  ACHIEVEMENTS,
  canClaimDaily,
  dailyReward,
  markDailyClaimed,
  missionDef,
} from './core/retention';
import { SaveManager, exportSave, importSave } from './core/save';
import { createInitialState, zoneIndex, type GameState, type Lang } from './core/state';
import { currentStoryQuest } from './core/story';
import { chapterTitle, storyText } from './ui/storyText';
import { detectLang, setLang, t, tk } from './i18n';
import { DisabledPurchaseService } from './iap/PurchaseService';
import {
  cancelOfflineFull,
  exitApp,
  hideSplash,
  isNative,
  onBackButton,
  onPauseResume,
  preferencesStore,
  notificationsGranted,
  requestNotificationPermission,
  scheduleOfflineFull,
  setVibration,
  vibrate,
} from './platform/platform';
import { Assets } from './scene/Assets';
import { GameScene } from './scene/GameScene';
import { $, h } from './ui/dom';
import { Floaters } from './ui/Floaters';
import { Hud } from './ui/Hud';
import { ICONS, MONSTER_ICONS, RELIC_ICONS, skinIcon } from './ui/icons';
import { showTitleScreen } from './ui/Intro';
import { Modals } from './ui/Modals';
import { Panel } from './ui/Panel';
import { WeakSpot } from './ui/WeakSpot';

/** Segurar para atacar: começa após 0,35 s e repete 5×/s (o mesmo ritmo do balanceamento). */
const HOLD = { delaySec: 0.35, tapsPerSec: 5 };

export class App {
  game!: Game;
  scene!: GameScene;
  readonly assets = new Assets();
  readonly saves = new SaveManager(preferencesStore);
  readonly ads: AdService = isNative() ? new AdMobAdService(preferencesStore) : new MockAdService();
  readonly purchases = new DisabledPurchaseService();
  modals!: Modals;
  floaters!: Floaters;
  hud!: Hud;
  panel!: Panel;
  buyAmount: BuyAmount = 1;
  weakSpot!: WeakSpot;
  private holdPointers = new Set<number>();
  private holdTimer = 0;

  private lastRewardedAt = 0;
  private saveTimer = 0;
  private uiTimer = 0;
  private saveQueued = false;
  private paused = false;
  private nextChestAt = 0;
  private chestEl: HTMLElement | null = null;
  private sessionStartedAt = Date.now();
  private adBusy = false;

  get state(): GameState {
    return this.game.state;
  }

  async start(): Promise<void> {
    const root = $('#app');
    const { state, restoredFromBackup } = await this.saves.load();
    const now = Date.now();
    const s = state ?? createInitialState(now, detectLang());
    setLang(s.settings.lang);
    await hideSplash();

    // Tela inicial: escolha de idioma + carregamento dos modelos em paralelo.
    const title = showTitleScreen(document.body, !s.settings.langChosen, () => sfx.unlock());
    await this.assets.loadAll((p) => title.setProgress(p));
    title.ready();
    const lang = await title.waitForPlay();
    s.settings.lang = lang;
    s.settings.langChosen = true;
    setLang(lang);

    this.game = new Game(s, { offerBossExtension: true });
    this.buildUi(root);
    this.applySettings();
    this.game.on((e) => this.onGameEvent(e));
    this.scene.setZone(zoneIndex(s.stage));
    this.scene.setMageVisible(mageUnlocked(s));
    this.scene.setKnightSkin(s.skin);
    this.announceRelicSets(); // guarda o estado inicial dos conjuntos (sem aviso)
    this.scene.spawnEnemy(this.game.isBoss, this.game.monster);
    this.game.ensureMissions(now);
    this.scheduleChest(now);

    if (restoredFromBackup) this.floaters.toast(t('toast.saveRestored'));
    this.handleOffline(now);
    // Primeira vez: história do capítulo 1 e a dica de toque.
    if (s.story.index === 0 && s.stats.taps === 0) this.showChapterIntro(() => this.showTapHint());
    else this.showTapHint();
    // Recompensa diária: na 1ª abertura só a bolinha na aba Missões; nos outros dias, um convite.
    if (s.stats.taps > 0) this.offerDailyWhenFree();

    this.scene.onFrame = (dt) => this.frame(dt);
    this.scene.start();
    this.hud.update();
    this.panel.update();

    onPauseResume(() => this.pause(), () => this.resume());
    onBackButton(() => this.back());
    void this.ads.init().catch((e) => console.warn('[ads] init falhou', e));
    // A permissão de notificação NÃO é pedida ao abrir: só no Menu ou quando o baú offline enche.
    void this.syncNotifications();
    void this.save();
  }

  private buildUi(root: HTMLElement): void {
    root.innerHTML = '';
    const stage = h('div', { id: 'stage' });
    const panelEl = h('div', { id: 'panel' });
    root.append(stage, panelEl);
    this.scene = new GameScene(stage, this.assets);
    this.floaters = new Floaters(document.body);
    this.modals = new Modals(document.body);
    this.hud = new Hud(this, stage);
    this.panel = new Panel(this, panelEl);
    this.weakSpot = new WeakSpot(this, stage);
    this.scene.onKingPunch = () => {
      sfx.play('death');
      vibrate(false);
    };

    // Toque: a área inteira do palco (exceto botões).
    stage.addEventListener('pointerdown', (e) => {
      sfx.unlock();
      if ((e.target as HTMLElement).closest('button, .chest-fly, .hud-click')) return;
      e.preventDefault();
      this.tap();
      // Segurar o dedo ataca sozinho (5/s, depois de um instante), para não cansar a mão.
      this.holdPointers.add(e.pointerId);
      this.holdTimer = HOLD.delaySec;
    });
    const release = (e: PointerEvent) => this.holdPointers.delete(e.pointerId);
    // No documento todo: o dedo pode soltar em cima de um modal ou fora do palco.
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    stage.addEventListener('pointerleave', release);
    // Desbloqueia o áudio no primeiro toque em qualquer lugar.
    document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  }

  applySettings(): void {
    const st = this.state.settings;
    sfx.soundOn = st.sound;
    sfx.sfxVolume = st.sfxVolume;
    sfx.musicVolume = st.musicVolume;
    sfx.setMusic(st.music);
    setVibration(st.vibration);
  }

  // ---------------- Loop ----------------

  private frame(dt: number): void {
    const now = Date.now();
    this.game.update(dt, now);
    this.weakSpot.update(dt);
    // Rei Esqueleto: fase 2 (dourado) abaixo de 40% de vida.
    if (this.game.isBoss && this.game.monster.type === 'king' && this.game.enemyAlive) {
      if (this.scene.updateBossPhase(this.game.enemyTotalHp.div(this.game.enemyMaxHp).toNumber())) {
        this.floaters.banner(t('boss.enraged'), 'good');
        sfx.play('boss');
        vibrate(true);
      }
    }
    if (this.holdPointers.size > 0 && !this.modals.isOpen) {
      this.holdTimer -= dt;
      if (this.holdTimer <= 0) {
        this.holdTimer += 1 / HOLD.tapsPerSec;
        this.tap();
      }
    }
    this.uiTimer += dt;
    if (this.uiTimer >= 0.1) {
      this.uiTimer = 0;
      this.hud.update();
      this.panel.update();
    }
    this.saveTimer += dt;
    if (this.saveTimer >= BALANCE.saveIntervalSec) {
      this.saveTimer = 0;
      this.refreshMissions(now);
      void this.save();
    }
    if (this.nextChestAt && now >= this.nextChestAt && !this.chestEl && !this.modals.isOpen) {
      this.spawnChest();
    }
  }

  tap(): void {
    const now = Date.now();
    this.scene.markInteraction();
    const r = this.game.tap(now);
    if (r) {
      this.scene.knightSwing();
      this.hud.setCombo(this.game.combo);
    }
  }

  /** Cartão de entrada do chefe: retrato + nome + tempo. */
  private showBossIntro(type: string): void {
    const z = zoneIndex(this.state.stage);
    const card = h('div', { class: `boss-intro ${type}` }, [
      h('div', { class: 'boss-portrait', html: MONSTER_ICONS[type] ?? '' }),
      h('div', { class: 'boss-info' }, [
        h('div', { class: 'boss-tag', text: t('hud.boss') }),
        h('div', { class: 'boss-name', text: t('enemy.name', { monster: tk(`monster.${type}`), zone: tk(`zoneOf.${z}`) }) }),
        h('div', { class: 'boss-time', text: `⏱ ${Math.round(this.game.bossTimeLeft)}s` }),
      ]),
    ]);
    $('#stage').appendChild(card);
    setTimeout(() => card.remove(), 2300);
  }

  /** Toque num Ponto Fraco (x, y = posição na tela para o efeito). */
  weakSpotHit(x: number, y: number): void {
    this.scene.markInteraction();
    if (!this.game.weakSpotHit(Date.now())) return;
    this.scene.knightSwing();
    this.floaters.weakBurst(x, y, t('weak.hit'));
  }

  private onGameEvent(e: GameEvent): void {
    const s = this.state;
    switch (e.type) {
      case 'hit': {
        const pos = this.scene.enemyScreenPos();
        if (e.source === 'tap') {
          this.scene.enemyHit(e.crit, false, e.armor);
          sfx.play(e.armor ? 'armor' : e.crit ? 'crit' : 'tap');
          if (e.crit) vibrate(false);
        } else if (e.source === 'weak') {
          this.scene.enemyHit(true, true);
          sfx.play('weak');
          vibrate(true);
        } else if (e.source === 'mage') {
          this.scene.enemyHit(false);
        } else {
          this.scene.enemyHit(true, true);
          sfx.play('crit');
          vibrate(true);
        }
        this.floaters.damage(pos.x, pos.y, e.amount, s.settings.notation, e.crit, e.source);
        break;
      }
      case 'kill': {
        const pos = this.scene.enemyScreenPos();
        this.scene.enemyDie();
        sfx.play('death');
        const golden = e.monster.affix === 'golden';
        this.floaters.coins(pos.x, pos.y + 40, this.hud.goldAnchor, e.boss || golden ? 12 : 3, () => sfx.play('coin'));
        if (golden) {
          this.floaters.banner(`+${formatNumber(e.gold, s.settings.notation)} 🪙`, 'good');
          sfx.play('chest');
          vibrate(true);
        }
        if (e.boss) {
          this.scene.knightCheer();
          this.floaters.banner(t('boss.defeated'), 'good');
          sfx.play('levelUp');
          vibrate(true);
        }
        break;
      }
      case 'spawn':
        this.scene.spawnEnemy(e.boss, e.monster);
        if (e.boss) {
          sfx.play('boss');
          this.showBossIntro(e.monster.type);
        }
        else if (e.monster.affix === 'golden') {
          sfx.play('chest');
          this.floaters.toast(t('affix.goldenAlert'), ICONS.gold);
        }
        break;
      case 'escaped':
        this.scene.enemyEscape();
        this.floaters.banner(t('affix.escaped'), 'bad');
        break;
      case 'armorBroken':
        this.scene.shake(0.08);
        sfx.play('crit');
        this.floaters.banner(t('affix.armorBroken'), 'good');
        break;
      case 'stageChanged': {
        this.hud.stageCleared();
        const z = zoneIndex(e.stage);
        if (z !== this.scene.currentZone) {
          this.scene.setZone(z);
          this.floaters.toast(t('toast.zone', { name: tk(`zone.${z}`) }));
        }
        this.scene.setMageVisible(mageUnlocked(s));
        break;
      }
      case 'bossTimeout':
        this.offerBossExtension();
        break;
      case 'bossFailed':
        this.floaters.banner(t('boss.failed'), 'bad');
        this.floaters.toast(t('boss.tip'), ICONS.hero, 3600);
        break;
      case 'relic': {
        const R = BALANCE.relics.list.find((x) => x.id === e.id)!;
        if (e.crystals > 0) {
          this.floaters.loot(ICONS.crystal, t('relics.maxed', { n: e.crystals }), '', 'crystal');
        } else {
          const title = e.level === 1 ? t('relics.found') : t('relics.upgraded', { n: e.level });
          this.floaters.loot(RELIC_ICONS[e.id], title, `${tk(`relic.${e.id}`)} · ${relicStatText(R.stat, R.perLevel * e.level)}`, e.level === 1 ? 'new' : '');
        }
        sfx.play('chest');
        vibrate(true);
        this.scene.celebrate('#c49aff');
        this.announceRelicSets();
        this.queueSave();
        break;
      }
      case 'skinUnlocked': {
        const sk = BALANCE.skins.list.find((x) => x.id === e.id)!;
        this.floaters.loot(skinIcon(sk.tint, sk.emissive === '#000000' ? '#ffd54a' : sk.emissive), t('skins.unlocked', { name: tk(`skin.${e.id}`) }), t('skins.desc'), 'new');
        sfx.play('levelUp');
        this.scene.celebrate('#ffd54a');
        this.queueSave();
        break;
      }
      case 'combo': {
        const pos = this.scene.enemyScreenPos();
        this.floaters.banner(`${t('combo.milestone', { n: e.count })}  +${formatNumber(e.gold, s.settings.notation)} 🪙`, 'combo');
        this.floaters.coins(pos.x, pos.y, this.hud.goldAnchor, 6, () => sfx.play('coin'));
        sfx.play('levelUp');
        vibrate(false);
        break;
      }
      case 'mageCast':
        this.scene.mageCast();
        sfx.play('magic');
        break;
      case 'purchase':
        sfx.play('buy');
        this.queueSave();
        this.panel.update(true);
        break;
      case 'levelMilestone':
        sfx.play('levelUp');
        this.scene.knightCheer();
        break;
      case 'ability':
        sfx.play(e.id === 'goldRain' ? 'chest' : 'levelUp');
        this.scene.shake(0.08);
        vibrate(true);
        this.queueSave();
        break;
      case 'achievement': {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) this.floaters.toast(t('toast.achievement', { name: tk(`ach.${a.kind}`, { n: a.target }) }), ICONS.trophy);
        break;
      }
      case 'prestige':
        break;
      case 'storyClaimed': {
        sfx.play('levelUp');
        vibrate(false);
        const parts = [];
        if (e.gold.gt(0)) parts.push(`+${formatNumber(e.gold, s.settings.notation)} 🪙`);
        if (e.crystals) parts.push(`+${e.crystals} 💎`);
        this.floaters.banner(parts.join('   '), 'good');
        this.floaters.toast(t('story.claimedToast'), ICONS.quests);
        this.floaters.coins(innerWidth / 2, 200, this.hud.goldAnchor, 10, () => sfx.play('coin'));
        if (e.chapterDone) {
          this.floaters.banner(t('story.chapterDone'), 'good');
          setTimeout(() => this.showChapterIntro(), 900);
        }
        this.queueSave();
        break;
      }
    }
  }

  // ---------------- Anúncios ----------------

  /** Mostra um rewarded. Em falha, mensagem amigável e nenhuma recompensa. */
  async watchAd(placement: RewardedPlacement): Promise<boolean> {
    if (this.adBusy) return false;
    this.adBusy = true;
    sfx.suspend();
    let ok = false;
    try {
      // Tempo-limite extra: o jogo nunca fica preso esperando um anúncio.
      ok = await Promise.race([
        this.ads.showRewarded(placement),
        new Promise<boolean>((r) => setTimeout(() => r(false), 4 * 60_000)),
      ]);
    } catch {
      ok = false;
    }
    sfx.resume();
    this.adBusy = false;
    if (ok) {
      this.lastRewardedAt = Date.now();
      this.state.stats.adsWatched++;
    } else {
      this.floaters.toast(t('ads.failed'));
    }
    return ok;
  }

  async watchGoldBuffAd(): Promise<void> {
    const A = BALANCE.ads;
    const now = Date.now();
    const s = this.state;
    if (this.goldBuffFull(now)) return;
    if (!(await this.watchAd('goldBuff'))) return;
    const after = Date.now();
    const base = Math.max(after, s.adGoldBuffUntil);
    s.adGoldBuffUntil = Math.min(base + A.goldBuffMinutesPerAd * 60_000, after + A.goldBuffMaxMinutes * 60_000);
    this.floaters.banner(t('ads.buffOn', { time: formatTime((s.adGoldBuffUntil - after) / 1000) }), 'good');
    sfx.play('levelUp');
    this.queueSave();
  }

  private offerBossExtension(): void {
    this.modals.open({
      title: t('boss.timeoutTitle'),
      body: [h('p', { text: t('boss.timeoutText') }), h('p', { class: 'ad-note', text: t('ads.isAd') })],
      dismissible: false,
      buttons: [
        { label: t('boss.giveUp'), kind: 'secondary', onClick: () => this.game.failBoss() },
        {
          label: t('boss.extend'),
          kind: 'ad',
          icon: ICONS.ad,
          onClick: async () => {
            if (await this.watchAd('bossTime')) this.game.extendBoss();
            else this.game.failBoss();
          },
        },
      ],
    });
  }

  // ---------------- Offline ----------------

  /** (Painel de testes) Finge que o jogo ficou fechado por `seconds`. */
  debugOffline(seconds: number): void {
    this.state.lastSeen = Date.now() - seconds * 1000;
    this.handleOffline(Date.now());
  }

  /** (Painel de testes) Apaga o save e recomeça. */
  async debugReset(): Promise<void> {
    if (!(await this.modals.confirm(t('debug.reset'), t('debug.resetConfirm')))) return;
    this.save = async () => {};
    await this.saves.wipe();
    location.reload();
  }

  private handleOffline(now: number): void {
    const s = this.state;
    const r = applyOffline(s, now);
    if (r.clockRewound || r.cappedSeconds < BALANCE.offline.minSecondsForModal || r.gold.lte(0)) return;
    const gold = r.gold;
    const fmt = (g: Decimal) => formatNumber(g, s.settings.notation);
    if (r.seconds >= offlineCapSec(s)) this.offerNotificationsWhenFree();
    this.modals.open({
      title: t('offline.title'),
      className: 'offline-modal',
      body: [
        h('p', { text: t('offline.text', { time: formatTime(r.cappedSeconds) }) }),
        h('div', { class: 'big-reward', html: `${ICONS.gold}<span>${fmt(gold)}</span>` }),
        h('p', { class: 'ad-note', text: t('ads.isAd') + ' → ×2' }),
      ],
      dismissible: false,
      buttons: [
        { label: t('offline.collect'), kind: 'primary', onClick: () => this.collect(gold) },
        {
          label: t('offline.collect2x'),
          kind: 'ad',
          icon: ICONS.ad,
          onClick: async () => {
            if (!(await this.watchAd('offline2x'))) return false;
            this.collect(gold.times(2));
          },
        },
      ],
    });
  }

  private collect(gold: Decimal): void {
    this.game.addGold(gold);
    this.floaters.coins(innerWidth / 2, innerHeight / 2, this.hud.goldAnchor, 12, () => sfx.play('coin'));
    this.queueSave();
  }

  // ---------------- Baú do Mensageiro ----------------

  private scheduleChest(now: number): void {
    const C = BALANCE.chest;
    const delay = (C.minIntervalSec + Math.random() * (C.maxIntervalSec - C.minIntervalSec)) * 1000;
    let at = now + delay;
    // Desligado nos primeiros 3 min da primeira sessão.
    const firstSession = this.state.stats.prestiges === 0 && this.sessionStartedAt - this.state.firstPlayedAt < 60_000;
    if (firstSession) at = Math.max(at, this.state.firstPlayedAt + C.firstSessionGraceSec * 1000);
    this.nextChestAt = at;
  }

  private spawnChest(): void {
    const C = BALANCE.chest;
    this.nextChestAt = 0;
    const el = h('button', { class: 'chest-fly', 'aria-label': t('chest.title'), html: ICONS.chest });
    el.style.animationDuration = `${C.visibleSec}s`;
    this.chestEl = el;
    $('#stage').appendChild(el);
    const done = () => {
      el.remove();
      this.chestEl = null;
      this.scheduleChest(Date.now());
    };
    el.addEventListener('animationend', done);
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      el.removeEventListener('animationend', done);
      done();
      sfx.play('chest');
      this.openChest();
    });
  }

  private openChest(): void {
    const s = this.state;
    const now = Date.now();
    const gold = this.game.chestGold(now);
    s.stats.chests++;
    this.game.track('chests', 1);
    this.game.checkAchievements();
    const fmt = formatNumber(gold, s.settings.notation);
    this.modals.open({
      title: t('chest.title'),
      body: [h('div', { class: 'big-reward', html: `${ICONS.gold}<span>${fmt}</span>` }), h('p', { class: 'ad-note', text: t('ads.isAd') })],
      onClose: () => this.queueSave(),
      buttons: [
        { label: t('chest.take'), kind: 'primary', onClick: () => this.collect(gold) },
        {
          label: t('chest.ad'),
          kind: 'ad',
          icon: ICONS.ad,
          onClick: async () => {
            if (!(await this.watchAd('chest5x'))) return false;
            this.collect(gold.times(BALANCE.chest.adMult));
          },
        },
      ],
    });
  }

  // ---------------- Renascer ----------------

  async prestige(): Promise<void> {
    const s = this.state;
    if (!this.game.canPrestige()) return;
    const gain = this.game.prestigeGain();
    const bonusGain = this.game.prestigeGain(BALANCE.ads.prestigeAdBonus);
    const mult = prestigeDamageGain(s);
    // Três escolhas: cancelar, renascer normal ou assistir a um anúncio por +50% de cristais.
    const adBonus = await new Promise<number | null>((resolve) => {
      let answered = false;
      const answer = (v: number | null) => {
        answered = true;
        resolve(v);
      };
      this.modals.open({
        title: t('prestige.confirmTitle'),
        className: 'prestige-modal',
        body: [
          h('p', { text: `${t('prestige.confirmText', { n: formatNumber(gain), x: mult.toNumber().toFixed(2) })} ${t('prestige.confirmReset')}` }),
          h('p', { class: 'ad-note', text: t('prestige.adNote', { n: formatNumber(bonusGain) }) }),
        ],
        onClose: () => !answered && resolve(null),
        buttons: [
          { label: t('common.cancel'), kind: 'secondary', onClick: () => answer(null) },
          { label: t('prestige.button', { n: formatNumber(gain) }), kind: 'primary', onClick: () => answer(0) },
          {
            label: t('prestige.adButton', { n: formatNumber(bonusGain) }),
            kind: 'ad',
            icon: ICONS.ad,
            onClick: async () => {
              if (!(await this.watchAd('prestigeBonus'))) return false; // falhou: continua no modal
              answer(BALANCE.ads.prestigeAdBonus);
            },
          },
        ],
      });
    });
    if (adBonus === null) return;
    const now = Date.now();
    const talentsBefore = talentPointsEarned(s);
    const got = this.game.prestige(now, adBonus);
    sfx.play('levelUp');
    this.scene.setZone(0);
    this.scene.setMageVisible(mageUnlocked(s));
    this.floaters.banner(`+${formatNumber(got)}`, 'crystal');
    const pts = talentPointsEarned(s) - talentsBefore;
    if (pts > 0) this.floaters.loot(ICONS.prestige, t('talents.gained', { n: pts }), t('talents.title'), 'new');
    await this.save();
    // Interstitial: somente após confirmar um Renascer, com regras de frequência.
    if (
      canShowInterstitial({
        now,
        firstPlayedAt: s.firstPlayedAt,
        lastInterstitialAt: s.lastInterstitialAt,
        lastRewardedAt: this.lastRewardedAt,
        noAds: s.noAds,
      })
    ) {
      sfx.suspend();
      const shown = await this.ads.showInterstitial().catch(() => false);
      sfx.resume();
      if (shown) s.lastInterstitialAt = Date.now();
    }
  }

  // ---------------- Retenção ----------------

  claimDaily(): void {
    const s = this.state;
    const now = Date.now();
    if (!canClaimDaily(s, now)) return;
    const r = dailyReward(s.daily.index);
    if ('crystals' in r) {
      s.crystals = s.crystals.plus(r.crystals);
      this.floaters.toast(`+${r.crystals}`, ICONS.crystal);
    } else {
      this.collect(this.game.incomeReward(r.incomeSec, now, 10));
    }
    markDailyClaimed(s, now);
    sfx.play('chest');
    this.queueSave();
  }

  /** Mostra o convite da recompensa diária assim que não houver outro modal aberto. */
  private offerDailyWhenFree(): void {
    const tryOpen = () => {
      if (!canClaimDaily(this.state, Date.now())) return;
      if (this.modals.isOpen) return void setTimeout(tryOpen, 600);
      this.showDailyModal();
    };
    setTimeout(tryOpen, 700);
  }

  private showDailyModal(): void {
    const s = this.state;
    const today = s.daily.index;
    const days = h(
      'div',
      { class: 'daily' },
      BALANCE.daily.rewards.map((r, i) =>
        h('div', { class: `day ${i < today ? 'claimed' : ''} ${i === today ? 'today' : ''}` }, [
          h('span', { class: 'day-n', text: t('quests.day', { n: i + 1 }) }),
          h('span', { class: 'ico', html: 'crystals' in r ? ICONS.crystal : ICONS.gold }),
          h('span', { class: 'day-v', text: 'crystals' in r ? `+${r.crystals}` : '' }),
        ]),
      ),
    );
    this.modals.open({
      title: t('welcome.title'),
      className: 'daily-modal',
      body: [h('p', { class: 'streak', text: t('welcome.streak', { n: today + 1 }) }), days],
      buttons: [
        {
          label: `${t('quests.claim')} · ${t('quests.day', { n: today + 1 })}`,
          kind: 'primary',
          onClick: () => {
            this.claimDaily();
            this.panel.update(true);
          },
        },
      ],
    });
  }

  claimMission(index: number): void {
    const s = this.state;
    const m = s.missions.list[index];
    const def = m && missionDef(m.id);
    if (!m || !def || m.claimed || m.progress < m.target) return;
    m.claimed = true;
    this.collect(this.game.incomeReward(def.rewardIncomeSec, Date.now(), 10));
    if (def.rewardCrystals) s.crystals = s.crystals.plus(def.rewardCrystals);
    sfx.play('chest');
    this.queueSave();
  }

  /** Coleta a missão principal atual (Jornada do Rei). */
  claimStory(): void {
    this.game.claimStory(Date.now());
    this.panel.update(true);
  }

  /** Nível de cada conjunto de relíquias já anunciado (para avisar só quando sobe). */
  private setTiers: Record<string, number> | null = null;

  private announceRelicSets(): void {
    const s = this.state;
    const now: Record<string, number> = {};
    for (const set of BALANCE.relicSets.list) now[set.id] = relicSetTier(s, set.id);
    const before = this.setTiers;
    this.setTiers = now;
    if (!before) return;
    for (const set of BALANCE.relicSets.list) {
      if (now[set.id] > (before[set.id] ?? 0)) {
        this.floaters.loot(RELIC_ICONS[set.relics[0]], t('sets.activated', { name: tk(`set.${set.id}`) }), t('sets.title'), 'new');
      }
    }
  }

  /** Troca o visual do herói (aba Herói). */
  setSkin(id: SkinId): void {
    if (!this.game.setSkin(id)) return;
    this.scene.setKnightSkin(id);
    this.scene.celebrate('#ffffff');
    sfx.play('buy');
    this.queueSave();
  }

  /** Modal com a história do capítulo atual. */
  showChapterIntro(onClose?: () => void): void {
    const ch = currentStoryQuest(this.state).chapter;
    this.modals.open({
      title: chapterTitle(ch),
      className: 'chapter-modal',
      body: [
        h('div', { class: 'chapter-art', html: ICONS.quests }),
        h('p', { class: 'chapter-text', text: tk(`chapterIntro.${ch}`) }),
        h('p', { class: 'chapter-goal', text: `➜ ${storyText(currentStoryQuest(this.state))}` }),
      ],
      buttons: [{ label: ch === 1 && this.state.story.index === 0 ? t('story.start') : t('story.next'), kind: 'primary' }],
      onClose,
    });
  }

  /** Mãozinha do tutorial apontando para o inimigo até os primeiros toques. */
  private showTapHint(): void {
    if (this.state.tutorial.tapHintDone) return;
    // Só a mãozinha (sem caixa de texto por cima da tela).
    const hint = h('div', { class: 'tap-hint', 'aria-label': t('tutorial.tap') }, [h('div', { class: 'tap-hand', text: '👆' })]);
    $('#stage').appendChild(hint);
    const place = () => {
      if (!hint.isConnected) return;
      const pos = this.scene.enemyScreenPos();
      const rect = $('#stage').getBoundingClientRect();
      hint.style.left = `${pos.x - rect.left}px`;
      hint.style.top = `${pos.y - rect.top + 90}px`;
      if (this.state.stats.taps >= 5) {
        this.state.tutorial.tapHintDone = true;
        hint.classList.add('out');
        setTimeout(() => hint.remove(), 400);
        return;
      }
      requestAnimationFrame(place);
    };
    place();
  }

  claimAchievement(id: string): void {
    const s = this.state;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || s.achievements[id] !== 'done') return;
    s.achievements[id] = 'claimed';
    if (a.crystals > 0) {
      s.crystals = s.crystals.plus(a.crystals);
      this.floaters.banner(`+${a.crystals} 💎`, 'crystal');
    } else {
      // Conquistas do começo dão ouro (cristais vêm do Renascer).
      this.collect(this.game.achievementGold(Date.now()));
    }
    sfx.play('chest');
    this.queueSave();
  }

  /** Sorteia as missões do dia quando o dia vira (e redesenha a aba, se aberta). */
  private refreshMissions(now: number): void {
    const day = this.state.missions.day;
    this.game.ensureMissions(now);
    if (this.state.missions.day !== day) this.panel.build();
  }

  /** O buff de ouro por anúncio já está no máximo acumulável? */
  goldBuffFull(now = Date.now()): boolean {
    const A = BALANCE.ads;
    return this.state.adGoldBuffUntil - now > (A.goldBuffMaxMinutes - A.goldBuffMinutesPerAd) * 60_000;
  }

  // ---------------- Configurações ----------------

  /** Liga/desliga o aviso do baú. Ligar pede a permissão do Android; se negada, fica desligado. */
  async setNotifications(on: boolean): Promise<void> {
    const st = this.state.settings;
    if (!on) {
      st.notifications = false;
      void cancelOfflineFull();
    } else {
      st.notifAsked = true;
      st.notifications = await requestNotificationPermission();
      if (!st.notifications) this.floaters.toast(t('notif.denied'), ICONS.chest, 3600);
    }
    this.queueSave();
  }

  /** Se o Android tirou a permissão, o Menu mostra o aviso desligado. */
  private async syncNotifications(): Promise<void> {
    const st = this.state.settings;
    if (st.notifications && !(await notificationsGranted())) st.notifications = false;
  }

  /** 1ª vez que o baú offline encheu: explica o aviso antes do pedido do sistema. */
  private offerNotificationsWhenFree(): void {
    const st = this.state.settings;
    if (!isNative() || st.notifAsked || st.notifications) return;
    const tryOpen = () => {
      if (this.modals.isOpen) return void setTimeout(tryOpen, 600);
      st.notifAsked = true;
      this.queueSave();
      this.modals.open({
        title: t('notif.askTitle'),
        body: [h('div', { class: 'chapter-art', html: ICONS.chest }), h('p', { text: t('notif.askText') })],
        buttons: [
          { label: t('notif.askNo'), kind: 'secondary' },
          { label: t('notif.askYes'), kind: 'primary', onClick: () => void this.setNotifications(true) },
        ],
      });
    };
    setTimeout(tryOpen, 500);
  }

  setLanguage(lang: Lang): void {
    this.state.settings.lang = lang;
    setLang(lang);
    this.hud.build();
    this.panel.build();
    this.queueSave();
  }

  exportCode(): string {
    this.state.lastSeen = Date.now();
    return exportSave(this.state);
  }

  async importCode(code: string): Promise<boolean> {
    try {
      const s = importSave(code);
      s.lastSeen = Date.now();
      await this.saves.save(s);
      location.reload();
      return true;
    } catch (e) {
      console.warn('[save] importação falhou', e);
      return false;
    }
  }

  // ---------------- Save / ciclo de vida ----------------

  queueSave(): void {
    if (this.saveQueued) return;
    this.saveQueued = true;
    setTimeout(() => {
      this.saveQueued = false;
      void this.save();
    }, 800);
  }

  async save(): Promise<void> {
    if (!this.game) return;
    this.state.lastSeen = Date.now();
    try {
      await this.saves.save(this.state);
    } catch (e) {
      console.warn('[save] falhou', e);
    }
  }

  private pause(): void {
    if (this.paused || !this.game) return;
    this.paused = true;
    this.holdPointers.clear();
    this.scene.stop();
    sfx.suspend();
    void this.save();
    const s = this.state;
    if (s.settings.notifications && totalDps(s).gt(0)) {
      const at = new Date(Date.now() + offlineCapSec(s) * 1000);
      void scheduleOfflineFull(at, t('notif.offlineFullTitle'), t('notif.offlineFullBody'));
    }
  }

  private resume(): void {
    if (!this.paused || !this.game) return;
    this.paused = false;
    void cancelOfflineFull();
    if (!this.adBusy) this.handleOffline(Date.now());
    else this.state.lastSeen = Date.now();
    this.refreshMissions(Date.now());
    this.offerDailyWhenFree();
    sfx.resume();
    this.scene.start();
  }

  private async back(): Promise<void> {
    if (this.modals.closeTop()) return;
    if (await this.modals.confirm(t('exit.title'), t('exit.text'))) {
      await this.save();
      exitApp();
    }
  }
}

export const fmtGold = (g: Decimal | number, s: GameState): string => formatNumber(D(g), s.settings.notation);
