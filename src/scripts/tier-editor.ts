// The tier list editor: cards move by dragging or by tapping a card and then a tier, the pool narrows by
// search and franchise, and the list is saved in this browser with every move.
import Sortable from 'sortablejs';
import { TIER_IDS, type CardSize, type TierId } from '../lib/tiers';
import { bottomBar, byName, canHover, data, hoverPanel } from './tier-common';

type Tiers = Record<TierId, string[]>;
type State = { v: 1; title: string; name: string; size: CardSize; tiers: Tiers };
const KEY = 'rbrwt.tierlist';
const SIZES: CardSize[] = ['s', 'm', 'l'];

const work = document.getElementById('tl-work')!;
const poolZone = work.querySelector<HTMLElement>('[data-zone="pool"]')!;
const zones = new Map<string, HTMLElement>();
work.querySelectorAll<HTMLElement>('.tl-zone').forEach((z) => zones.set(z.dataset.zone!, z));
const cards = new Map<string, HTMLElement>();
work.querySelectorAll<HTMLElement>('.tc').forEach((c) => cards.set(c.dataset.player!, c));
const orderAt = new Map(data.order.map((n, i) => [n, i]));
const none = document.getElementById('tl-none')!;
const poolCount = document.getElementById('tl-pool-n')!;

const emptyTiers = () => Object.fromEntries(TIER_IDS.map((id) => [id, [] as string[]])) as Tiers;

// A list saved on an earlier visit: merged players carried over through the aliases, unknown or repeated
// names dropped, anything malformed ignored.
function normalise(raw: any): State {
  const s: State = { v: 1, title: '', name: '', size: 'm', tiers: emptyTiers() };
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.title === 'string') s.title = raw.title.slice(0, 48);
  if (typeof raw.name === 'string') s.name = raw.name.slice(0, 32);
  if (SIZES.includes(raw.size)) s.size = raw.size;
  const seen = new Set<string>();
  for (const id of TIER_IDS) {
    const listed = Array.isArray(raw.tiers?.[id]) ? raw.tiers[id] : [];
    for (const n of listed) {
      if (typeof n !== 'string') continue;
      const name = data.aliases[n] ?? n;
      if (!cards.has(name) || seen.has(name)) continue;
      seen.add(name);
      s.tiers[id].push(name);
    }
  }
  return s;
}

function readSaved(): unknown {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
const state = normalise(readSaved());
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: the list lasts as long as the tab */ }
}

// ---------------------------------------------------------------- the board
function sortPool() {
  const inPool = [...poolZone.querySelectorAll<HTMLElement>('.tc')];
  inPool.sort((a, b) => (orderAt.get(a.dataset.player!) ?? 1e9) - (orderAt.get(b.dataset.player!) ?? 1e9));
  poolZone.append(...inPool);
}
function applyTiers(tiers: Tiers) {
  for (const c of cards.values()) poolZone.appendChild(c);
  for (const id of TIER_IDS) for (const n of tiers[id] ?? []) { const c = cards.get(n); if (c) zones.get(id)!.appendChild(c); }
  sortPool();
}
const placed = () => TIER_IDS.reduce((n, id) => n + state.tiers[id].length, 0);

let query = '';
let team = '';
function filter() {
  let inPool = 0;
  let shown = 0;
  poolZone.querySelectorAll<HTMLElement>('.tc').forEach((c) => {
    inPool++;
    const ok = (!query || c.dataset.player!.toLowerCase().includes(query)) && (!team || c.dataset.teams!.split(' ').includes(team));
    c.classList.toggle('is-hidden', !ok);
    if (ok) shown++;
  });
  work.querySelectorAll<HTMLElement>('.tl-board .tc.is-hidden').forEach((c) => c.classList.remove('is-hidden'));
  none.hidden = shown > 0 || inPool === 0;
}

// Read the board back into the state, then counts, filter and save.
function commit() {
  for (const id of TIER_IDS) state.tiers[id] = [...zones.get(id)!.querySelectorAll<HTMLElement>('.tc')].map((c) => c.dataset.player!);
  for (const id of TIER_IDS) {
    const n = work.querySelector(`[data-count="${id}"]`);
    if (n) n.textContent = String(state.tiers[id].length);
  }
  poolCount.textContent = String(cards.size - placed());
  filter();
  save();
}

// ---------------------------------------------------------------- tapping
let dragging = false;
let justDragged = false;
let sel: HTMLElement | null = null;
const pop = hoverPanel(work, () => dragging);
const bar = bottomBar({ tiers: true, onPlace: (to) => place(to), onClose: () => deselect() });

function select(c: HTMLElement) {
  sel?.classList.remove('is-sel');
  sel = c;
  c.classList.add('is-sel');
  work.classList.add('has-sel');
  const p = byName.get(c.dataset.player!);
  if (p && !canHover.matches) bar.show(p);
}
function deselect() {
  sel?.classList.remove('is-sel');
  sel = null;
  work.classList.remove('has-sel');
  bar.hide();
}
function place(to: string) {
  if (!sel) return;
  const c = sel;
  const zone = to === 'pool' ? poolZone : zones.get(to);
  if (!zone) return;
  deselect();
  zone.appendChild(c);
  if (zone === poolZone) sortPool();
  commit();
  c.classList.remove('is-new');
  void c.offsetWidth;
  c.classList.add('is-new');
}

work.addEventListener('click', (e) => {
  if (justDragged) return;
  const t = e.target as Element;
  const card = t.closest<HTMLElement>('.tc');
  if (card) { if (card === sel) deselect(); else select(card); return; }
  if (!sel) return;
  const plate = t.closest<HTMLElement>('[data-place]');
  if (plate) { place(plate.dataset.place!); return; }
  const row = t.closest<HTMLElement>('.tl-row');
  if (row) { place(row.dataset.tier!); return; }
  if (t.closest('.tl-pool-zone, .tl-none')) place('pool');
});
work.addEventListener('keydown', (e) => {
  const card = (e.target as Element).closest<HTMLElement>('.tc');
  if (!card || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  if (card === sel) deselect(); else select(card);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { deselect(); pop.hide(); }
});
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (sel && !work.contains(t) && !bar.el.contains(t)) deselect();
});

// ---------------------------------------------------------------- dragging
// A mouse drags at once; a finger holds for a moment first, so the page still scrolls under a swipe.
// The flying card is appended to <body>, which is why the size class lives there.
for (const [id, zone] of zones) {
  Sortable.create(zone, {
    group: 'tl',
    sort: id !== 'pool',
    draggable: '.tc',
    animation: 160,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 5,
    fallbackClass: 'tc-fly',
    ghostClass: 'tc-ghost',
    chosenClass: 'tc-chosen',
    delay: 180,
    delayOnTouchOnly: true,
    touchStartThreshold: 6,
    scroll: true,
    bubbleScroll: true,
    scrollSensitivity: 90,
    scrollSpeed: 18,
    onStart() {
      dragging = true;
      pop.hide();
      deselect();
      document.body.classList.add('tl-dragging');
    },
    onEnd(e: { to: HTMLElement }) {
      dragging = false;
      document.body.classList.remove('tl-dragging');
      if (e.to === poolZone) sortPool();
      commit();
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 0);
    },
  });
}

// ---------------------------------------------------------------- tools
const search = document.getElementById('tl-search') as HTMLInputElement;
search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); filter(); });

const teamButtons = [...document.querySelectorAll<HTMLButtonElement>('.tl-team')];
teamButtons.forEach((b) => b.addEventListener('click', () => {
  team = b.dataset.team === team ? '' : b.dataset.team!;
  teamButtons.forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.team === team)));
  filter();
}));

const sizeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-size]')];
function setSize(s: CardSize) {
  state.size = s;
  work.classList.remove(...SIZES.map((x) => `size-${x}`));
  document.body.classList.remove(...SIZES.map((x) => `size-${x}`));
  document.body.classList.add(`size-${s}`);
  sizeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === s)));
}
sizeButtons.forEach((b) => b.addEventListener('click', () => { setSize(b.dataset.size as CardSize); save(); }));

const title = document.getElementById('tl-title') as HTMLInputElement;
const name = document.getElementById('tl-name') as HTMLInputElement;
title.value = state.title;
name.value = state.name;
title.addEventListener('input', () => { state.title = title.value; save(); });
name.addEventListener('input', () => { state.name = name.value; save(); });

// Reset and replacing the list ask once more on the button itself.
function confirmable(btn: HTMLButtonElement | null, ask: string, run: () => void) {
  if (!btn) return;
  const idle = btn.textContent;
  let timer = 0;
  const disarm = () => { clearTimeout(timer); btn.classList.remove('is-armed'); btn.textContent = idle; };
  btn.addEventListener('click', () => {
    if (!placed() || btn.classList.contains('is-armed')) { disarm(); run(); return; }
    btn.classList.add('is-armed');
    btn.textContent = ask;
    timer = window.setTimeout(disarm, 4000);
  });
  btn.addEventListener('blur', disarm);
}
confirmable(document.getElementById('tl-reset') as HTMLButtonElement, 'Confirm reset', () => {
  deselect();
  applyTiers(emptyTiers());
  commit();
});
confirmable(document.getElementById('tl-official') as HTMLButtonElement | null, 'Replace your list?', () => {
  if (!data.official) return;
  deselect();
  applyTiers(data.official.tiers);
  commit();
});

const exportButton = document.getElementById('tl-export') as HTMLButtonElement;
exportButton.addEventListener('click', async () => {
  if (exportButton.disabled) return;
  const idle = exportButton.textContent;
  exportButton.disabled = true;
  exportButton.textContent = 'Exporting';
  try {
    const { exportPoster } = await import('./tier-poster');
    await exportPoster(state, data);
    exportButton.textContent = idle;
  } catch (err) {
    console.error(err);
    exportButton.textContent = 'Export failed';
    await new Promise((r) => setTimeout(r, 2000));
    exportButton.textContent = idle;
  } finally {
    exportButton.disabled = false;
  }
});

// ---------------------------------------------------------------- start
applyTiers(state.tiers);
setSize(state.size);
commit();
