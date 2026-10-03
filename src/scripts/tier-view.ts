// The official list: details beside a card for a mouse, in the bottom bar for a tap.
import { bottomBar, byName, canHover, hoverPanel } from './tier-common';

const view = document.querySelector<HTMLElement>('.tl-view');
if (view) {
  const pop = hoverPanel(view, () => false);
  let open: HTMLElement | null = null;
  const close = () => {
    open?.classList.remove('is-sel');
    open = null;
    bar.hide();
  };
  const bar = bottomBar({ tiers: false, onClose: close });
  const tap = (card: HTMLElement) => {
    if (card === open) return close();
    open?.classList.remove('is-sel');
    open = card;
    card.classList.add('is-sel');
    const p = byName.get(card.dataset.player || '');
    if (p) bar.show(p);
  };
  view.addEventListener('click', (e) => {
    const card = (e.target as Element).closest<HTMLElement>('.tc');
    if (card && !canHover.matches) tap(card);
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (open && !view.contains(t) && !bar.el.contains(t)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); pop.hide(); }
  });
}
