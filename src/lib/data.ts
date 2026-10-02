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
export const franchiseOrNull = (code?: string) => (code ? fByCode.get(code) ?? null : null);
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
  awards: Record<Award, string | null>; notes?: Partial<Record<Award, string>>; sheet_note?: string;
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
// One standard TSV per tour in assets/sheets (the originals are kept in assets/sheets/raw):
// Player, Team, Conference, GP, Kills, then one column per game, C# conference, W# wild card or play-in, F# finals.
const aliases = yaml<Record<string, string>>('src/data/aliases.yaml') ?? {};
const GAME_COL = /^[CWF]\d+$/;
const isNum = (v: string | undefined) => !!v && /^\d+$/.test(v.trim());

type Player = { name: string; kills: number; games: number; team?: string };
// low: under MIN_GAMES games, so ranked below everyone who reached it.
export type BoardRow = Player & { rank: number; kpg: number; low: boolean; teams: string[] };
export const MIN_GAMES = 10;
// Players who played for two franchises: the all-time boards show both, in this order.
const careers = yaml<Record<string, string[]>>('src/data/career-teams.yaml') ?? {};
const players = new Map<string, Player>();
const perTour = new Map<string, Map<string, Player>>();
const gameHighs: { kills: number; name: string; tour: string }[] = [];

for (const t of tours) {
  if (!t.sheet) continue;
  const [head, ...rows] = read(path.join('assets/sheets', t.sheet)).split(/\r?\n/).map((r) => r.split('\t'));
  const at = (name: string) => head.findIndex((c) => c.trim().toLowerCase() === name);
  const [pc, tc, gc, kc] = ['player', 'team', 'gp', 'kills'].map(at);
  const gameCols = head.map((c, i) => (GAME_COL.test(c.trim()) ? i : -1)).filter((i) => i >= 0);
  const board = new Map<string, Player>();
  for (const r of rows) {
    const raw = (r[pc] ?? '').trim();
    if (!raw || !isNum(r[kc])) continue;
    const name = aliases[raw] ?? raw;
    const kills = Number(r[kc].trim());
    const games = isNum(r[gc]) ? Number(r[gc].trim()) : gameCols.filter((i) => isNum(r[i])).length;
    const team = (r[tc] ?? '').trim() || undefined;
    const row = board.get(name) ?? { name, kills: 0, games: 0 };
    row.kills += kills; row.games += games; row.team = team ?? row.team;
    board.set(name, row);
    const p = players.get(name) ?? { name, kills: 0, games: 0 };
    p.kills += kills; p.games += games; p.team = team ?? p.team;
    players.set(name, p);
    for (const i of gameCols) if (isNum(r[i])) gameHighs.push({ kills: Number(r[i].trim()), name, tour: t.num });
  }
  perTour.set(t.num, board);
}

// Best kills per game first, everyone under MIN_GAMES games below everyone who reached it.
// More kills break ties in the order; equal kills per game share a rank (1, 1, 3).
const kpgOf = (p: Player) => (p.games ? p.kills / p.games : 0);
const rank = (list: Player[], career: boolean): BoardRow[] => {
  const rows = list.map((p) => ({ ...p, kpg: kpgOf(p), low: p.games < MIN_GAMES }));
  rows.sort((a, b) => Number(a.low) - Number(b.low) || b.kpg - a.kpg || b.kills - a.kills || a.name.localeCompare(b.name));
  return rows.map((p) => ({
    ...p,
    rank: rows.findIndex((q) => q.low === p.low && q.kpg === p.kpg) + 1,
    teams: (career && careers[p.name]) || (p.team ? [p.team] : []),
  }));
};
export const allTimeBoard = rank([...players.values()], true);
export const tourBoards = tours.map((t) => ({ tour: t, rows: perTour.has(t.num) ? rank([...perTour.get(t.num)!.values()], false) : null }));

// ---------------------------------------------------------------- records
// Six tiles for History. Ties list every holder; each holder carries the logos of the team(s) they set it with.
export type Holder = { name: string; teams: string[]; note?: string };
export type RecordTile = { figure: number; label: string; context: string; holders: Holder[] };

const latestTeams = (name: string): string[] => careers[name] ?? (players.get(name)?.team ? [players.get(name)!.team!] : []);
const teamIn = (name: string, tour: string): string[] => {
  const team = perTour.get(tour)?.get(name)?.team;
  return team ? [team] : latestTeams(name);
};
const asFranchise = (code: string): Holder => ({ name: `${code} ${franchise(code).name}`, teams: [code] });
const most = (m: Map<string, string[]>) => [...m.entries()].sort((a, b) => b[1].length - a[1].length)[0];
const sheetTours = tours.filter((t) => t.sheet).map((t) => t.num);
export const sheetSpan = sheetTours.length ? `${sheetTours[0]} to ${sheetTours[sheetTours.length - 1]}` : '';

const titles = new Map<string, string[]>();
const mvps = new Map<string, string[]>();
for (const t of tours) {
  titles.set(t.champion, [...(titles.get(t.champion) ?? []), t.num]);
  if (t.awards.MVP) mvps.set(t.awards.MVP, [...(mvps.get(t.awards.MVP) ?? []), t.num]);
}
const [titleCode, titleTours] = most(titles);
const [mvpName, mvpTours] = most(mvps);

let streak = { code: '', from: '', to: '', n: 0 };
for (let i = 0, run = 0; i < tours.length; i++) {
  run = i > 0 && tours[i].champion === tours[i - 1].champion ? run + 1 : 1;
  if (run > streak.n) streak = { code: tours[i].champion, from: tours[i - run + 1].num, to: tours[i].num, n: run };
}

const topKills = Math.max(0, ...allTimeBoard.map((p) => p.kills));
const tourTotals = [...perTour.entries()].flatMap(([tour, board]) => [...board.values()].map((p) => ({ name: p.name, kills: p.kills, tour })));
const topTour = Math.max(...tourTotals.map((x) => x.kills));
const topGame = Math.max(...gameHighs.map((g) => g.kills));
const unique = <T>(list: T[], key: (x: T) => string) => list.filter((x, i) => list.findIndex((y) => key(y) === key(x)) === i);

export const records: RecordTile[] = [
  { figure: titleTours.length, label: 'Titles', context: titleTours.join(', '), holders: [asFranchise(titleCode)] },
  { figure: streak.n, label: 'Titles in a row', context: `${streak.from} to ${streak.to}`, holders: [asFranchise(streak.code)] },
  { figure: mvpTours.length, label: 'MVP awards', context: mvpTours.join(', '), holders: [{ name: mvpName, teams: latestTeams(mvpName) }] },
  { figure: topKills, label: 'Kills in Season 1', context: sheetSpan,
    holders: allTimeBoard.filter((p) => p.kills === topKills).map((p) => ({ name: p.name, teams: p.teams })) },
  { figure: topTour, label: 'Kills in one tour', context: 'One tour',
    holders: tourTotals.filter((x) => x.kills === topTour).map((x) => ({ name: x.name, teams: teamIn(x.name, x.tour), note: `RBRWT ${x.tour}` })) },
  { figure: topGame, label: 'Kills in one game', context: 'One game',
    holders: unique(gameHighs.filter((g) => g.kills === topGame), (g) => g.name + g.tour).map((g) => ({ name: g.name, teams: teamIn(g.name, g.tour), note: `RBRWT ${g.tour}` })) },
];

// ---------------------------------------------------------------- links
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (p: string) => `${BASE}${p.startsWith('/') ? p : `/${p}`}`;
export const nsRegion = (slug: string) => `https://www.nationstates.net/region=${slug}`;
