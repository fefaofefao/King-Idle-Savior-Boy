import { FEATURES } from '../config/app';

/**
 * Estrutura para "Remover anúncios" (desligada: FEATURES.ENABLE_IAP = false).
 * Efeito planejado: sem interstitials + ouro ×2 permanente. Rewarded continuam opcionais.
 * Implementação futura com Google Play Billing — veja DECISIONS.md.
 */
export interface PurchaseService {
  readonly enabled: boolean;
  isNoAdsOwned(): Promise<boolean>;
  buyNoAds(): Promise<boolean>;
  restore(): Promise<boolean>;
}

export class DisabledPurchaseService implements PurchaseService {
  readonly enabled = FEATURES.ENABLE_IAP;
  async isNoAdsOwned() {
    return false;
  }
  async buyNoAds() {
    return false;
  }
  async restore() {
    return false;
  }
}
