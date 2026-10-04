/** Mini helper para criar elementos sem framework. */
type Props = Record<string, unknown> & {
  class?: string;
  html?: string;
  text?: string;
  onClick?: (e: MouseEvent) => void;
  style?: string;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: (Node | string | null | undefined | false)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'onClick') el.addEventListener('click', v as (e: Event) => void);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k in el && typeof v !== 'string') (el as any)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

/** Atualiza textContent só se mudou (evita relayout). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}

export function toggleClass(el: HTMLElement, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;
