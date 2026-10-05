import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyValueStore } from '../src/core/save';

// Plugin simulado: o resultado do UMP é configurado por teste.
let consent: 'ok' | 'denied' | 'error' = 'ok';
const order: string[] = [];

vi.mock('@capacitor-community/admob', () => ({
  AdmobConsentStatus: { REQUIRED: 'REQUIRED' },
  MaxAdContentRating: { Teen: 'Teen', ParentalGuidance: 'ParentalGuidance' },
  RewardAdPluginEvents: { Rewarded: 'r', Dismissed: 'd', FailedToShow: 'f' },
  AdMob: {
    initialize: vi.fn(async () => void order.push('initialize')),
    requestConsentInfo: vi.fn(async () => {
      order.push('consent');
      await new Promise((r) => setTimeout(r, 5));
      if (consent === 'error') throw new Error('network');
      return { status: 'OBTAINED', canRequestAds: consent === 'ok', privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
    }),
    prepareRewardVideoAd: vi.fn(async () => void order.push('loadRewarded')),
    prepareInterstitial: vi.fn(async () => void order.push('loadInterstitial')),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}));

const { AdMobAdService, CONSENT_KEY } = await import('../src/ads/AdMobAdService');
const { AdMob } = await import('@capacitor-community/admob');

const memStore = (init: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
  const data = { ...init };
  return {
    data,
    get: async (k) => data[k] ?? null,
    set: async (k, v) => void (data[k] = v),
    remove: async (k) => void delete data[k],
  };
};

describe('consentimento UMP', () => {
  beforeEach(() => {
    order.length = 0;
    vi.mocked(AdMob.prepareRewardVideoAd).mockClear();
    vi.mocked(AdMob.prepareInterstitial).mockClear();
  });

  it('sucesso: carrega anúncios só depois do UMP e guarda o consentimento', async () => {
    consent = 'ok';
    const store = memStore();
    const ads = new AdMobAdService(store);
    await ads.init();
    await new Promise((r) => setTimeout(r, 0));
    expect(order.slice(0, 2)).toEqual(['initialize', 'consent']);
    expect(order.indexOf('loadRewarded')).toBeGreaterThan(order.indexOf('consent'));
    expect(store.data[CONSENT_KEY]).toBe('1');
  });

  it('UMP negado (canRequestAds = false): nenhum anúncio carregado', async () => {
    consent = 'denied';
    const store = memStore();
    const ads = new AdMobAdService(store);
    await ads.init();
    expect(AdMob.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(await ads.showRewarded()).toBe(false);
    expect(store.data[CONSENT_KEY]).toBe('0');
  });

  it('erro no UMP com consentimento anterior: anúncios continuam liberados', async () => {
    consent = 'error';
    const ads = new AdMobAdService(memStore({ [CONSENT_KEY]: '1' }));
    await ads.init();
    expect(AdMob.prepareRewardVideoAd).toHaveBeenCalled();
    expect(AdMob.prepareInterstitial).toHaveBeenCalled();
  });

  it('erro no UMP sem consentimento anterior: nenhum anúncio', async () => {
    consent = 'error';
    const ads = new AdMobAdService(memStore());
    await ads.init();
    expect(AdMob.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(AdMob.prepareInterstitial).not.toHaveBeenCalled();
    expect(await ads.showRewarded()).toBe(false);
    expect(await ads.showInterstitial()).toBe(false);
  });

  it('pedir anúncio antes do UMP terminar espera o fluxo (nada carrega antes)', async () => {
    consent = 'ok';
    const ads = new AdMobAdService(memStore());
    const pending = ads.showInterstitial();
    void ads.init();
    await pending;
    const firstLoad = order.findIndex((o) => o.startsWith('load'));
    expect(firstLoad).toBeGreaterThan(order.indexOf('consent'));
  });
});

describe('anúncios não personalizados (ECA Digital)', () => {
  it('a flag vem ligada por padrão', async () => {
    const { ADS_NON_PERSONALIZED } = await import('../src/config/app');
    expect(ADS_NON_PERSONALIZED).toBe(true);
  });

  it('premiado e intersticial são pedidos com npa: true', async () => {
    consent = 'ok';
    vi.mocked(AdMob.prepareRewardVideoAd).mockClear();
    vi.mocked(AdMob.prepareInterstitial).mockClear();
    const ads = new AdMobAdService(memStore());
    await ads.init();
    await new Promise((r) => setTimeout(r, 0));
    expect(vi.mocked(AdMob.prepareRewardVideoAd).mock.calls[0][0]).toMatchObject({ npa: true });
    expect(vi.mocked(AdMob.prepareInterstitial).mock.calls[0][0]).toMatchObject({ npa: true });
  });
});
