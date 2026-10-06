import { GAME_TITLE, GAME_TITLE_MAIN, GAME_TITLE_SUB } from '../config/app';
import type { Lang } from '../core/state';
import { LANGUAGES, getLang, setLang, t } from '../i18n';
import { h } from './dom';
import { FLAGS } from './icons';

/** Cenário da tela inicial: céu ao entardecer, montanhas, castelo e colinas (SVG inline). */
const SCENERY = `
<svg class="ts-scenery" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="tsSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1f5c"/>
      <stop offset="0.45" stop-color="#5b3f9c"/>
      <stop offset="0.72" stop-color="#ff8a5c"/>
      <stop offset="0.85" stop-color="#ffd27a"/>
    </linearGradient>
    <radialGradient id="tsSun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff6d0"/>
      <stop offset="0.35" stop-color="#ffd54a" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="800" fill="url(#tsSky)"/>
  <g class="ts-rays" transform="translate(200 560)">
    ${Array.from({ length: 12 }, (_, i) => `<path d="M0 0 L-14 -420 L14 -420Z" fill="#fff3c0" opacity="0.07" transform="rotate(${i * 30})"/>`).join('')}
  </g>
  <circle cx="200" cy="560" r="130" fill="url(#tsSun)"/>
  <path d="M0 600 L60 520 L110 570 L170 480 L230 560 L290 500 L340 550 L400 490 L400 800 L0 800Z" fill="#6a4a9c" opacity="0.75"/>
  <!-- castelo -->
  <g fill="#3b2a6a">
    <rect x="236" y="500" width="70" height="90"/>
    <rect x="226" y="470" width="22" height="120"/><rect x="294" y="470" width="22" height="120"/>
    <rect x="258" y="450" width="26" height="140"/>
    <path d="M222 470 L237 445 L252 470Z M290 470 L305 445 L320 470Z M254 450 L271 418 L288 450Z"/>
    <path d="M226 466h22v-6h-4v3h-4v-3h-4v3h-4v-3h-6z M294 466h22v-6h-4v3h-4v-3h-4v3h-4v-3h-6z"/>
    <rect x="270" y="404" width="2" height="16"/>
  </g>
  <path d="M272 404 l14 4 -14 4z" fill="#ffd54a"/>
  <g fill="#ffd54a" opacity="0.85">
    <rect x="266" y="480" width="6" height="9" rx="3"/><rect x="233" y="495" width="5" height="8" rx="2.5"/><rect x="301" y="495" width="5" height="8" rx="2.5"/>
  </g>
  <path d="M0 640 C80 590 150 610 210 630 C280 655 340 600 400 615 L400 800 L0 800Z" fill="#2f6b4f"/>
  <path d="M0 690 C90 650 170 680 240 690 C310 700 360 670 400 675 L400 800 L0 800Z" fill="#245a40"/>
  <!-- pinheiros -->
  <g fill="#1b4a33">
    <path d="M30 700 l18 -50 18 50z M48 700 v8"/><path d="M70 690 l14 -40 14 40z"/>
    <path d="M330 690 l16 -46 16 46z"/><path d="M360 700 l18 -52 18 52z"/>
  </g>
  <path d="M0 740 C120 715 280 715 400 735 L400 800 L0 800Z" fill="#163d2c"/>
</svg>`;

/** Coroa dourada acima do título. */
const CROWN = `
<svg viewBox="0 0 120 70" aria-hidden="true">
  <defs><linearGradient id="tsGold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff2a8"/><stop offset="0.5" stop-color="#ffd54a"/><stop offset="1" stop-color="#d99a14"/>
  </linearGradient></defs>
  <path d="M10 60 L4 16 L34 38 L60 6 L86 38 L116 16 L110 60Z" fill="url(#tsGold)" stroke="#7a4a00" stroke-width="4" stroke-linejoin="round"/>
  <rect x="10" y="54" width="100" height="12" rx="4" fill="url(#tsGold)" stroke="#7a4a00" stroke-width="4"/>
  <circle cx="60" cy="40" r="7" fill="#e5544b" stroke="#7a4a00" stroke-width="3"/>
  <circle cx="32" cy="46" r="5" fill="#5ad1ff" stroke="#7a4a00" stroke-width="3"/>
  <circle cx="88" cy="46" r="5" fill="#5ad1ff" stroke="#7a4a00" stroke-width="3"/>
  <circle cx="4" cy="16" r="4" fill="#fff2a8"/><circle cx="60" cy="6" r="5" fill="#fff2a8"/><circle cx="116" cy="16" r="4" fill="#fff2a8"/>
</svg>`;

export interface TitleScreen {
  /** Progresso do carregamento (0..1). */
  setProgress(p: number): void;
  /** Marca o carregamento como concluído (habilita "Jogar"). */
  ready(): void;
  /** Resolve com o idioma escolhido quando o jogador toca em "Jogar". */
  waitForPlay(): Promise<Lang>;
}

/**
 * Tela inicial: cenário ao entardecer, logo "Savior Boy: Idle Monsters", escolha dos 3 idiomas
 * e botão Jogar com a barra de carregamento dos modelos.
 * Na primeira abertura o seletor de idioma recebe destaque.
 */
export function showTitleScreen(root: HTMLElement, firstLaunch: boolean, onPlay?: () => void): TitleScreen {
  const [w1, w2] = GAME_TITLE_MAIN.split(' ');
  const logo = h('div', { class: 'ts-logo' }, [
    h('div', { class: 'ts-crown', html: CROWN }),
    h('div', { class: 'ts-title', 'aria-label': GAME_TITLE }, [
      h('span', { class: 'ts-w1', text: w1 }),
      h('span', { class: 'ts-w3', text: w2 }),
      h('span', { class: 'ts-w2 ts-sub', text: GAME_TITLE_SUB }),
    ]),
    h('div', { class: 'ts-badge', html: '<img src="icon.png" alt="">' }),
  ]);

  const langTitle = h('div', { class: 'ts-lang-title' });
  const options = LANGUAGES.map((l) =>
    h('button', {
      class: 'ts-flag',
      'data-lang': l.id,
      'aria-label': l.label,
      html: `<span class="flag">${FLAGS[l.id]}</span><span>${l.label}</span>`,
      onClick: () => {
        setLang(l.id);
        refresh();
      },
    }),
  );
  const langBox = h('div', { class: `ts-langs ${firstLaunch ? 'highlight' : ''}` }, [
    langTitle,
    h('div', { class: 'ts-lang-row' }, options),
  ]);

  const play = h('button', { class: 'ts-play', disabled: true });
  const bar = h('i');
  const barWrap = h('div', { class: 'ts-progress' }, [bar]);
  const sparkles = h(
    'div',
    { class: 'ts-sparkles' },
    Array.from({ length: 18 }, (_, i) => {
      const s = h('i');
      s.style.left = `${(i * 53) % 100}%`;
      s.style.animationDelay = `${(i * 0.37) % 5}s`;
      s.style.animationDuration = `${4 + (i % 4)}s`;
      return s;
    }),
  );

  const screen = h('div', { class: 'title-screen' }, [
    h('div', { class: 'ts-bg', html: SCENERY }),
    sparkles,
    h('div', { class: 'ts-content' }, [logo, h('div', { class: 'ts-bottom' }, [langBox, play, barWrap])]),
    h('div', { class: 'ts-footer', text: `v${__APP_VERSION__} · FSamp Labs · KayKit CC0` }),
  ]);

  let loaded = false;
  let progress = 0;
  const refresh = () => {
    langTitle.textContent = t('lang.title');
    for (const b of options) b.classList.toggle('selected', b.dataset.lang === getLang());
    play.textContent = loaded ? t('lang.continue') : `${t('loading')} ${Math.round(progress * 100)}%`;
    play.disabled = !loaded;
  };
  refresh();
  root.appendChild(screen);

  let resolvePlay: (l: Lang) => void = () => {};
  const played = new Promise<Lang>((r) => (resolvePlay = r));
  play.addEventListener('click', () => {
    onPlay?.();
    screen.classList.add('out');
    setTimeout(() => screen.remove(), 450);
    resolvePlay(getLang());
  });

  return {
    setProgress(p) {
      progress = p;
      bar.style.width = `${Math.round(p * 100)}%`;
      if (!loaded) refresh();
    },
    ready() {
      loaded = true;
      bar.style.width = '100%';
      barWrap.classList.add('done');
      play.classList.add('ready');
      refresh();
    },
    waitForPlay: () => played,
  };
}
