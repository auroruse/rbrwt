// What the Tier List pages hand to the browser: every card's numbers for the detail panel and the poster,
// the franchises with their logos, the pool's order and the official list. Logos are resized once here
// and the same files serve the cards, the panels and the poster.
import { getImage } from 'astro:assets';
import barmark from '../../assets/header/wordmark.png';
import { FREE_AGENT, aliases, franchises, hasOfficial, official, poolOrder, tierPlayers } from './data';

// freeAgents: whether this page shows players on no S2 roster as free agents (the tier list and Franchises do;
// Stats and History show the teams they played for).
export async function tierAssets(opts: { freeAgents?: boolean } = {}) {
  const logos: Record<string, string> = {};
  for (const f of franchises) if (f.image) logos[f.code] = (await getImage({ src: f.image, width: 192 })).src;
  const pfps: Record<string, string> = {};
  for (const p of tierPlayers) if (p.pfp) pfps[p.name] = (await getImage({ src: p.pfp, width: 96 })).src;
  const wordmark = (await getImage({ src: barmark, width: 900 })).src;
  const site = new URL(import.meta.env.BASE_URL, import.meta.env.SITE).href.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const payload = {
    players: tierPlayers.map(({ pfp: _, rank: _rank, ...p }) => ({ ...p, pfp: pfps[p.name] ?? null })),
    franchises: {
      ...Object.fromEntries(franchises.map((f) => [f.code, {
        name: f.name, primary: f.primary, secondary: f.secondary, ink: f.inkHex, rim: f.rim, logo: logos[f.code] ?? null,
      }])),
      [FREE_AGENT.code]: { name: FREE_AGENT.name, primary: FREE_AGENT.primary, secondary: FREE_AGENT.secondary, ink: FREE_AGENT.inkHex, rim: FREE_AGENT.rim, logo: null },
    },
    freeAgents: !!opts.freeAgents,
    order: poolOrder,
    aliases,
    official: hasOfficial ? { title: official.title, by: official.by, tiers: Object.fromEntries(official.tiers.map((t) => [t.id, t.players])) } : null,
    wordmark,
    site,
  };
  // Safe inside a <script> element: no "</script>" can close it early.
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return { logos, pfps, json };
}
