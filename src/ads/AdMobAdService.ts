import type { PluginListenerHandle } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  MaxAdContentRating,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { ADS_NON_PERSONALIZED } from '../config/app';
import type { KeyValueStore } from '../core/save';
import { AD_IDS, type AdService } from './AdService';

/** Opções comuns a toda requisição de anúncio. */
const requestOptions = (adId: string) => ({ adId, isTesting: AD_IDS.isTesting, npa: ADS_NON_PERSONALIZED });

/** Chave local com o último `canRequestAds` informado pelo UMP (consentimento anterior). */
export const CONSENT_KEY = 'ads_can_request';

/** Implementação real com @capacitor-community/admob (Android). */
export class AdMobAdService implements AdService {
  private canRequestAds = false;
  private rewardedReady = false;
  private interstitialReady = false;
  privacyOptionsAvailable = false;
  /** Termina quando o SDK foi inicializado E o fluxo UMP acabou. Nenhum anúncio carrega antes. */
  private ready: Promise<void> | null = null;

  /** `store` guarda o último resultado do UMP; sem store, uma falha do UMP sempre bloqueia anúncios. */
  constructor(private store?: KeyValueStore) {}

  init(): Promise<void> {
    this.ready ??= this.doInit();
    return this.ready;
  }

  private async doInit(): Promise<void> {
    // 1) Inicializa o SDK (público 13+, não direcionado a crianças). A documentação do plugin
    //    pede initialize() ANTES do fluxo de consentimento.
    await AdMob.initialize({
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: MaxAdContentRating.Teen,
      initializeForTesting: AD_IDS.isTesting,
    });
    // 2) Consentimento UMP antes de carregar anúncios.
    try {
      let info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false });
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }
      this.canRequestAds = info.canRequestAds;
      this.privacyOptionsAvailable = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
      await this.store?.set(CONSENT_KEY, info.canRequestAds ? '1' : '0').catch(() => {});
    } catch (e) {
      // O plugin rejeita sem devolver `canRequestAds` quando a atualização falha (ex.: sem rede).
      // Vale o último valor que o SDK informou numa sessão anterior; sem ele, nada de anúncios.
      console.warn('[ads] UMP falhou; usando o consentimento anterior', e);
      const prev = await this.store?.get(CONSENT_KEY).catch(() => null);
      this.canRequestAds = prev === '1';
    }
    if (this.canRequestAds) {
      void this.loadRewarded();
      void this.loadInterstitial();
    }
  }

  private async loadRewarded(): Promise<void> {
    try {
      await AdMob.prepareRewardVideoAd(requestOptions(AD_IDS.rewarded));
      this.rewardedReady = true;
    } catch (e) {
      this.rewardedReady = false;
      console.warn('[ads] rewarded não carregou', e);
    }
  }

  private async loadInterstitial(): Promise<void> {
    try {
      await AdMob.prepareInterstitial(requestOptions(AD_IDS.interstitial));
      this.interstitialReady = true;
    } catch (e) {
      this.interstitialReady = false;
      console.warn('[ads] interstitial não carregou', e);
    }
  }

  /**
   * Mostra um rewarded e resolve SEMPRE quando o anúncio termina.
   * Atenção: no Android o `showRewardVideoAd()` do plugin só resolve quando a recompensa é
   * ganha — se o jogador fecha antes, a Promise nunca termina. Por isso usamos os eventos
   * (Rewarded / Dismissed / FailedToShow) e um tempo-limite de segurança.
   */
  async showRewarded(): Promise<boolean> {
    await this.init();
    if (!this.canRequestAds) return false;
    if (!this.rewardedReady) await this.loadRewarded();
    if (!this.rewardedReady) return false;
    this.rewardedReady = false;

    let rewarded = false;
    const handles: PluginListenerHandle[] = [];
    const result = await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(safety);
        resolve(ok);
      };
      // Rede de segurança: nunca deixa o jogo travado esperando o anúncio.
      const safety = setTimeout(() => finish(rewarded), 3 * 60_000);
      void (async () => {
        handles.push(
          await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
            rewarded = true;
          }),
          // O evento de recompensa pode chegar logo depois do "fechou": espera um instante.
          await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => setTimeout(() => finish(rewarded), 400)),
          await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false)),
        );
        AdMob.showRewardVideoAd()
          .then(() => {
            rewarded = true;
          })
          .catch((e) => {
            console.warn('[ads] rewarded falhou', e);
            finish(false);
          });
      })();
    });
    for (const h of handles) void h.remove();
    // Pré-carrega o próximo logo após exibir.
    void this.loadRewarded();
    return result;
  }

  async showInterstitial(): Promise<boolean> {
    await this.init();
    if (!this.canRequestAds || !this.interstitialReady) return false;
    this.interstitialReady = false;
    try {
      await AdMob.showInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      void this.loadInterstitial();
    }
  }

  async showPrivacyOptions(): Promise<void> {
    try {
      await AdMob.showPrivacyOptionsForm();
      // A escolha pode ter mudado: relê o estado para liberar ou bloquear anúncios.
      const info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false });
      this.canRequestAds = info.canRequestAds;
      await this.store?.set(CONSENT_KEY, info.canRequestAds ? '1' : '0').catch(() => {});
    } catch (e) {
      console.warn('[ads] formulário de privacidade indisponível', e);
    }
  }
}
