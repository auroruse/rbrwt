// What both Tier List pages do in the browser: read the page's data, build a player's detail panel, and show
// it beside a hovered or focused card (mouse) or in the bar along the bottom (touch).
import { AWARD_LIST, AWARD_NAMES, TIERS, starsSVG, tierLabel, type Award, type TierId } from '../lib/tiers';

export type Player = {
  name: string; team: string | null; teams: string[]; s2: { code: string; role: 'Starter' | 'Sub' } | null;
  kills: number; games: number; kpg: number; rank: number | null; low: boolean;
  awards: Partial<Record<Award, string[]>>; titles: string[];
  tours: { num: string; team: string | null; kills: number; games: number }[];
  best: { kills: number; tours: string[] } | null; pfp: string | null;
};
export type Franchise = { name: string; primary: string; secondary: string; ink: string; logo: string | null };
export type Data = {
  players: Player[]; franchises: Record<string, Franchise>; order: string[]; aliases: Record<string, string>;
  official: { title: string | null; by: string | null; tiers: Record<TierId, string[]> } | null;
  wordmark: string; site: string;
};

export const data: Data = JSON.parse(document.getElementById('tl-data')?.textContent || '{}');
export const byName = new Map(data.players.map((p) => [p.name, p]));
export const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const pad2 = (n: number) => String(n).padStart(2, '0');
const styleOf = (code: string | null) => {
  const f = code ? data.franchises[code] : null;
  return f ? `--p:${f.primary};--s:${f.secondary};--ink-on:${f.ink}` : '';
};
const mark = (code: string | null, cls = '') => {
  if (!code) return '';
  const f = data.franchises[code];
  return f?.logo
    ? `<img class="${cls}" src="${f.logo}" alt="${esc(`${code} ${f.name}`)}" title="${esc(`${code} ${f.name}`)}">`
    : `<i class="chip" style="${styleOf(code)}">${esc(code)}</i>`;
};
const icon = (a: Award) => `<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#aw-${a}"/></svg>`;

const chips = (tours: string[]) => `<span class="tp-chips">${tours.map((n) => `<i class="tp-chip">${n}</i>`).join('')}</span>`;

export function detailHTML(p: Player): string {
  const f = p.team ? data.franchises[p.team] : null;
  const head = `<div class="tp-head" style="${styleOf(p.team)}">${mark(p.team, 'tp-logo')}
    <div class="tp-who"><span class="tp-name slide"><b>${esc(p.name)}</b></span><span class="tp-team">${f ? `${esc(p.team!)} ${esc(f.name)}` : ''}</span></div></div>`;
  const figs = p.games
    ? `<div class="tp-figs"><span class="tf"><b>${p.kpg.toFixed(2)}</b><em>K/G</em></span><span class="tf"><b>${p.kills}</b><em>Kills</em></span>
        <span class="tf"><b>${p.games}</b><em>Games</em></span><span class="tf"><b>${p.rank ? pad2(p.rank) : ''}</b><em>Rank</em></span></div>
        ${p.low ? '<p class="tp-note">Under 10 games</p>' : ''}`
    : '<p class="tp-note tp-empty">No S1 games</p>';
  // Under the figures: most kills in a game and titles, each a figure over its tours as chips; then awards,
  // when there are any.
  const stat = (label: string, n: number, unit: string, tours: string[]) =>
    `<div class="tp-stat"><span class="tp-k">${label}</span><span class="tp-v"><b>${n}</b>${unit ? `<em>${unit}</em>` : ''}</span>${chips(tours)}</div>`;
  const stats: string[] = [];
  if (p.best) stats.push(stat('Most kills in a game', p.best.kills, '', p.best.tours));
  if (p.titles.length) stats.push(stat('Titles', p.titles.length, '', p.titles));
  const won = AWARD_LIST.filter((a) => p.awards[a]?.length);
  const awards = won.length
    ? `<div class="tp-row"><span class="tp-k">Awards</span><span class="tp-boxes">${won.map((a) =>
        `<span class="tp-box" title="${AWARD_NAMES[a]}">${icon(a)}<b>${a}</b>${chips(p.awards[a]!)}</span>`).join('')}</span></div>`
    : '';
  const tours = p.tours.length
    ? `<table class="tp-tours"><thead><tr><th>Tour</th><th>Team</th><th>K</th><th>G</th><th>K/G</th></tr></thead><tbody>${p.tours.map((t) =>
        `<tr><td>${t.num}</td><td>${mark(t.team)}</td><td>${t.kills}</td><td>${t.games}</td><td>${t.games ? (t.kills / t.games).toFixed(2) : ''}</td></tr>`).join('')}</tbody></table>`
    : '';
  return `<div class="tp">${head}${figs}${stats.length ? `<div class="tp-stats">${stats.join('')}</div>` : ''}${awards}${tours}</div>`;
}

// A card's name that is too long for its space slides under a fade, as names do across the site.
export function fitName(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('.tp-name.slide');
  const inner = box?.firstElementChild as HTMLElement | null;
  if (!box || !inner) return;
  const over = inner.getBoundingClientRect().width - box.clientWidth;
  box.classList.toggle('is-over', over > 1);
  if (over > 1) {
    box.style.setProperty('--slide-by', `${-(over + 26).toFixed(1)}px`);
    box.style.setProperty('--slide-dur', `${Math.max(3, (over + 26) / 30 + 2.4).toFixed(2)}s`);
  }
}

// The readout beside a card or a name, for a mouse; keyboard focus opens it too.
export function hoverPanel(root: HTMLElement, busy: () => boolean, selector = '.tc') {
  const pop = document.getElementById('tl-pop')!;
  let timer = 0;
  let shown: HTMLElement | null = null;
  let warmUntil = 0;
  const hide = () => {
    clearTimeout(timer);
    if (shown) warmUntil = performance.now() + 300;
    shown = null;
    pop.hidden = true;
  };
  const show = (card: HTMLElement) => {
    const p = byName.get(card.dataset.player || '');
    if (!p || busy()) return;
    shown = card;
    pop.innerHTML = detailHTML(p);
    pop.hidden = false;
    fitName(pop);
    const r = card.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight, gap = 12;
    let x = r.right + gap;
    if (x + w > innerWidth - 12) x = r.left - gap - w;
    if (x < 12) x = Math.max(12, Math.min(innerWidth - w - 12, r.left));
    const y = Math.max(76, Math.min(r.top + r.height / 2 - h / 2, innerHeight - h - 12));
    pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  const soon = (card: HTMLElement) => {
    if (card === shown) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => show(card), performance.now() < warmUntil || shown ? 0 : 160);
  };
  root.addEventListener('focusin', (e) => {
    const card = (e.target as Element).closest<HTMLElement>(selector);
    if (card && card.matches(':focus-visible')) soon(card);
  });
  root.addEventListener('focusout', hide);
  if (canHover.matches) {
    root.addEventListener('pointerover', (e) => {
      const card = (e.target as Element).closest<HTMLElement>(selector);
      if (card) soon(card);
    });
    root.addEventListener('pointerout', (e) => {
      const card = (e.target as Element).closest<HTMLElement>(selector);
      if (card && !card.contains(e.relatedTarget as Node | null)) hide();
    });
  }
  addEventListener('scroll', hide, { passive: true, capture: true });
  return { hide };
}

// The bar along the bottom for touch screens: the details, and in the editor the tiers to place the card in.
export function bottomBar(opts: { tiers: boolean; onPlace?: (to: string) => void; onClose: () => void }) {
  const bar = document.getElementById('tl-bar')!;
  bar.addEventListener('click', (e) => {
    const t = e.target as Element;
    const to = t.closest<HTMLElement>('[data-place]');
    if (to) opts.onPlace?.(to.dataset.place!);
    else if (t.closest('.tl-bar-x')) opts.onClose();
  });
  return {
    el: bar,
    show(p: Player) {
      const tiers = opts.tiers
        ? `<div class="tl-bar-tiers" role="group" aria-label="Place in">${TIERS.map((t) =>
            `<button type="button" data-place="${t.id}" aria-label="${tierLabel(t)}">${starsSVG(t)}</button>`).join('')}
            <button type="button" class="tl-bar-pool" data-place="pool">Unranked</button></div>`
        : '';
      bar.innerHTML = `<button type="button" class="tl-bar-x">Close</button>${tiers}${detailHTML(p)}`;
      bar.hidden = false;
      fitName(bar);
      bar.scrollTop = 0;
    },
    hide() {
      bar.hidden = true;
      bar.innerHTML = '';
    },
  };
}
