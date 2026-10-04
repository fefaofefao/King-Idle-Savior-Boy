import { AdMobAdService } from './ads/AdMobAdService';
import { canShowInterstitial } from './ads/AdPolicy';
import type { AdService, RewardedPlacement } from './ads/AdService';
import { MockAdService } from './ads/MockAdService';
import { sfx } from './audio/Sfx';
import { BALANCE } from './config/balance';
import { D, Decimal } from './core/bignum';
import { formatNumber, formatTime } from './core/format';
import { offlineCapSec, mageUnlocked, totalDps, crystalsForPrestige, prestigeDamageGain } from './core/formulas';
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
import { ICONS } from './ui/icons';
import { showLanguageSelect, showLoading } from './ui/Intro';
import { Modals } from './ui/Modals';
import { Panel } from './ui/Panel';

export class App {
  game!: Game;
  scene!: GameScene;
  readonly assets = new Assets();
  readonly saves = new SaveManager(preferencesStore);
  readonly ads: AdService = isNative() ? new AdMobAdService() : new MockAdService();
  readonly purchases = new DisabledPurchaseService();
  modals!: Modals;
  floaters!: Floaters;
  hud!: Hud;
  panel!: Panel;
  buyAmount: BuyAmount = 1;

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

    // Carrega os modelos em paralelo com a escolha de idioma.
    const loader = showLoading(root);
    const loading = this.assets.loadAll((p) => loader.set(p));

    if (!s.settings.langChosen) {
      loader.hide();
      const lang = await showLanguageSelect(root, s.settings.lang);
      s.settings.lang = lang;
      s.settings.langChosen = true;
      setLang(lang);
      loader.show();
    }
    await loading;
    loader.done();

    this.game = new Game(s, { offerBossExtension: true });
    this.buildUi(root);
    this.applySettings();
    this.game.on((e) => this.onGameEvent(e));
    this.scene.setZone(zoneIndex(s.stage));
    this.scene.setMageVisible(mageUnlocked(s));
    this.scene.spawnEnemy(this.game.isBoss);
    this.game.ensureMissions(now);
    this.scheduleChest(now);

    if (restoredFromBackup) this.floaters.toast(t('toast.saveRestored'));
    this.handleOffline(now);
    if (canClaimDaily(s, now)) this.floaters.toast(t('quests.daily'), ICONS.calendar);

    this.scene.onFrame = (dt) => this.frame(dt);
    this.scene.start();
    this.hud.update();
    this.panel.update();

    onPauseResume(() => this.pause(), () => this.resume());
    onBackButton(() => this.back());
    void this.ads.init().catch((e) => console.warn('[ads] init falhou', e));
    if (s.settings.notifications) void requestNotificationPermission();
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

    // Toque: a área inteira do palco (exceto botões).
    stage.addEventListener('pointerdown', (e) => {
      sfx.unlock();
      if ((e.target as HTMLElement).closest('button, .chest-fly, .hud-click')) return;
      e.preventDefault();
      this.tap();
    });
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
    if (r) this.scene.knightSwing();
  }

  private onGameEvent(e: GameEvent): void {
    const s = this.state;
    switch (e.type) {
      case 'hit': {
        const pos = this.scene.enemyScreenPos();
        const fmt = formatNumber(e.amount, s.settings.notation);
        if (e.source === 'tap') {
          this.scene.enemyHit(e.crit);
          sfx.play(e.crit ? 'crit' : 'tap');
          if (e.crit) vibrate(false);
        } else if (e.source === 'mage') {
          this.scene.enemyHit(false);
        } else {
          this.scene.enemyHit(true, true);
          sfx.play('crit');
          vibrate(true);
        }
        this.floaters.damage(pos.x, pos.y, fmt, e.crit, e.source);
        break;
      }
      case 'kill': {
        const pos = this.scene.enemyScreenPos();
        this.scene.enemyDie();
        sfx.play('death');
        this.floaters.coins(pos.x, pos.y + 40, this.hud.goldAnchor, e.boss ? 10 : 3, () => sfx.play('coin'));
        if (e.boss) {
          this.floaters.banner(t('boss.defeated'), 'good');
          sfx.play('levelUp');
          vibrate(true);
        }
        break;
      }
      case 'spawn':
        this.scene.spawnEnemy(e.boss);
        if (e.boss) sfx.play('boss');
        break;
      case 'stageChanged': {
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
        break;
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
        break;
      case 'ability':
        sfx.play(e.id === 'goldRain' ? 'chest' : 'levelUp');
        this.scene.shake(0.08);
        this.queueSave();
        break;
      case 'achievement': {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) this.floaters.toast(t('toast.achievement', { name: tk(`ach.${a.kind}`, { n: a.target }) }), ICONS.trophy);
        break;
      }
      case 'prestige':
        break;
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
      ok = await this.ads.showRewarded(placement);
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
    const base = Math.max(now, s.adGoldBuffUntil);
    s.adGoldBuffUntil = Math.min(base + A.goldBuffMinutesPerAd * 60_000, now + A.goldBuffMaxMinutes * 60_000);
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

  private handleOffline(now: number): void {
    const s = this.state;
    const r = applyOffline(s, now);
    if (r.clockRewound || r.cappedSeconds < BALANCE.offline.minSecondsForModal || r.gold.lte(0)) return;
    const gold = r.gold;
    const fmt = (g: Decimal) => formatNumber(g, s.settings.notation);
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
    const gold = this.game.incomeReward(BALANCE.chest.incomeSeconds, now, BALANCE.chest.enemyKills);
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
    const gain = crystalsForPrestige(s.maxStage);
    const mult = prestigeDamageGain(s);
    const ok = await this.modals.confirm(
      t('prestige.confirmTitle'),
      `${t('prestige.confirmText', { n: formatNumber(gain), x: mult.toNumber().toFixed(2) })} ${t('prestige.confirmReset')}`,
    );
    if (!ok) return;
    const now = Date.now();
    this.game.prestige(now);
    sfx.play('levelUp');
    this.scene.setZone(0);
    this.scene.setMageVisible(mageUnlocked(s));
    this.floaters.banner(`+${formatNumber(gain)}`, 'crystal');
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

  claimAchievement(id: string): void {
    const s = this.state;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || s.achievements[id] !== 'done') return;
    s.achievements[id] = 'claimed';
    s.crystals = s.crystals.plus(a.crystals);
    this.floaters.toast(`+${a.crystals}`, ICONS.crystal);
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

  setNotifications(on: boolean): void {
    this.state.settings.notifications = on;
    if (on) void requestNotificationPermission();
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
