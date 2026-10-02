// Everything the pages show comes from here, read at build time: the YAML and TSV files in
// src/data, the kill sheets in assets/sheets, and the logos in assets/franchises and
// assets/former franchises (a logo's folder decides whether its franchise is in Season 2).
import fs from 'node:fs';
import path from 'node:path';
import type { ImageMetadata } from 'astro';
import YAML from 'yaml';

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const yaml = <T>(p: string): T => YAML.parse(read(p)) as T;

// ---------------------------------------------------------------- franchises
type FranchiseRow = {
  code: string; name: string; logo: string; primary: string; secondary: string;
  ink: 'dark' | 'white'; home?: { label: string; region?: string };
};
export type Franchise = FranchiseRow & { active: boolean; image?: ImageMetadata; inkHex: string; style: string };

const s2Logos = import.meta.glob<{ default: ImageMetadata }>('/assets/franchises/*.png', { eager: true });
const formerLogos = import.meta.glob<{ default: ImageMetadata }>('/assets/former franchises/*.png', { eager: true });
const byFile = (globbed: Record<string, { default: ImageMetadata }>) =>
  new Map(Object.entries(globbed).map(([k, v]) => [path.basename(k).toLowerCase(), v.default]));
const s2Files = byFile(s2Logos);
const formerFiles = byFile(formerLogos);

export const franchises: Franchise[] = yaml<FranchiseRow[]>('src/data/franchises.yaml').map((f) => {
  const file = f.logo.toLowerCase();
  const inkHex = f.ink === 'dark' ? '#030A1F' : '#FFFFFF';
  return {
    ...f,
    active: s2Files.has(file),
    image: s2Files.get(file) ?? formerFiles.get(file),
    inkHex,
    style: `--p:${f.primary}; --s:${f.secondary}; --ink-on:${inkHex}`,
  };
});
const fByCode = new Map(franchises.map((f) => [f.code, f]));
export const franchise = (code: string): Franchise => {
  const f = fByCode.get(code);
  if (!f) throw new Error(`Unknown franchise code "${code}" (add it to src/data/franchises.yaml)`);
  return f;
};
export const s2Field = franchises.filter((f) => f.active).sort((a, b) => a.code.localeCompare(b.code));
export const franchisesToDate = s2Files.size + formerFiles.size;

// ---------------------------------------------------------------- rosters (S2)
export const rosters = new Map<string, { player: string; role: string }[]>();
for (const line of read('src/data/rosters.tsv').split(/\r?\n/).slice(1)) {
  const [code, player, role = ''] = line.split('\t').map((c) => c.trim());
  if (!code || !player) continue;
  if (!rosters.has(code)) rosters.set(code, []);
  rosters.get(code)!.push({ player, role });
}

// ---------------------------------------------------------------- season
type Season = { season: number; next: { num: string; date: string | null } };
export const season = yaml<Season>('src/data/season.yaml');

// ---------------------------------------------------------------- tours (S1)
type Award = 'MVP' | 'TF' | 'RotM' | 'MI';
export const AWARDS: Award[] = ['MVP', 'TF', 'RotM', 'MI'];
export type Tour = {
  num: string; date: string; venue: string; host: string; champion: string; matches: number; sheet?: string;
  awards: Record<Award, string | null>; notes?: Partial<Record<Award, string>>;
  replays: { label: string; url: string }[];
};
export const tours = yaml<Tour[]>('src/data/tours.yaml');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parts = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m: MONTHS[m - 1], d };
};
export const longDate = (iso: string) => { const p = parts(iso); return `${p.d} ${p.m} ${p.y}`; };
export const monthYear = (iso: string) => { const p = parts(iso); return `${p.m} ${p.y}`; };

export const matchesPlayed = tours.reduce((n, t) => n + (t.matches || 0), 0);

// ---------------------------------------------------------------- kill sheets
const aliases = yaml<Record<string, string>>('src/data/aliases.yaml') ?? {};
const GAME_COL = /^(Game \d+|Conf \d+|Finals \d+|C\d+|WC|F\d+|\d+)$/;
const isNum = (v: string | undefined) => !!v && /^\d+$/.test(v.trim());

type Player = { name: string; kills: number; games: number; team?: string };
const players = new Map<string, Player>();
let bestTour = { kills: 0, name: '', tour: '' };
const gameHighs: { kills: number; name: string; tour: string }[] = [];

for (const t of tours) {
  if (!t.sheet) continue;
  const rows = read(path.join('assets/sheets', t.sheet)).split(/\r?\n/).map((r) => r.split('\t'));
  const hi = rows.findIndex((r) => r.some((c) => c.trim().toLowerCase() === 'player'));
  if (hi < 0) continue;
  const head = rows[hi].map((c) => c.trim());
  const low = head.map((c) => c.toLowerCase());
  const pc = low.indexOf('player');
  const tc = low.findIndex((c) => c === 'total' || c === 'total kills');
  const gp = low.findIndex((c) => c === 'gp' || c === 'games played');
  const team = low.indexOf('team');
  const gameCols = head.map((c, i) => (GAME_COL.test(c) ? i : -1)).filter((i) => i >= 0);
  for (const r of rows.slice(hi + 1)) {
    const raw = (r[pc] ?? '').trim();
    if (!raw || !isNum(r[tc])) continue;
    const name = aliases[raw] ?? raw;
    const kills = Number(r[tc].trim());
    const games = gp >= 0 && isNum(r[gp]) ? Number(r[gp].trim()) : gameCols.filter((i) => isNum(r[i])).length;
    const p = players.get(name) ?? { name, kills: 0, games: 0 };
    p.kills += kills;
    p.games += games;
    if (team >= 0 && (r[team] ?? '').trim()) p.team = r[team].trim().split(/\s+/)[0];
    players.set(name, p);
    if (kills > bestTour.kills) bestTour = { kills, name, tour: t.num };
    for (const i of gameCols) if (isNum(r[i])) gameHighs.push({ kills: Number(r[i].trim()), name, tour: t.num });
  }
}

// Ties share a rank: 1, 1, 3.
export const killLeaders = [...players.values()]
  .sort((a, b) => b.kills - a.kills || a.games - b.games)
  .slice(0, 10)
  .map((p, i, all) => ({ ...p, rank: all.findIndex((q) => q.kills === p.kills) + 1, kpg: p.kills / p.games }));

// ---------------------------------------------------------------- records
const tally = (values: (string | null)[]) => {
  const n = new Map<string, number>();
  for (const v of values) if (v) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]);
};
const [titleCode, titleCount] = tally(tours.map((t) => t.champion))[0];
const [mvpName, mvpCount] = tally(tours.map((t) => t.awards.MVP))[0];
const topGame = Math.max(...gameHighs.map((g) => g.kills));
const gameHolders = gameHighs.filter((g) => g.kills === topGame);

export const records = [
  { figure: titleCount, label: 'Titles', holder: `${titleCode} ${franchise(titleCode).name}` },
  { figure: mvpCount, label: 'MVP awards', holder: mvpName },
  { figure: bestTour.kills, label: 'Kills in one tour', holder: `${bestTour.name} · RBRWT ${bestTour.tour}` },
  { figure: topGame, label: 'Kills in one game', holder: gameHolders.map((g) => `${g.name} (${g.tour})`).join(', ') },
];

// ---------------------------------------------------------------- links
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (p: string) => `${BASE}${p.startsWith('/') ? p : `/${p}`}`;
export const nsRegion = (slug: string) => `https://www.nationstates.net/region=${slug}`;
