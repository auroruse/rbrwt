// The Tier List's fixed parts, used at build time by the pages and in the browser by the editor and
// the poster: the nine tiers and their minerals, the faceted stars, the award icons and the card sizes.
// Nothing here may touch Node or the DOM at load, since both sides import it.

export type TierId = '5' | '4.5' | '4' | '3.5' | '3' | '2.5' | '2' | '1.5' | '1';
export type Mineral = { name: string; light: string; mid: string; dark: string; edge: string };
export type Tier = { id: TierId; stars: number; mineral: Mineral };

export const TIERS: Tier[] = [
  { id: '5', stars: 5, mineral: { name: 'Amethyst', light: '#E4CCFF', mid: '#A970F0', dark: '#6A31C2', edge: '#2B0D62' } },
  { id: '4.5', stars: 4.5, mineral: { name: 'Ruby', light: '#FF9DB4', mid: '#E8265E', dark: '#A20E3C', edge: '#4F0519' } },
  { id: '4', stars: 4, mineral: { name: 'Emerald', light: '#9AF7C9', mid: '#22C783', dark: '#0B8754', edge: '#033D25' } },
  { id: '3.5', stars: 3.5, mineral: { name: 'Diamond', light: '#FFFFFF', mid: '#CDEFFF', dark: '#86C9EA', edge: '#2F7AA3' } },
  { id: '3', stars: 3, mineral: { name: 'Platinum', light: '#FBFAF6', mid: '#DEDCE6', dark: '#A7A3B8', edge: '#55516A' } },
  { id: '2.5', stars: 2.5, mineral: { name: 'Gold', light: '#FFF2A1', mid: '#F6C734', dark: '#BF8812', edge: '#5E3D04' } },
  { id: '2', stars: 2, mineral: { name: 'Silver', light: '#EDF0F3', mid: '#B3BAC3', dark: '#757D88', edge: '#3A414B' } },
  { id: '1.5', stars: 1.5, mineral: { name: 'Copper', light: '#FFBF93', mid: '#D9773F', dark: '#99461C', edge: '#4A1E07' } },
  { id: '1', stars: 1, mineral: { name: 'Wood', light: '#CF9C66', mid: '#9C6A3A', dark: '#6A4321', edge: '#33200D' } },
];
export const TIER_IDS: TierId[] = TIERS.map((t) => t.id);
export const tierLabel = (t: Tier) => `${t.stars} ${t.stars === 1 ? 'star' : 'stars'}`;

// Card sizes in px. The stylesheet's .size-s/.size-m/.size-l carry the same numbers; the poster draws from these.
export type CardSize = 's' | 'm' | 'l';
export const CARD: Record<CardSize, { w: number; h: number; field: number; name: number; kpg: number; small: number; tiny: number; pad: number; icon: number }> = {
  s: { w: 84, h: 116, field: 44, name: 11, kpg: 15, small: 8, tiny: 7, pad: 6, icon: 11 },
  m: { w: 112, h: 148, field: 62, name: 13, kpg: 19, small: 9, tiny: 7.5, pad: 8, icon: 13 },
  l: { w: 148, h: 196, field: 84, name: 16, kpg: 25, small: 10.5, tiny: 8.5, pad: 10, icon: 15 },
};

// ---------------------------------------------------------------- stars
type Pt = [number, number];
type Tone = 'light' | 'mid' | 'dark';
type Facet = { pts: Pt[]; tone: Tone; left: boolean };

const f2 = (n: number) => Math.round(n * 100) / 100;
const LIGHT = -0.75 * Math.PI; // the light comes from the top left
const INNER = 0.46; // inner radius as a share of the outer

// The five tips and five inner corners, clockwise from the top tip.
function outline(cx: number, cy: number, R: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * INNER : R;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// Ten facets, two per point, each shaded by how squarely its face turns to the light. The five whose
// middle lies left of the centre line make up the left half, which is all a half star fills.
function facets(cx: number, cy: number, R: number): Facet[] {
  const o = outline(cx, cy, R);
  const out: Facet[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const tip = o[i * 2];
    const sides: [Pt, number][] = [[o[(i * 2 + 9) % 10], -1], [o[i * 2 + 1], 1]];
    for (const [corner, side] of sides) {
      const b = Math.cos(a + (side * Math.PI) / 2 - LIGHT);
      const tone: Tone = b > 0.35 ? 'light' : b < -0.35 ? 'dark' : 'mid';
      out.push({ pts: [[cx, cy], tip, corner], tone, left: (cx + tip[0] + corner[0]) / 3 < cx - 1e-6 });
    }
  }
  return out;
}

// The left half's outline: top tip, down the left side to the bottom corner on the centre line.
const leftHalf = (o: Pt[]): Pt[] => [o[0], o[9], o[8], o[7], o[6], o[5]];
const rightHalf = (o: Pt[]): Pt[] => [o[0], o[1], o[2], o[3], o[4], o[5]];

// Diamond's glint and Wood's grain, drawn inside the star's body.
function glint(cx: number, cy: number, R: number): Pt[] {
  const x = cx - 0.3 * R, y = cy - 0.3 * R, s = 0.3 * R, k = 0.2 * s;
  return [[x, y - s], [x + k, y - k], [x + s, y], [x + k, y + k], [x, y + s], [x - k, y + k], [x - s, y], [x - k, y - k]];
}
const grain = (cx: number, cy: number, R: number): [Pt, Pt][] => [
  [[cx - 0.32 * R, cy - 0.1 * R], [cx + 0.22 * R, cy - 0.14 * R]],
  [[cx - 0.2 * R, cy + 0.16 * R], [cx + 0.34 * R, cy + 0.12 * R]],
];

type Shape = { pts: Pt[]; fill?: string; stroke?: string; width?: number } | { line: [Pt, Pt]; stroke: string; width: number; alpha: number };

// One star as flat shapes, so the SVG and the canvas draw exactly the same thing.
function starShapes(cx: number, cy: number, R: number, m: Mineral, half: boolean): Shape[] {
  const o = outline(cx, cy, R);
  const fs = facets(cx, cy, R);
  const tone = (t: Tone) => (t === 'light' ? m.light : t === 'mid' ? m.mid : m.dark);
  const lw = R * 0.08;
  const shapes: Shape[] = [];
  if (half) {
    shapes.push({ pts: rightHalf(o), fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(255,255,255,0.3)', width: lw });
    shapes.push({ pts: leftHalf(o), fill: m.dark });
    for (const f of fs) if (f.left) shapes.push({ pts: f.pts, fill: tone(f.tone) });
  } else {
    shapes.push({ pts: o, fill: m.dark });
    for (const f of fs) shapes.push({ pts: f.pts, fill: tone(f.tone) });
  }
  if (m.name === 'Diamond') shapes.push({ pts: glint(cx, cy, R), fill: '#FFFFFF' });
  if (m.name === 'Wood') for (const line of grain(cx, cy, R)) shapes.push({ line, stroke: m.edge, width: R * 0.07, alpha: 0.55 });
  shapes.push({ pts: half ? leftHalf(o) : o, stroke: m.edge, width: lw });
  return shapes;
}

// A tier's stars laid out left to right at a given height: whole stars, then the half.
function starRow(t: Tier, size: number, gap: number) {
  const n = Math.ceil(t.stars);
  const R = size / 2;
  const cy = R * 1.095; // centres the star's own box, whose tips reach higher than its feet go low
  const stars = Array.from({ length: n }, (_, i) => starShapes(R + i * (size + gap), cy, R * 0.98, t.mineral, t.stars - i < 1));
  return { width: n * size + (n - 1) * gap, stars };
}

const ptsAttr = (pts: Pt[]) => pts.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ');

export function starsSVG(t: Tier, size = 20, gap = 3): string {
  const { width, stars } = starRow(t, size, gap);
  let body = '';
  for (const s of stars.flat()) {
    if ('line' in s) {
      const [[x1, y1], [x2, y2]] = s.line;
      body += `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${s.stroke}" stroke-width="${f2(s.width)}" stroke-linecap="round" opacity="${s.alpha}"/>`;
    } else {
      body += `<polygon points="${ptsAttr(s.pts)}" fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${f2(s.width ?? 1)}" stroke-linejoin="round"` : ''}/>`;
    }
  }
  return `<svg class="stars" viewBox="0 0 ${f2(width)} ${size}" width="${f2(width)}" height="${size}" aria-hidden="true">${body}</svg>`;
}

export function drawStars(ctx: CanvasRenderingContext2D, t: Tier, x: number, y: number, size: number, gap: number) {
  const { stars } = starRow(t, size, gap);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const s of stars.flat()) {
    ctx.beginPath();
    if ('line' in s) {
      ctx.moveTo(...s.line[0]);
      ctx.lineTo(...s.line[1]);
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = s.width;
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
    if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.width ?? 1; ctx.stroke(); }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- award icons
// The dispatch's 20px in-game icons, redrawn on a 20-unit grid with their own colours.
export type Award = 'MVP' | 'TF' | 'RotM' | 'MI';
export const AWARD_LIST: Award[] = ['MVP', 'TF', 'RotM', 'MI'];
export const AWARD_NAMES: Record<Award, string> = {
  MVP: 'Most Valuable Player', TF: 'Top fragger of the finals', RotM: 'Rookie of the Month', MI: 'Most Improved',
};

type Layer = { d: string; fill?: string; stroke?: string; sw?: number; clip?: string };
const circ = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;
const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f2(cx - rx)} ${f2(cy)}a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(2 * rx)} 0a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(-2 * rx)} 0Z`;

// The rocket is drawn lying flat, then turned 45° so it climbs to the top left.
function rocketPath(segs: (string | number)[][]): string {
  const a = Math.PI / 4, c = Math.cos(a), s = Math.sin(a), ox = 11.3, oy = 10.9;
  return segs.map(([cmd, ...n]) => {
    const xy: string[] = [];
    for (let i = 0; i < n.length; i += 2) {
      const x = n[i] as number, y = n[i + 1] as number;
      xy.push(`${f2(ox + x * c - y * s)} ${f2(oy + x * s + y * c)}`);
    }
    return cmd + xy.join(' ');
  }).join('') + 'Z';
}
const rocketBody = rocketPath([['M', -5.6, 0], ['C', -4.8, -1.55, -3.4, -1.8, -2.3, -1.8], ['L', 3.5, -1.8], ['L', 3.5, 1.8], ['L', -2.3, 1.8], ['C', -3.4, 1.8, -4.8, 1.55, -5.6, 0]]);
const rocketShine = rocketPath([['M', -4.7, -0.5], ['C', -4.1, -1.15, -3.2, -1.3, -2.3, -1.3], ['L', 0.9, -1.3], ['L', 0.9, -0.5]]);
const rocketBand = rocketPath([['M', 0.9, -1.8], ['L', 2.3, -1.8], ['L', 2.3, 1.8], ['L', 0.9, 1.8]]);
const rocketFins = rocketPath([['M', 1.5, -1.6], ['L', 4.4, -3.4], ['L', 4.6, -1.6], ['L', 1.5, -1.6], ['M', 1.5, 1.6], ['L', 4.4, 3.4], ['L', 4.6, 1.6]]);
const rocketNozzle = rocketPath([['M', 3.5, -1.25], ['L', 4.5, -1], ['L', 4.5, 1], ['L', 3.5, 1.25]]);
const rocketAt = (x: number) => [11.3 + x * Math.cos(Math.PI / 4), 10.9 + x * Math.sin(Math.PI / 4)];
const [flameX, flameY] = rocketAt(5.45);

const skull = (cx: number, cy: number, r: number): Layer[] => [
  { d: circ(cx, cy, r), fill: '#A8AAAE', stroke: '#0E0F12', sw: 1.4 },
  { d: circ(cx - r * 0.22, cy - r * 0.32, r * 0.58), fill: '#CBCDD1' },
  { d: ell(cx - r * 0.4, cy + r * 0.14, r * 0.25, r * 0.3), fill: '#34373D' },
  { d: ell(cx + r * 0.4, cy + r * 0.14, r * 0.25, r * 0.3), fill: '#34373D' },
];

function gear(cx: number, cy: number, R: number, teeth = 8): string {
  const r = R * 0.74, step = (Math.PI * 2) / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step - Math.PI / 2;
    for (const [a, rad] of [[a0, r], [a0 + step * 0.12, R], [a0 + step * 0.42, R], [a0 + step * 0.54, r]]) {
      d += `${d ? 'L' : 'M'}${f2(cx + rad * Math.cos(a))} ${f2(cy + rad * Math.sin(a))}`;
    }
  }
  return `${d}Z`;
}
const cog = (cx: number, cy: number, R: number): Layer[] => [
  { d: gear(cx, cy, R), fill: '#E9B526', stroke: '#5E4A22', sw: 0.9 },
  { d: circ(cx, cy, R * 0.5), fill: '#F7D04A' },
  { d: circ(cx, cy, R * 0.26), fill: '#3B3022' },
];

const BALL = circ(10, 11.7, 6.1);

export const AWARD_ICONS: Record<Award, Layer[]> = {
  MVP: [
    { d: circ(5.4, 15.1, 2.75), stroke: '#2A303B', sw: 2.5 },
    { d: circ(5.4, 15.1, 2.75), stroke: '#E9ECF1', sw: 1.25 },
    { d: rocketFins, fill: '#8E96A3', stroke: '#232A3A', sw: 0.9 },
    { d: rocketBody, stroke: '#232A3A', sw: 1.5 },
    { d: rocketBody, fill: '#5B8DEE' },
    { d: rocketShine, fill: '#B4D0FF' },
    { d: rocketBand, fill: '#F3F5F9' },
    { d: rocketNozzle, fill: '#4B5260' },
    { d: circ(flameX, flameY, 1.25), fill: '#F28A1D' },
    { d: circ(flameX - 0.1, flameY - 0.1, 0.6), fill: '#FFD35C' },
  ],
  TF: [...skull(6.6, 13.9, 3.3), ...skull(13.4, 13.9, 3.3), ...skull(10, 8.3, 3.1)],
  RotM: [
    { d: circ(10, 11.7, 6.65), fill: '#101114' },
    { d: BALL, fill: '#F7F7F5' },
    { d: 'M12.6 7.6C9.4 8.6 6 10.6 4 12.6L3 12.6 3 19 13 19 12.8 17.6C13.2 14.2 13.2 10.6 12.6 7.6Z', fill: '#FF8A1C', clip: BALL },
    { d: 'M12.6 7.6C10.6 6.9 7.4 7.4 4.3 9.6L3 9.6 3 3 13.6 3 13.2 5.6C13 6.4 12.8 7 12.6 7.6Z', fill: '#47D575', clip: BALL },
    { d: 'M12.6 7.6C13.7 7.7 14.9 8 16 8.6L17.5 8.4 14 3 13.2 5.6C13 6.4 12.8 7 12.6 7.6Z', fill: '#FF2B7A', clip: BALL },
    { d: 'M12.6 7.6C14.6 8.8 15.8 10.8 16.5 13L18 13 18 8.4 16 8.6C14.9 8 13.7 7.7 12.6 7.6Z', fill: '#7B73D3', clip: BALL },
    { d: 'M3 14.6C5.4 18.6 14.6 18.6 17 14.6L17 19 3 19Z', fill: 'rgba(40,14,0,0.32)', clip: BALL },
  ],
  MI: [...cog(7.6, 7.8, 3.2), ...cog(5.3, 14.9, 2.8), ...cog(12.5, 14.1, 4.0)],
};

// The four icons as one hidden SVG of symbols; a page includes it once and cards point at #aw-MVP and so on.
export function awardSprite(): string {
  let defs = '';
  let symbols = '';
  for (const a of AWARD_LIST) {
    const clips = new Map<string, string>();
    const body = AWARD_ICONS[a].map((L) => {
      let clip = '';
      if (L.clip) {
        if (!clips.has(L.clip)) {
          const id = `aw-${a}-clip${clips.size}`;
          clips.set(L.clip, id);
          defs += `<clipPath id="${id}"><path d="${L.clip}"/></clipPath>`;
        }
        clip = ` clip-path="url(#${clips.get(L.clip)})"`;
      }
      const stroke = L.stroke ? ` stroke="${L.stroke}" stroke-width="${L.sw ?? 1}" stroke-linejoin="round"` : '';
      return `<path d="${L.d}" fill="${L.fill ?? 'none'}"${stroke}${clip}/>`;
    }).join('');
    symbols += `<symbol id="aw-${a}" viewBox="0 0 20 20">${body}</symbol>`;
  }
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${defs}</defs>${symbols}</svg>`;
}

export function drawAward(ctx: CanvasRenderingContext2D, a: Award, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.lineJoin = 'round';
  for (const L of AWARD_ICONS[a]) {
    const p = new Path2D(L.d);
    if (L.clip) { ctx.save(); ctx.clip(new Path2D(L.clip)); }
    if (L.fill) { ctx.fillStyle = L.fill; ctx.fill(p); }
    if (L.stroke) { ctx.strokeStyle = L.stroke; ctx.lineWidth = L.sw ?? 1; ctx.stroke(p); }
    if (L.clip) ctx.restore();
  }
  ctx.restore();
}

// The free agents' crest: an empty shield, its outline and a dashed line inside it, in a 100x100 box. It stands
// where a team logo would on a free agent's tier card, the poster, the player card and the Franchises panel.
export const FA_CREST = 'M50 7L87 19V47C87 70 71 86 50 94C29 86 13 70 13 47V19Z';
export const FA_CREST_IN = 'M50 18L77 27V47C77 64 66 76 50 83C34 76 23 64 23 47V27Z';
export const crestSVG = (cls: string) =>
  `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path class="o" d="${FA_CREST}"/><path class="i" d="${FA_CREST_IN}"/></svg>`;
export function drawCrest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rim: string, line: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const o = new Path2D(FA_CREST);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill(o);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = rim;
  ctx.stroke(o);
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = line;
  ctx.stroke(new Path2D(FA_CREST_IN));
  ctx.restore();
}
