/**
 * Tracks building overlays for their responsive notification layout.
 *
 * The shop and town panels are `inset-0` overlays with a dimmed backdrop, so the feed
 * (`#gameEventFeedWindow`) would otherwise sit behind them. Towns retain the side feed;
 * shops use a centered workspace, an inline status region and a toast above the dimming layer.
 *
 * The class is recomputed from the DOM rather than tracked with a counter, so two panels
 * racing each other open and closed can never leave it stuck on (or off).
 */
const FEED_PANELS = ['shopModal', 'townModal', 'journeyDecision'];

export function syncFeedPanelClass(): void {
  if (typeof document === 'undefined') return;

  const anyOpen = FEED_PANELS.some(id => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
  });

  document.body.classList.toggle('panel-open', anyOpen);
  const shop = document.getElementById('shopModal');
  document.body.classList.toggle('shop-open', !!shop && !shop.classList.contains('hidden'));
}
