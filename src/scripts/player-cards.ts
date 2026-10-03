// A player's name, anywhere outside the Tier List, opens their card: pinned beside the name for a mouse,
// in the bottom bar for touch. A click elsewhere, Escape or the name again closes it.
import { bottomBar, byName, canHover, detailHTML } from './tier-common';

const pop = document.getElementById('tl-pop')!;
let open: HTMLElement | null = null;
const bar = bottomBar({ tiers: false, onClose: () => close() });

function place(name: HTMLElement) {
  const r = name.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return close();
  const w = pop.offsetWidth, h = pop.offsetHeight, gap = 14;
  let x = r.right + gap;
  if (x + w > innerWidth - 12) x = r.left - gap - w;
  if (x < 12) x = Math.max(12, Math.min(innerWidth - w - 12, r.left));
  const y = Math.max(76, Math.min(r.top + r.height / 2 - h / 2, innerHeight - h - 12));
  pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

function show(name: HTMLElement) {
  const p = byName.get(name.dataset.player || '');
  if (!p) return;
  close();
  open = name;
  name.setAttribute('aria-expanded', 'true');
  if (canHover.matches) {
    pop.innerHTML = detailHTML(p);
    pop.hidden = false;
    pop.setAttribute('aria-hidden', 'false');
    place(name);
  } else {
    bar.show(p);
  }
}

function close() {
  open?.setAttribute('aria-expanded', 'false');
  open = null;
  pop.hidden = true;
  pop.setAttribute('aria-hidden', 'true');
  bar.hide();
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const name = t.closest<HTMLElement>('.pname[data-player]');
  if (name) { if (name === open) close(); else show(name); return; }
  if (open && !bar.el.contains(t)) close();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });

// The card follows its name as the page or a table scrolls, and closes once the name leaves the screen.
let queued = false;
const follow = () => {
  if (!open || !canHover.matches || queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; if (open) place(open); });
};
addEventListener('scroll', follow, { passive: true, capture: true });
addEventListener('resize', follow);
