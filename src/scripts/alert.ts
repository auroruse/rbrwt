// The Alert maker. One canvas at 1080×1440 is both the preview and the PNG: the photo on the left, the silver
// rail, the franchise's colour with its logo, the ALERT plate, and the lines of text under it, player names in
// bold over their stars on Kirin's List. The photo moves by dragging it.
import { TIERS, drawStars, type Tier, type TierId } from '../lib/tiers';

type Team = { code: string; name: string; logo: string; bg: string };
type Data = { teams: Team[]; players: string[]; aliases: Record<string, string>; tiers: Record<string, TierId> };
type Block = { kind: 'player' | 'text'; text: string };

const data: Data = JSON.parse(document.getElementById('al-data')?.textContent || '{}');
const canvas = document.getElementById('al-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// The format in the canvas's own pixels, measured off the NFL's own 1080×1440 alerts.
const W = 1080, H = 1440;
const SPLIT = 584; // the photo ends here
const PANEL = 600; // the colour starts here; the silver rail fills the gap
const PLATE = { top: 649, bottom: 808, tip: 531, corner: 586 };
const WORD = { x: 613, base: 785, cap: 108, squeeze: 0.786 };
// The text column: lines wrap past `wrap` (as the NFL breaks theirs) and a block shrinks past `max`.
const COL = { x: 671, top: 870, wrap: 300, max: 363, gap: 32, floor: H - 64 };
type Face = { family: string; weight: number; cap: number; squeeze: number; lead: number };
const BOLD: Face = { family: 'Anton', weight: 400, cap: 63, squeeze: 0.838, lead: 9 };
const LIGHT: Face = { family: 'Antonio', weight: 300, cap: 63, squeeze: 0.85, lead: 10 };
const STARS = { gap: 16, size: 34, step: 5 };
// Every logo the same: its drawing fitted into this box and centred in the panel above the plate.
const LOGO = { cx: (PANEL + W) / 2, cy: PLATE.top / 2, w: 430, h: 490 };

const state = {
  team: data.teams[0]?.code ?? '',
  photo: null as HTMLImageElement | null,
  pzoom: 1, px: 0, py: 0,
  blocks: [{ kind: 'player', text: '' }, { kind: 'text', text: '' }] as Block[],
};

// ---------------------------------------------------------------- type
const capOf = new Map<string, number>();
function px(f: { family: string; weight: number; cap: number }, k = 1): number {
  const key = `${f.weight} 100px "${f.family}"`;
  let r = capOf.get(key);
  if (!r) {
    ctx.font = key;
    r = ctx.measureText('H').actualBoundingBoxAscent / 100 || 0.75;
    if (document.fonts.check(key)) capOf.set(key, r);
  }
  return (f.cap * k) / r;
}
const setFont = (f: Face, k: number) => { ctx.font = `${f.weight} ${px(f, k)}px "${f.family}"`; };
const widthOf = (s: string, f: Face, k: number) => { setFont(f, k); return ctx.measureText(s).width * f.squeeze; };

// The fewest lines that keep under the wrap width, split so the longest line is as short as it can be and no
// line starts on a small word ("EXPECTED TO / START WEEK 3", never "EXPECTED / TO START WEEK 3").
const SMALL = new Set(['A', 'AN', 'THE', 'TO', 'FOR', 'OF', 'IN', 'ON', 'AT', 'BY', 'AND', 'OR', 'WITH', 'FROM', 'AS', 'INTO', 'VS', 'VS.']);
function wrap(line: string, f: Face, k: number): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  for (let n = 1; n <= words.length; n++) {
    let best: string[] | null = null, bestCost = Infinity;
    const cut = (from: number, left: number, acc: string[]) => {
      if (left === 1) {
        const lines = [...acc, words.slice(from).join(' ')];
        const w = Math.max(...lines.map((l) => widthOf(l, f, k)));
        if (w > COL.wrap && n < words.length) return;
        const cost = w + 80 * lines.slice(1).filter((l) => SMALL.has(l.split(' ')[0])).length;
        if (cost < bestCost) { bestCost = cost; best = lines; }
        return;
      }
      for (let to = from + 1; to <= words.length - left + 1; to++) cut(to, left - 1, [...acc, words.slice(from, to).join(' ')]);
    };
    cut(0, n, []);
    if (best) return best;
  }
  return words;
}

// A player's tier on Kirin's List, by their site name or any name they have played under.
const canon = new Map<string, string>();
for (const n of data.players) canon.set(n.toLowerCase(), n);
for (const [a, n] of Object.entries(data.aliases)) canon.set(a.toLowerCase(), n);
function tierOf(name: string): Tier | null {
  const n = canon.get(name.trim().replace(/\s+/g, ' ').toLowerCase());
  const id = n ? data.tiers[n] : undefined;
  return id ? TIERS.find((t) => t.id === id) ?? null : null;
}

type Laid = { lines: string[]; f: Face; k: number; tier: Tier | null };
// A player's name goes first name over the rest, as the NFL sets theirs; a line typed on its own stays one.
function lay(K: number): { items: Laid[]; bottom: number } {
  const items: Laid[] = [];
  for (const b of state.blocks) {
    const typed = b.text.toUpperCase().split('\n').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    if (!typed.length) continue;
    const f = b.kind === 'player' ? BOLD : LIGHT;
    const parts = b.kind === 'player' && typed.length === 1 && typed[0].includes(' ')
      ? [typed[0].slice(0, typed[0].indexOf(' ')), typed[0].slice(typed[0].indexOf(' ') + 1)]
      : typed;
    const lines = parts.flatMap((s) => wrap(s, f, K));
    const widest = Math.max(...lines.map((l) => widthOf(l, f, K)));
    items.push({ lines, f, k: widest > COL.max ? (K * COL.max) / widest : K, tier: b.kind === 'player' ? tierOf(b.text) : null });
  }
  let y = COL.top;
  items.forEach((it, i) => {
    y += it.lines.length * it.f.cap * it.k + (it.lines.length - 1) * it.f.lead * it.k;
    if (it.tier) y += (STARS.gap + STARS.size) * K;
    if (i < items.length - 1) y += COL.gap * K;
  });
  return { items, bottom: y };
}

function text() {
  let K = 1;
  let laid = lay(K);
  if (laid.bottom > COL.floor) {
    K = (COL.floor - COL.top) / (laid.bottom - COL.top);
    laid = lay(K);
  }
  let y = COL.top;
  ctx.fillStyle = '#fff';
  laid.items.forEach((it, i) => {
    it.lines.forEach((s, j) => {
      const base = y + it.f.cap * it.k;
      ctx.save();
      ctx.translate(COL.x, base);
      ctx.scale(it.f.squeeze, 1);
      setFont(it.f, it.k);
      ctx.fillText(s, 0, 0);
      ctx.restore();
      y = base + (j < it.lines.length - 1 ? it.f.lead * it.k : 0);
    });
    if (it.tier) {
      const top = y + STARS.gap * K;
      drawStars(ctx, it.tier, COL.x, top, STARS.size * K, STARS.step * K);
      y = top + STARS.size * K;
    }
    if (i < laid.items.length - 1) y += COL.gap * K;
  });
}

// ---------------------------------------------------------------- the picture
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function photo() {
  const p = state.photo;
  if (!p) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#101a36');
    g.addColorStop(1, '#050a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SPLIT, H);
    return;
  }
  const cover = Math.max(SPLIT / p.naturalWidth, H / p.naturalHeight) * state.pzoom;
  const w = p.naturalWidth * cover, h = p.naturalHeight * cover;
  state.px = clamp(state.px, -(w - SPLIT) / 2, (w - SPLIT) / 2);
  state.py = clamp(state.py, -(h - H) / 2, (h - H) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SPLIT, H);
  ctx.clip();
  ctx.drawImage(p, (SPLIT - w) / 2 + state.px, (H - h) / 2 + state.py, w, h);
  ctx.restore();
}

// Brushed streaks rising to the right, the same every time, made once.
let streaks: HTMLCanvasElement | null = null;
function brushed(): HTMLCanvasElement {
  if (streaks) return streaks;
  streaks = document.createElement('canvas');
  streaks.width = W - PANEL;
  streaks.height = H;
  const s = streaks.getContext('2d')!;
  let seed = 7;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  s.lineCap = 'round';
  s.translate(streaks.width / 2, H / 2);
  s.rotate(-0.42);
  for (let i = 0; i < 360; i++) {
    const x = (rnd() - 0.5) * 1700, y = (rnd() - 0.5) * 1700, len = 80 + rnd() * 420;
    s.lineWidth = 0.6 + rnd() * 2.2;
    s.strokeStyle = rnd() < 0.45 ? `rgba(255,255,255,${(0.015 + rnd() * 0.045).toFixed(3)})` : `rgba(0,0,0,${(0.03 + rnd() * 0.09).toFixed(3)})`;
    s.beginPath();
    s.moveTo(x, y);
    s.lineTo(x + len, y);
    s.stroke();
  }
  return streaks;
}

function panel(bg: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(PANEL, 0, W - PANEL, H);
  const glow = ctx.createRadialGradient(840, 380, 40, 840, 380, 920);
  glow.addColorStop(0, 'rgba(255,255,255,0.10)');
  glow.addColorStop(0.5, 'rgba(255,255,255,0)');
  glow.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = glow;
  ctx.fillRect(PANEL, 0, W - PANEL, H);
  const low = ctx.createLinearGradient(0, 560, 0, H);
  low.addColorStop(0, 'rgba(0,0,0,0)');
  low.addColorStop(1, 'rgba(0,0,0,0.36)');
  ctx.fillStyle = low;
  ctx.fillRect(PANEL, 0, W - PANEL, H);
  ctx.drawImage(brushed(), PANEL, 0);
}

// A logo as it is, with a drop shadow. It is centred on its drawing, not on the transparent square around it.
type Logo = { img: HTMLImageElement; box: { x: number; y: number; w: number; h: number } };
function bounds(img: HTMLImageElement): Logo['box'] {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] < 26) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: x0 / c.width, y: y0 / c.height, w: (x1 - x0 + 1) / c.width, h: (y1 - y0 + 1) / c.height };
}
function logo(l: Logo) {
  const k = Math.min(LOGO.w / (l.box.w * l.img.naturalWidth), LOGO.h / (l.box.h * l.img.naturalHeight));
  const w = l.img.naturalWidth * k, h = l.img.naturalHeight * k;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(l.img, LOGO.cx - (l.box.x + l.box.w / 2) * w, LOGO.cy - (l.box.y + l.box.h / 2) * h, w, h);
  ctx.restore();
}

function rail() {
  const g = ctx.createLinearGradient(SPLIT, 0, PANEL, 0);
  g.addColorStop(0, '#24272d');
  g.addColorStop(0.12, '#aeb2b9');
  g.addColorStop(0.36, '#f4f5f7');
  g.addColorStop(0.62, '#d0d3d8');
  g.addColorStop(0.88, '#868a92');
  g.addColorStop(1, '#2f3238');
  ctx.fillStyle = g;
  ctx.fillRect(SPLIT, 0, PANEL - SPLIT, H);
  const shade = ctx.createLinearGradient(PANEL, 0, PANEL + 16, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.38)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(PANEL, 0, 16, H);
}

function plate() {
  const { top, bottom, tip, corner } = PLATE;
  const mid = (top + bottom) / 2;
  const edge = new Path2D();
  edge.moveTo(tip, mid);
  edge.lineTo(corner, top);
  edge.lineTo(W + 4, top);
  edge.lineTo(W + 4, bottom);
  edge.lineTo(corner, bottom);
  edge.closePath();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = '#9a9da3';
  ctx.fill(edge);
  ctx.restore();

  const body = ctx.createLinearGradient(0, top, 0, bottom);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.5, '#eeeff1');
  body.addColorStop(0.86, '#d5d7db');
  body.addColorStop(1, '#babdc2');
  ctx.fillStyle = body;
  ctx.fill(edge);
  const sheen = ctx.createLinearGradient(tip, 0, W, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0.3)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.07)');
  ctx.fillStyle = sheen;
  ctx.fill(edge);

  // The bevel: a grey band inside the chevron and the bottom edge, a bright line along the top.
  ctx.save();
  ctx.clip(edge);
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(96,100,108,0.55)';
  ctx.stroke(edge);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(corner + 2, top + 1.5);
  ctx.lineTo(W, top + 1.5);
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(30,33,40,0.65)';
  ctx.stroke(edge);

  // ALERT, cut into the metal: a light lip round dark letters.
  ctx.save();
  ctx.translate(WORD.x, WORD.base);
  ctx.scale(WORD.squeeze, 1);
  ctx.font = `400 ${px({ family: 'Anton', weight: 400, cap: WORD.cap })}px "Anton"`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText('ALERT', 0, 0);
  const ink = ctx.createLinearGradient(0, -WORD.cap, 0, 0);
  ink.addColorStop(0, '#3c3e43');
  ink.addColorStop(1, '#101113');
  ctx.fillStyle = ink;
  ctx.fillText('ALERT', 0, 0);
  ctx.restore();
}

const teamOf = (code: string) => data.teams.find((t) => t.code === code);
let shown: Logo | null = null;

function render() {
  ctx.clearRect(0, 0, W, H);
  photo();
  panel(teamOf(state.team)?.bg ?? '#0b1328');
  if (shown) logo(shown);
  rail();
  plate();
  text();
}
let queued = false;
function draw() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    render();
  });
}

// ---------------------------------------------------------------- the controls
const logos = new Map<string, Promise<Logo>>();
function logoFor(t: Team): Promise<Logo> {
  let p = logos.get(t.code);
  if (!p) {
    p = new Promise<HTMLImageElement>((ok, no) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = no;
      img.src = t.logo;
    }).then((img) => ({ img, box: bounds(img) }));
    logos.set(t.code, p);
  }
  return p;
}

const pzoom = document.getElementById('al-pzoom') as HTMLInputElement;
const teamBtns = [...document.querySelectorAll<HTMLButtonElement>('.al-teams [data-team]')];

async function pickTeam(code: string) {
  const t = teamOf(code);
  if (!t) return;
  state.team = code;
  teamBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.team === code)));
  shown = null;
  draw();
  const l = await logoFor(t);
  if (state.team === code) {
    shown = l;
    draw();
  }
}
teamBtns.forEach((b) => b.addEventListener('click', () => pickTeam(b.dataset.team!)));
pzoom.addEventListener('input', () => { state.pzoom = +pzoom.value; draw(); });

// The photo: picked from a file or dropped on the picture.
const fileIn = document.getElementById('al-photo') as HTMLInputElement;
const hint = document.getElementById('al-drop') as HTMLElement;
function usePhoto(file: File) {
  if (!file.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = () => {
    if (state.photo) URL.revokeObjectURL(state.photo.src);
    state.photo = img;
    state.px = state.py = 0;
    state.pzoom = 1;
    pzoom.value = '1';
    hint.hidden = true;
    draw();
  };
  img.src = URL.createObjectURL(file);
}
fileIn.addEventListener('change', () => {
  const f = fileIn.files?.[0];
  if (f) usePhoto(f);
  fileIn.value = '';
});
const stage = document.getElementById('al-stage')!;
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) usePhoto(f);
});

// Dragging the photo moves it.
let drag: { x: number; y: number } | null = null;
const at = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
};
const onPhoto = (p: { x: number; y: number }) => !!state.photo && p.x < SPLIT;
canvas.addEventListener('pointerdown', (e) => {
  const p = at(e);
  if (!onPhoto(p)) return;
  drag = p;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
});
canvas.addEventListener('pointermove', (e) => {
  const p = at(e);
  if (!drag) {
    canvas.classList.toggle('can-drag', onPhoto(p));
    return;
  }
  state.px += p.x - drag.x;
  state.py += p.y - drag.y;
  drag = p;
  draw();
});
const letGo = () => {
  drag = null;
  canvas.classList.remove('is-dragging');
};
canvas.addEventListener('pointerup', letGo);
canvas.addEventListener('pointercancel', letGo);

// The text: blocks of either kind, in order.
const list = document.getElementById('al-blocks')!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function renderBlocks() {
  list.innerHTML = state.blocks.map((b, i) => `<li class="al-block" data-i="${i}">
      <span class="al-kind">${b.kind === 'player' ? 'Player' : 'Text'}</span>
      ${b.kind === 'player'
        ? `<input type="text" list="al-players" value="${esc(b.text)}" placeholder="Player" autocomplete="off" spellcheck="false" aria-label="Player">`
        : `<textarea rows="2" placeholder="Text" spellcheck="false" aria-label="Text">${esc(b.text)}</textarea>`}
      <span class="al-acts">
        <button type="button" class="al-mini" data-act="up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>&uarr;</button>
        <button type="button" class="al-mini" data-act="down" aria-label="Move down"${i === state.blocks.length - 1 ? ' disabled' : ''}>&darr;</button>
        <button type="button" class="al-mini" data-act="del" aria-label="Remove">&times;</button>
      </span>
    </li>`).join('');
}
list.addEventListener('input', (e) => {
  const li = (e.target as Element).closest<HTMLElement>('.al-block');
  if (!li) return;
  state.blocks[+li.dataset.i!].text = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  draw();
});
list.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>('[data-act]');
  const li = btn?.closest<HTMLElement>('.al-block');
  if (!btn || !li) return;
  const i = +li.dataset.i!;
  const b = state.blocks;
  if (btn.dataset.act === 'del') b.splice(i, 1);
  else {
    const j = btn.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= b.length) return;
    [b[i], b[j]] = [b[j], b[i]];
  }
  renderBlocks();
  draw();
});
function add(kind: Block['kind']) {
  state.blocks.push({ kind, text: '' });
  renderBlocks();
  list.querySelector<HTMLElement>('.al-block:last-child input, .al-block:last-child textarea')?.focus();
}
document.getElementById('al-add-player')!.addEventListener('click', () => add('player'));
document.getElementById('al-add-text')!.addEventListener('click', () => add('text'));

// Export: the canvas is already the picture at full size.
const exportBtn = document.getElementById('al-export') as HTMLButtonElement;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'alert';
exportBtn.addEventListener('click', () => {
  exportBtn.disabled = true;
  render();
  canvas.toBlob((blob) => {
    exportBtn.disabled = false;
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const who = state.blocks.find((b) => b.kind === 'player' && b.text.trim())?.text ?? state.team;
    a.download = `rbrwt-alert-${slug(who)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});

renderBlocks();
pickTeam(state.team);
Promise.all(['400 100px "Anton"', '300 100px "Antonio"'].map((f) => document.fonts.load(f))).finally(() => {
  capOf.clear();
  draw();
});
