import { beforeEach, describe, expect, it, vi } from 'vitest';

// Simula o plugin: showRewardVideoAd só resolve quando a recompensa é ganha (como no Android).
const listeners = new Map<string, ((d?: unknown) => void)[]>();
const emit = (ev: string) => (listeners.get(ev) ?? []).forEach((f) => f());
let scenario: 'reward' | 'closeEarly' | 'failShow' = 'reward';

vi.mock('@capacitor-community/admob', () => ({
  AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
  MaxAdContentRating: { Teen: 'Teen' },
  RewardAdPluginEvents: {
    Rewarded: 'onRewardedVideoAdReward',
    Dismissed: 'onRewardedVideoAdDismissed',
    FailedToShow: 'onRewardedVideoAdFailedToShow',
  },
  AdMob: {
    initialize: vi.fn(async () => {}),
    requestConsentInfo: vi.fn(async () => ({ status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' })),
    prepareRewardVideoAd: vi.fn(async () => ({ adUnitId: 'x' })),
    prepareInterstitial: vi.fn(async () => ({ adUnitId: 'y' })),
    addListener: vi.fn(async (ev: string, fn: () => void) => {
      listeners.set(ev, [...(listeners.get(ev) ?? []), fn]);
      return { remove: async () => listeners.set(ev, (listeners.get(ev) ?? []).filter((f) => f !== fn)) };
    }),
    showRewardVideoAd: vi.fn(
      () =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            if (scenario === 'reward') {
              emit('onRewardedVideoAdReward');
              resolve({ type: 'coins', amount: 1 });
              setTimeout(() => emit('onRewardedVideoAdDismissed'), 10);
            } else if (scenario === 'closeEarly') {
              emit('onRewardedVideoAdDismissed'); // a Promise do plugin NUNCA resolve
            } else {
              reject(new Error('failed to show'));
            }
          }, 10);
        }),
    ),
  },
}));

const { AdMobAdService } = await import('../src/ads/AdMobAdService');

describe('AdMobAdService (rewarded)', () => {
  beforeEach(() => listeners.clear());

  it('concede a recompensa quando o anúncio é assistido', async () => {
    scenario = 'reward';
    const ads = new AdMobAdService();
    await ads.init();
    expect(await ads.showRewarded()).toBe(true);
  });

  it('fechar antes da recompensa NÃO trava o jogo e não concede nada', async () => {
    scenario = 'closeEarly';
    const ads = new AdMobAdService();
    await ads.init();
    expect(await ads.showRewarded()).toBe(false);
  });

  it('falha ao exibir retorna false', async () => {
    scenario = 'failShow';
    const ads = new AdMobAdService();
    await ads.init();
    expect(await ads.showRewarded()).toBe(false);
  });

  it('remove os listeners depois de cada anúncio', async () => {
    scenario = 'reward';
    const ads = new AdMobAdService();
    await ads.init();
    await ads.showRewarded();
    await new Promise((r) => setTimeout(r, 20));
    expect([...listeners.values()].every((l) => l.length === 0)).toBe(true);
  });
});
