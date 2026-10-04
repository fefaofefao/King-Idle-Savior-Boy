/** Ícones SVG flat (feitos à mão, mesmo estilo). */

const svg = (body: string, vb = '0 0 48 48') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  gold: svg(
    '<circle cx="24" cy="24" r="19" fill="#f2b520"/><circle cx="24" cy="24" r="14.5" fill="#ffd54a"/><path d="M24 14l3 6.5 7 .8-5.2 4.8 1.4 7L24 29.6 17.8 33l1.4-7-5.2-4.8 7-.8z" fill="#f2b520"/>',
  ),
  crystal: svg(
    '<path d="M24 4l14 14-14 26L10 18z" fill="#7fd3ff"/><path d="M24 4l14 14H10z" fill="#c4ecff"/><path d="M24 18v26L10 18z" fill="#4fb2e8"/>',
  ),
  chest: svg(
    '<rect x="6" y="18" width="36" height="22" rx="3" fill="#a0612b"/><path d="M6 20c0-8 6-12 18-12s18 4 18 12z" fill="#c47a35"/><rect x="6" y="18" width="36" height="4" fill="#f2c14e"/><rect x="20" y="20" width="8" height="10" rx="2" fill="#f2c14e"/><circle cx="24" cy="25" r="1.6" fill="#5a3311"/>',
  ),
  // Abas
  hero: svg(
    '<path d="M10 26c0-9 6-16 14-16s14 7 14 16v8H10z" fill="#c9d2de"/><rect x="14" y="22" width="20" height="5" rx="2" fill="#2d3a55"/><path d="M24 4l3 8h-6z" fill="#e04848"/><rect x="10" y="34" width="28" height="6" rx="2" fill="#9aa6b8"/>',
  ),
  guild: svg(
    '<circle cx="16" cy="17" r="6" fill="#ffd2a6"/><circle cx="32" cy="17" r="6" fill="#ffd2a6"/><path d="M6 38c0-7 4-12 10-12s10 5 10 12z" fill="#5b8def"/><path d="M22 38c0-7 4-12 10-12s10 5 10 12z" fill="#e06a6a"/>',
  ),
  prestige: svg(
    '<path d="M24 4l12 12-12 28L12 16z" fill="#b48cff"/><path d="M24 4l12 12H12z" fill="#d9c6ff"/><path d="M24 16v28L12 16z" fill="#8a5be0"/><circle cx="38" cy="8" r="3" fill="#ffe680"/><circle cx="9" cy="33" r="2" fill="#ffe680"/>',
  ),
  quests: svg(
    '<rect x="10" y="6" width="28" height="36" rx="3" fill="#f4e3bf"/><rect x="8" y="4" width="32" height="6" rx="3" fill="#c99a52"/><rect x="8" y="38" width="32" height="6" rx="3" fill="#c99a52"/><path d="M16 20l3 3 6-6M16 31l3 3 6-6" stroke="#3a9a3a" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="28" y="19" width="6" height="3" rx="1" fill="#a07940"/><rect x="28" y="30" width="6" height="3" rx="1" fill="#a07940"/>',
  ),
  menu: svg(
    '<circle cx="24" cy="24" r="8" fill="none" stroke="#c9d2de" stroke-width="6"/><g fill="#c9d2de"><rect x="21" y="4" width="6" height="9" rx="2"/><rect x="21" y="35" width="6" height="9" rx="2"/><rect x="4" y="21" width="9" height="6" rx="2"/><rect x="35" y="21" width="9" height="6" rx="2"/><rect x="21" y="4" width="6" height="9" rx="2" transform="rotate(45 24 24)"/><rect x="21" y="35" width="6" height="9" rx="2" transform="rotate(45 24 24)"/><rect x="4" y="21" width="9" height="6" rx="2" transform="rotate(45 24 24)"/><rect x="35" y="21" width="9" height="6" rx="2" transform="rotate(45 24 24)"/></g>',
  ),
  // Upgrades do herói
  blade: svg(
    '<path d="M36 6l6 0 0 6-20 20-6-6z" fill="#dfe6ee"/><path d="M36 6l6 0-20 20-3-3z" fill="#ffffff"/><rect x="10" y="26" width="14" height="4" rx="2" transform="rotate(45 17 28)" fill="#f2c14e"/><rect x="6" y="34" width="10" height="5" rx="2" transform="rotate(-45 11 36)" fill="#8a5a35"/>',
  ),
  arcane: svg(
    '<circle cx="24" cy="24" r="16" fill="#3a2a7a"/><path d="M24 10l3 10 10 4-10 4-3 10-3-10-10-4 10-4z" fill="#c89bff"/><circle cx="24" cy="24" r="3" fill="#fff"/>',
  ),
  mage: svg(
    '<path d="M24 4l10 20H14z" fill="#7b4fd6"/><ellipse cx="24" cy="24" rx="16" ry="4" fill="#5a3aa8"/><circle cx="24" cy="31" r="8" fill="#f2c9a0"/><circle cx="36" cy="10" r="3" fill="#ffe680"/>',
  ),
  // Habilidades
  strike: svg(
    '<path d="M8 40L34 14" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M30 8l10 10" stroke="#ffd54a" stroke-width="5" stroke-linecap="round"/><path d="M38 30l4 2M34 38l2 4M14 8l2 4M8 14l-4-2" stroke="#ff7a3a" stroke-width="3" stroke-linecap="round"/>',
  ),
  fury: svg(
    '<path d="M24 4c4 8 14 12 14 24a14 14 0 01-28 0c0-6 3-9 5-12 1 4 3 6 5 6-1-7 1-13 4-18z" fill="#ff5a2a"/><path d="M24 22c2 4 7 6 7 12a7 7 0 01-14 0c0-3 2-5 3-6 1 2 2 3 3 3 0-3 0-6 1-9z" fill="#ffd54a"/>',
  ),
  goldRain: svg(
    '<path d="M10 16a10 7 0 0128 0z" fill="#9fc6ff"/><circle cx="14" cy="27" r="5" fill="#ffd54a" stroke="#f2b520" stroke-width="2"/><circle cx="30" cy="25" r="5" fill="#ffd54a" stroke="#f2b520" stroke-width="2"/><circle cx="22" cy="38" r="5" fill="#ffd54a" stroke="#f2b520" stroke-width="2"/><circle cx="37" cy="37" r="4" fill="#ffd54a" stroke="#f2b520" stroke-width="2"/>',
  ),
  lock: svg(
    '<rect x="10" y="20" width="28" height="22" rx="4" fill="#8a94a6"/><path d="M16 20v-6a8 8 0 0116 0v6" stroke="#8a94a6" stroke-width="5" fill="none"/><circle cx="24" cy="30" r="3" fill="#2b3245"/>',
  ),
  ad: svg(
    '<rect x="4" y="10" width="40" height="28" rx="6" fill="#ffffff"/><path d="M20 18v12l10-6z" fill="#2b6be0"/>',
  ),
  trophy: svg(
    '<path d="M14 6h20v10a10 10 0 01-20 0z" fill="#ffd54a"/><path d="M14 9H6c0 7 4 10 8 10M34 9h8c0 7-4 10-8 10" stroke="#f2b520" stroke-width="3" fill="none"/><rect x="21" y="26" width="6" height="8" fill="#f2b520"/><rect x="14" y="34" width="20" height="6" rx="2" fill="#a07940"/>',
  ),
  calendar: svg(
    '<rect x="6" y="10" width="36" height="32" rx="4" fill="#fff"/><rect x="6" y="10" width="36" height="9" rx="4" fill="#e04848"/><rect x="14" y="6" width="4" height="8" rx="2" fill="#555"/><rect x="30" y="6" width="4" height="8" rx="2" fill="#555"/><path d="M17 30l5 5 9-10" stroke="#3a9a3a" stroke-width="4" fill="none" stroke-linecap="round"/>',
  ),
};

/** Ícones da guilda. */
export const MEMBER_ICONS: Record<string, string> = {
  squire: svg(
    '<path d="M24 4l16 6v12c0 10-7 17-16 22C15 39 8 32 8 22V10z" fill="#5b8def"/><path d="M24 4v40C15 39 8 32 8 22V10z" fill="#4a76cf"/><path d="M24 12v24M16 22h16" stroke="#ffd54a" stroke-width="4" stroke-linecap="round"/>',
  ),
  archer: svg(
    '<path d="M12 6c18 4 18 32 0 36" stroke="#8a5a35" stroke-width="4" fill="none"/><path d="M12 6v36" stroke="#eee" stroke-width="1.5"/><path d="M8 24h32" stroke="#c9a46a" stroke-width="3"/><path d="M40 24l-7-5v10z" fill="#9aa3ad"/><path d="M10 24l-4-4M10 24l-4 4" stroke="#e04848" stroke-width="3"/>',
  ),
  cleric: svg(
    '<circle cx="24" cy="24" r="18" fill="#fff3c4"/><rect x="20" y="8" width="8" height="32" rx="2" fill="#f2c14e"/><rect x="12" y="16" width="24" height="8" rx="2" fill="#f2c14e"/>',
  ),
  rogue: svg(
    '<path d="M30 6l6 6-16 16-6-6z" fill="#dfe6ee"/><path d="M12 22l14 14-3 3-14-14z" fill="#2c2c38"/><rect x="6" y="34" width="8" height="8" rx="2" transform="rotate(45 10 38)" fill="#5a3aa8"/>',
  ),
  barbarian: svg(
    '<rect x="21" y="8" width="5" height="36" rx="2" fill="#8a5a35"/><path d="M26 8c10 0 16 6 16 14-6-3-11-3-16 0z" fill="#c9d2de"/><path d="M21 8C11 8 6 14 6 22c6-3 10-3 15 0z" fill="#aab4c2"/>',
  ),
  druid: svg(
    '<path d="M24 44V22" stroke="#7a4f2e" stroke-width="4"/><path d="M24 30C10 30 6 18 8 6c12 0 18 8 16 24z" fill="#4caf50"/><path d="M24 26c12 0 16-10 14-20-10 0-16 8-14 20z" fill="#7bd36a"/>',
  ),
  paladin: svg(
    '<rect x="21" y="18" width="6" height="26" rx="2" fill="#8a5a35"/><rect x="8" y="6" width="32" height="14" rx="3" fill="#f2c14e"/><rect x="12" y="9" width="24" height="8" rx="2" fill="#ffe08a"/>',
  ),
  dragoon: svg(
    '<path d="M6 42L36 12" stroke="#8a5a35" stroke-width="4" stroke-linecap="round"/><path d="M36 12l8-8-2 12z" fill="#dfe6ee"/><path d="M20 20c-6-8-2-14 4-16 0 6 4 8 8 8-2 4-6 8-12 8z" fill="#e04848"/><circle cx="23" cy="10" r="1.6" fill="#ffd54a"/>',
  ),
};

/** Bandeiras simplificadas (emoji de bandeira não aparece em todos os aparelhos). */
export const FLAGS: Record<string, string> = {
  'pt-BR': svg(
    '<rect width="48" height="34" rx="4" fill="#009b3a"/><path d="M24 4l20 13-20 13L4 17z" fill="#fedf00"/><circle cx="24" cy="17" r="7.5" fill="#002776"/><path d="M16.8 15.5c5-1.6 10.4-.8 14.6 2" stroke="#fff" stroke-width="1.4" fill="none"/>',
    '0 0 48 34',
  ),
  en: svg(
    '<rect width="48" height="34" rx="4" fill="#fff"/><g fill="#b22234"><rect y="0" width="48" height="2.6"/><rect y="5.2" width="48" height="2.6"/><rect y="10.4" width="48" height="2.6"/><rect y="15.6" width="48" height="2.6"/><rect y="20.8" width="48" height="2.6"/><rect y="26" width="48" height="2.6"/><rect y="31.2" width="48" height="2.8"/></g><rect width="21" height="18.2" fill="#3c3b6e"/><g fill="#fff"><circle cx="4" cy="4" r="1"/><circle cx="10" cy="4" r="1"/><circle cx="16" cy="4" r="1"/><circle cx="7" cy="9" r="1"/><circle cx="13" cy="9" r="1"/><circle cx="4" cy="14" r="1"/><circle cx="10" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></g>',
    '0 0 48 34',
  ),
  es: svg(
    '<rect width="48" height="34" rx="4" fill="#aa151b"/><rect y="8.5" width="48" height="17" fill="#f1bf00"/><rect x="11" y="12" width="6" height="10" rx="1.5" fill="#aa151b" opacity=".8"/>',
    '0 0 48 34',
  ),
};
