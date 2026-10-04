import {
  AdMob,
  AdmobConsentStatus,
  MaxAdContentRating,
} from '@capacitor-community/admob';
import { AD_IDS, type AdService } from './AdService';

/** Implementação real com @capacitor-community/admob (Android). */
export class AdMobAdService implements AdService {
  private canRequestAds = false;
  private rewardedReady = false;
  private interstitialReady = false;
  privacyOptionsAvailable = false;

  async init(): Promise<void> {
    // 1) Consentimento UMP antes de inicializar/carregar anúncios.
    try {
      let info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false });
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }
      this.canRequestAds = info.canRequestAds;
      this.privacyOptionsAvailable =
        String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
    } catch (e) {
      console.warn('[ads] UMP falhou', e);
      this.canRequestAds = true; // fora da região UMP o SDK permite anúncios
    }
    // 2) Inicializa o SDK (público 13+, não direcionado a crianças).
    await AdMob.initialize({
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: MaxAdContentRating.Teen,
      initializeForTesting: AD_IDS.isTesting,
    });
    if (this.canRequestAds) {
      void this.loadRewarded();
      void this.loadInterstitial();
    }
  }

  private async loadRewarded(): Promise<void> {
    try {
      await AdMob.prepareRewardVideoAd({ adId: AD_IDS.rewarded, isTesting: AD_IDS.isTesting });
      this.rewardedReady = true;
    } catch (e) {
      this.rewardedReady = false;
      console.warn('[ads] rewarded não carregou', e);
    }
  }

  private async loadInterstitial(): Promise<void> {
    try {
      await AdMob.prepareInterstitial({ adId: AD_IDS.interstitial, isTesting: AD_IDS.isTesting });
      this.interstitialReady = true;
    } catch (e) {
      this.interstitialReady = false;
      console.warn('[ads] interstitial não carregou', e);
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.canRequestAds) return false;
    if (!this.rewardedReady) await this.loadRewarded();
    if (!this.rewardedReady) return false;
    this.rewardedReady = false;
    try {
      const reward = await AdMob.showRewardVideoAd();
      return !!reward && reward.amount >= 0;
    } catch (e) {
      console.warn('[ads] rewarded falhou', e);
      return false;
    } finally {
      // Pré-carrega o próximo logo após exibir.
      void this.loadRewarded();
    }
  }

  async showInterstitial(): Promise<boolean> {
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
    } catch (e) {
      console.warn('[ads] formulário de privacidade indisponível', e);
    }
  }
}
