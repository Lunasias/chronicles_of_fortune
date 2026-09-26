const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escapes a value for safe interpolation into an HTML string.
 *
 * The game builds a lot of markup with `innerHTML` template literals, and some of the
 * interpolated values originate from free-text input (the hero name field and the
 * "silly name" graffiti prank). Names also end up inside generated log lines, so escaping
 * at the point of insertion is the only reliable guard.
 *
 * Prefer `textContent` when only text is needed; use this when markup must be built.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}
