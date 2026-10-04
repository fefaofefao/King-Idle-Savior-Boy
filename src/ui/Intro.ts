import type { Lang } from '../core/state';
import { LANGUAGES, getLang, setLang, t } from '../i18n';
import { h } from './dom';
import { FLAGS } from './icons';

/** Tela de escolha de idioma (primeira abertura). Resolve com o idioma escolhido. */
export function showLanguageSelect(root: HTMLElement, initial: Lang): Promise<Lang> {
  return new Promise((resolve) => {
    let selected = initial;
    setLang(selected);
    const title = h('h1', { class: 'lang-title' });
    const subtitle = h('p', { class: 'lang-sub' });
    const logo = h('div', { class: 'lang-logo' });
    const play = h('button', { class: 'btn primary big' });
    const options = LANGUAGES.map((l) => {
      const btn = h('button', {
        class: 'lang-option',
        'data-lang': l.id,
        'aria-pressed': 'false',
        html: `<span class="flag">${FLAGS[l.id]}</span><span class="lang-label">${l.label}</span><span class="check">✓</span>`,
      });
      btn.addEventListener('click', () => {
        selected = l.id;
        setLang(selected);
        refresh();
      });
      return btn;
    });
    const refresh = () => {
      logo.textContent = t('app.name');
      title.textContent = t('lang.title');
      subtitle.textContent = t('lang.subtitle');
      play.textContent = t('lang.continue');
      for (const b of options) {
        const on = b.dataset.lang === getLang();
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', String(on));
      }
    };
    const screen = h('div', { class: 'intro-screen lang-screen' }, [
      logo,
      title,
      h('div', { class: 'lang-options' }, options),
      subtitle,
      play,
    ]);
    play.addEventListener('click', () => {
      screen.classList.add('out');
      setTimeout(() => screen.remove(), 250);
      resolve(selected);
    });
    refresh();
    root.appendChild(screen);
  });
}

/** Tela de carregamento com barra de progresso. */
export function showLoading(root: HTMLElement) {
  const bar = h('i');
  const label = h('div', { class: 'loading-label', text: t('loading') });
  const screen = h('div', { class: 'intro-screen loading-screen' }, [
    h('div', { class: 'lang-logo', text: t('app.name') }),
    h('div', { class: 'progress' }, [bar]),
    label,
  ]);
  root.appendChild(screen);
  return {
    set(p: number) {
      bar.style.width = `${Math.round(p * 100)}%`;
    },
    hide() {
      screen.style.display = 'none';
    },
    show() {
      screen.style.display = '';
      label.textContent = t('loading');
      (screen.firstChild as HTMLElement).textContent = t('app.name');
    },
    done() {
      bar.style.width = '100%';
      screen.classList.add('out');
      setTimeout(() => screen.remove(), 300);
    },
  };
}
