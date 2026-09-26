/**
 * Keeps the live event feed on screen while a full-screen building panel is open.
 *
 * The shop and town panels are `inset-0` overlays with a dimmed backdrop, so the feed
 * (`#gameEventFeedWindow`) would otherwise sit behind them. A body class lifts the feed above
 * the overlay and shifts the panel aside on wide viewports; see the `panel-open` rules in
 * index.html.
 *
 * The class is recomputed from the DOM rather than tracked with a counter, so two panels
 * racing each other open and closed can never leave it stuck on (or off).
 */
const FEED_PANELS = ['shopModal', 'townModal'];

export function syncFeedPanelClass(): void {
  if (typeof document === 'undefined') return;

  const anyOpen = FEED_PANELS.some(id => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
  });

  document.body.classList.toggle('panel-open', anyOpen);
}
