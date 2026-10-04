// Export PNG: the tier list drawn as a 1920px-wide broadcast poster, entirely in the browser, the same
// whatever the screen. Loaded only when someone presses Export.
import { AWARD_LIST, CARD, TIERS, drawAward, drawStars, type CardSize, type TierId } from '../lib/tiers';
import type { Data, Player } from './tier-common';

type Input = { title: string; name: string; size: CardSize; tiers: Record<TierId, string[]> };

const SANS = '"PP Neue Montreal", "Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = '"Kode Mono", ui-monospace, monospace';
const C = { abyss: '#030A1F', deep: '#061433', text: '#F2F6FF', text2: '#A9BAE0', text3: '#7F93C4', gold: '#FDE80A' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const W = 1920; // poster width
const M = 80; // side margin
const K = 1.25; // cards are drawn a quarter larger than on screen
const HEAD = 232; // where the first tier starts
const PLATE = 230;
const GAP = 14;
const PAD = 18; // above and below a row's cards
const COUNT = 72;
const EMPTY = 72; // an empty tier's height
const ZONE_X = M + PLATE + 24;

type Imgs = Map<string, HTMLImageElement | null>;

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  return new Promise((done) => {
    if (!src) return done(null);
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}

// Letter spacing where the browser draws it; elsewhere text simply runs a touch tighter.
function track(ctx: CanvasRenderingContext2D, em: number, size: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${(em * size).toFixed(2)}px`;
}

// Text that would run past its space is cut and faded into the background, as names are on the site.
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, bg: [number, number, number]) {
  if (ctx.measureText(text).width <= maxW) { ctx.fillText(text, x, y); return; }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - size * 0.3, maxW, size * 1.6);
  ctx.clip();
  ctx.fillText(text, x, y);
  const fade = Math.min(24, maxW / 3);
  const g = ctx.createLinearGradient(x + maxW - fade, 0, x + maxW, 0);
  g.addColorStop(0, `rgba(${bg.join(',')},0)`);
  g.addColorStop(1, `rgba(${bg.join(',')},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(x + maxW - fade, y - size * 0.3, fade, size * 1.6);
  ctx.restore();
}

// The field's two stripes, the same 118° bands as the site's cards.
function stripes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  const a = (118 * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  const clear = 'rgba(0,0,0,0)';
  for (const [at, c] of [[0, clear], [0.5, clear], [0.5, color], [0.55, color], [0.55, clear], [0.6, clear], [0.6, color], [0.615, color], [0.615, clear], [1, clear]] as [number, string][]) {
    g.addColorStop(at, c);
  }
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

function drawCard(ctx: CanvasRenderingContext2D, p: Player, data: Data, imgs: Imgs, x: number, y: number, size: CardSize) {
  const m = CARD[size];
  const s = K;
  const w = m.w * s, h = m.h * s, cut = 8 * s, fh = m.field * s, pad = m.pad * s;
  const f = p.team ? data.franchises[p.team] : null;
  const ink = f?.ink ?? C.text;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = C.deep;
  ctx.fillRect(x, y, w, h);

  // The field: colour, stripes, the logo off the right edge, a pfp at the bottom left if there is one.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, fh);
  ctx.clip();
  ctx.fillStyle = f?.primary ?? '#0F2658';
  ctx.fillRect(x, y, w, fh);
  if (f) stripes(ctx, x, y, w, fh, f.secondary);
  const logo = p.team ? imgs.get(`logo:${p.team}`) : null;
  if (logo) {
    const lw = w * 0.74;
    ctx.drawImage(logo, x + w * 0.42, y + fh / 2 - lw / 2, lw, lw);
  }
  const pfp = p.pfp ? imgs.get(`pfp:${p.name}`) : null;
  if (pfp && size !== 's') {
    const ps = fh * 0.36;
    ctx.drawImage(pfp, x + 6 * s, y + fh - ps - 5 * s, ps, ps);
    ctx.strokeStyle = ink;
    ctx.lineWidth = s;
    ctx.strokeRect(x + 6 * s, y + fh - ps - 5 * s, ps, ps);
  }
  ctx.restore();

  // The rim round the whole card, along both cuts, in the franchise's brighter colour. The card's clip keeps
  // the inner half of the stroke.
  if (f) {
    ctx.strokeStyle = f.rim;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
    ctx.stroke();
  }

  // The code chip.
  ctx.textBaseline = 'middle';
  const code = p.team ?? '';
  ctx.font = `700 ${m.small * s}px ${SANS}`;
  track(ctx, 0.14, m.small * s);
  const chipW = ctx.measureText(code).width + 10 * s;
  const chipH = m.small * s + 5 * s;
  const chipX = x + 6 * s, chipY = y + 6 * s;
  ctx.fillStyle = ink;
  ctx.fillRect(chipX, chipY, chipW, chipH);
  ctx.fillStyle = f?.primary ?? C.deep;
  ctx.fillText(code, chipX + 5 * s, chipY + chipH / 2 + 0.5 * s);


  // Name, kills per game, kills and games.
  ctx.textBaseline = 'top';
  let ty = y + fh + pad;
  ctx.font = `700 ${m.name * s}px ${SANS}`;
  track(ctx, -0.01, m.name * s);
  ctx.fillStyle = C.text;
  fitText(ctx, p.name, x + pad, ty, w - pad * 2, m.name * s, [6, 20, 51]);
  ty += m.name * s * 1.15 + 5 * s;
  if (p.games) {
    const kpg = p.kpg.toFixed(2);
    ctx.font = `600 ${m.kpg * s}px ${MONO}`;
    track(ctx, 0, 0);
    ctx.fillText(kpg, x + pad, ty);
    const kw = ctx.measureText(kpg).width;
    ctx.font = `500 ${m.tiny * s}px ${MONO}`;
    track(ctx, 0.12, m.tiny * s);
    ctx.fillStyle = C.text3;
    ctx.fillText('K/G', x + pad + kw + 4 * s, ty + (m.kpg - m.tiny) * s * 0.72);
    ty += m.kpg * s + 4 * s;
    ctx.font = `500 ${m.small * s}px ${MONO}`;
    track(ctx, 0, 0);
    ctx.fillStyle = C.text2;
    ctx.fillText(`${p.kills} K · ${p.games} G`, x + pad, ty);
  } else {
    ctx.font = `500 ${m.tiny * s}px ${MONO}`;
    track(ctx, 0.1, m.tiny * s);
    ctx.fillStyle = C.text3;
    ctx.fillText('NO S1 GAMES', x + pad, ty + 2 * s);
  }

  // Award icons with counts along the bottom.
  const icon = m.icon * s;
  let ax = x + pad;
  const ay = y + h - pad + s - icon;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${m.tiny * s}px ${MONO}`;
  track(ctx, 0, 0);
  ctx.fillStyle = C.text2;
  for (const a of AWARD_LIST) {
    const n = p.awards[a]?.length;
    if (!n) continue;
    drawAward(ctx, a, ax, ay, icon);
    ax += icon + s;
    ctx.fillStyle = C.text2;
    ctx.fillText(`×${n}`, ax, ay + icon / 2);
    ax += ctx.measureText(`×${n}`).width + 5 * s;
  }
  ctx.restore();
}

function today() {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export async function exportPoster(input: Input, data: Data) {
  const m = CARD[input.size];
  const cw = m.w * K, ch = m.h * K;
  const zoneW = W - M - COUNT - ZONE_X;
  const perLine = Math.max(1, Math.floor((zoneW + GAP) / (cw + GAP)));
  const players = new Map(data.players.map((p) => [p.name, p]));
  const rows = TIERS.map((t) => {
    const list = (input.tiers[t.id] ?? []).map((n) => players.get(n)).filter((p): p is Player => !!p);
    const lines = Math.ceil(list.length / perLine);
    return { t, list, h: list.length ? lines * ch + (lines - 1) * GAP + PAD * 2 : EMPTY };
  });
  const footY = HEAD + rows.reduce((n, r) => n + r.h, 0) + (rows.length - 1) * 4 + 40;
  const H = footY + 100;

  // Fonts and images first, so nothing draws in a fallback face or with a hole where a logo goes.
  await Promise.all([`600 40px ${MONO}`, `500 20px ${MONO}`, `700 40px ${SANS}`].map((f) => document.fonts.load(f))).catch(() => undefined);
  const wanted = new Map<string, string | null>([['wordmark', data.wordmark]]);
  for (const r of rows) {
    for (const p of r.list) {
      if (p.team) wanted.set(`logo:${p.team}`, data.franchises[p.team]?.logo ?? null);
      if (p.pfp) wanted.set(`pfp:${p.name}`, p.pfp);
    }
  }
  const imgs: Imgs = new Map();
  await Promise.all([...wanted].map(async ([k, src]) => { imgs.set(k, await loadImage(src)); }));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');

  // The water, darkening downwards, with light falling from the surface.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  const at = (px: number) => Math.min(1, px / H);
  bg.addColorStop(0, '#0428B8');
  bg.addColorStop(at(260), '#05209A');
  bg.addColorStop(at(640), '#071A6E');
  bg.addColorStop(at(1100), '#061541');
  bg.addColorStop(at(1700), C.abyss);
  bg.addColorStop(1, C.abyss);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const rays = ctx.createLinearGradient(0, 0, 0, 900);
  rays.addColorStop(0, 'rgba(160,210,255,0.08)');
  rays.addColorStop(1, 'rgba(160,210,255,0)');
  ctx.fillStyle = rays;
  const lean = Math.tan((14 * Math.PI) / 180) * 900;
  for (let rx = 0; rx < W + lean; rx += 150) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + 46, 0);
    ctx.lineTo(rx + 46 - lean, 900);
    ctx.lineTo(rx - lean, 900);
    ctx.closePath();
    ctx.fill();
  }

  // Head: the wordmark, "Tier list" over the title, a gold rule.
  const wm = imgs.get('wordmark');
  let wmW = 0;
  if (wm) {
    wmW = (64 * wm.naturalWidth) / wm.naturalHeight;
    ctx.drawImage(wm, M, 66, wmW, 64);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 16px ${MONO}`;
  track(ctx, 0.16, 16);
  ctx.fillStyle = C.gold;
  ctx.fillText('TIER LIST', W - M, 86);
  const lw = ctx.measureText('TIER LIST').width;
  ctx.fillRect(W - M - lw - 17, 75, 7, 7);
  const title = (input.title.trim() || 'RBRWT S2 Tier List').toUpperCase();
  const room = W - 2 * M - wmW - 64;
  let size = 64;
  for (; size > 36; size -= 2) {
    ctx.font = `700 ${size}px ${SANS}`;
    track(ctx, -0.03, size);
    if (ctx.measureText(title).width <= room) break;
  }
  ctx.font = `700 ${size}px ${SANS}`;
  track(ctx, -0.03, size);
  ctx.fillStyle = C.text;
  ctx.fillText(title, W - M, 152);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(253,232,10,0.75)';
  ctx.fillRect(M, 190, W - 2 * M, 2);
  ctx.fillStyle = C.gold;
  ctx.fillRect(M, 189, 160, 4);

  // The tiers.
  let y = HEAD;
  for (const r of rows) {
    ctx.fillStyle = 'rgba(6,20,51,0.72)';
    ctx.fillRect(M, y, W - 2 * M, r.h);
    const sl = 14;
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(M + PLATE, y);
    ctx.lineTo(M + PLATE - sl, y + r.h);
    ctx.lineTo(M, y + r.h);
    ctx.closePath();
    ctx.fillStyle = C.abyss;
    ctx.fill();
    drawStars(ctx, r.t, M + 30, y + r.h / 2 - 15, 30, 5);
    r.list.forEach((p, i) => {
      drawCard(ctx, p, data, imgs, ZONE_X + (i % perLine) * (cw + GAP), y + PAD + Math.floor(i / perLine) * (ch + GAP), input.size);
    });
    ctx.font = `500 26px ${MONO}`;
    track(ctx, 0, 0);
    ctx.fillStyle = C.text3;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(r.list.length), W - M - 24, y + r.h / 2);
    ctx.textAlign = 'left';
    y += r.h + 4;
  }

  // Foot: who made it and when, and where the site is.
  ctx.fillStyle = 'rgba(169,186,224,0.28)';
  ctx.fillRect(M, footY, W - 2 * M, 1);
  ctx.font = `500 18px ${MONO}`;
  track(ctx, 0.16, 18);
  ctx.textBaseline = 'middle';
  const maker = input.name.trim();
  ctx.fillStyle = C.text2;
  ctx.fillText([maker && `BY ${maker.toUpperCase()}`, today().toUpperCase()].filter(Boolean).join('  ·  '), M, footY + 50);
  ctx.textAlign = 'right';
  track(ctx, 0.04, 18);
  ctx.fillStyle = C.gold;
  ctx.fillText(data.site, W - M, footY + 50);

  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('PNG failed'))), 'image/png'));
  const file = `${(input.title.trim() || 'rbrwt-s2-tier-list').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'rbrwt-tier-list'}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
