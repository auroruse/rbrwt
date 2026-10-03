// A player's name, anywhere outside the Tier List, shows their card: beside the name while the mouse is on it
// (or while it has keyboard focus), and in the bottom bar after a tap on a touch screen.
import { bottomBar, byName, canHover, hoverPanel } from './tier-common';

hoverPanel(document.body, () => false, '.pname[data-player]');

let open: HTMLElement | null = null;
const close = () => { open = null; bar.hide(); };
const bar = bottomBar({ tiers: false, onClose: close });

document.addEventListener('click', (e) => {
  if (canHover.matches) return;
  const t = e.target as Element;
  const name = t.closest<HTMLElement>('.pname[data-player]');
  if (name) {
    if (name === open) return close();
    const p = byName.get(name.dataset.player || '');
    if (p) { open = name; bar.show(p); }
    return;
  }
  if (open && !bar.el.contains(t)) close();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });
