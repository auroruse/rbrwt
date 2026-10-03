// Everything the pages show comes from here, read at build time: the YAML and TSV files in
// src/data, the kill sheets in assets/sheets, and the logos in assets/franchises and
// assets/former franchises (a logo's folder decides whether its franchise is in Season 2).
import fs from 'node:fs';
import path from 'node:path';
import type { ImageMetadata } from 'astro';
import YAML from 'yaml';
import { TIER_IDS } from './tiers';

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
export const aliases = yaml<Record<string, string>>('src/data/aliases.yaml') ?? {};
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

// ---------------------------------------------------------------- tier list
// A card for everyone in the S1 sheets and everyone on an S2 roster, with what its face and its
// detail panel show. src/lib/tiers.ts holds the tiers themselves.
export type TierPlayer = {
  name: string;
  team: string | null; // the franchise the card wears: S2 if rostered, otherwise their latest S1 tour's
  teams: string[]; // every franchise they played for in S1
  s2: { code: string; role: 'Starter' | 'Sub' } | null;
  kills: number; games: number; kpg: number; rank: number | null;
  awards: Partial<Record<Award, string[]>>; // award -> the tours it was won in
  titles: string[]; // tours won as a player, II to X (I has no sheet)
  tours: { num: string; team: string | null; kills: number; games: number }[];
  best: { kills: number; tours: string[] } | null;
  pfp: ImageMetadata | null;
};

const pfpFiles = import.meta.glob<{ default: ImageMetadata }>('/assets/pfps/*.{png,jpg,jpeg,webp}', { eager: true });
const pfpByName = new Map(Object.entries(pfpFiles).map(([k, v]) => [path.basename(k).replace(/\.[^.]+$/, '').toLowerCase(), v.default]));

const s2ByName = new Map<string, { code: string; role: 'Starter' | 'Sub' }>();
for (const f of s2Field) {
  for (const r of rosters.get(f.code) ?? []) s2ByName.set(r.player, { code: f.code, role: r.role.toLowerCase() === 'sub' ? 'Sub' : 'Starter' });
}
const awardsBy = new Map<string, Partial<Record<Award, string[]>>>();
for (const t of tours) {
  for (const a of AWARDS) {
    const w = t.awards[a];
    if (!w) continue;
    const name = aliases[w] ?? w;
    const won = awardsBy.get(name) ?? {};
    (won[a] ??= []).push(t.num);
    awardsBy.set(name, won);
  }
}
const boardRow = new Map(allTimeBoard.map((p, i) => [p.name, { ...p, at: i }]));
// The Wild Card side is free agents, not a franchise: a card wears the last real franchise its player
// played for, and WC never appears among their teams (a tour played as a Joker still reads WC in its row).
const FREE_AGENTS = 'WC';
const real = (code?: string | null): code is string => !!code && code !== FREE_AGENTS;

export const tierPlayers: TierPlayer[] = [...new Set([...players.keys(), ...s2ByName.keys()])].map((name) => {
  const s1 = players.get(name);
  const row = boardRow.get(name);
  const highs = gameHighs.filter((g) => g.name === name);
  const top = highs.length ? Math.max(...highs.map((g) => g.kills)) : 0;
  const byTour = tours.map((t) => perTour.get(t.num)?.get(name)?.team).filter(real);
  const teams = careers[name]?.filter(real) ?? [...new Set(byTour)];
  return {
    name,
    team: s2ByName.get(name)?.code ?? byTour.at(-1) ?? teams.at(-1) ?? null,
    teams,
    s2: s2ByName.get(name) ?? null,
    kills: s1?.kills ?? 0,
    games: s1?.games ?? 0,
    kpg: row?.kpg ?? 0,
    rank: row?.rank ?? null,
    awards: awardsBy.get(name) ?? {},
    titles: tours.filter((t) => perTour.get(t.num)?.get(name)?.team === t.champion).map((t) => t.num),
    tours: tours.filter((t) => perTour.get(t.num)?.has(name)).map((t) => {
      const r = perTour.get(t.num)!.get(name)!;
      return { num: t.num, team: r.team ?? null, kills: r.kills, games: r.games };
    }),
    best: top ? { kills: top, tours: [...new Set(highs.filter((g) => g.kills === top).map((g) => g.tour))] } : null,
    pfp: pfpByName.get(name.toLowerCase()) ?? null,
  };
});

const cardNames = new Set(tierPlayers.map((p) => p.name));
export const hasCard = (name: string) => cardNames.has(name);

// The pool's own order: the S2 field franchise by franchise in depth-chart order, then everyone else
// by the franchise their card wears, best kills per game first.
const atOf = (n: string) => boardRow.get(n)?.at ?? Number.MAX_SAFE_INTEGER;
export const poolOrder: string[] = [
  ...s2Field.flatMap((f) => (rosters.get(f.code) ?? []).map((r) => r.player)),
  ...tierPlayers.filter((p) => !p.s2).sort((a, b) => (a.team ?? '~').localeCompare(b.team ?? '~') || atOf(a.name) - atOf(b.name)).map((p) => p.name),
];

// The official list, typed in from Kirin's screenshot. An unknown name stops the build rather than
// publishing a list with a player missing.
type OfficialFile = { title?: string | null; by?: string | null; date?: string | null; tiers?: Record<string, string[] | null> | null };
const officialFile = yaml<OfficialFile | null>('src/data/tier-list.yaml') ?? {};
const known = new Set(tierPlayers.map((p) => p.name));
const placedOfficial = new Set<string>();
export const official = {
  title: officialFile.title ?? null,
  by: officialFile.by ?? null,
  date: officialFile.date ? String(officialFile.date).slice(0, 10) : null,
  tiers: TIER_IDS.map((id) => {
    const listed = Object.entries(officialFile.tiers ?? {}).find(([k]) => String(Number(k)) === String(Number(id)))?.[1] ?? [];
    const names = listed.map((n) => aliases[String(n).trim()] ?? String(n).trim());
    for (const n of names) {
      if (!known.has(n)) throw new Error(`tier-list.yaml: no player called "${n}" (tier ${id})`);
      if (placedOfficial.has(n)) throw new Error(`tier-list.yaml: "${n}" is in more than one tier`);
      placedOfficial.add(n);
    }
    return { id, players: names };
  }),
};
export const hasOfficial = placedOfficial.size > 0;

// ---------------------------------------------------------------- links
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (p: string) => `${BASE}${p.startsWith('/') ? p : `/${p}`}`;
export const nsRegion = (slug: string) => `https://www.nationstates.net/region=${slug}`;
