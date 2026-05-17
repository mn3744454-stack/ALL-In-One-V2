/**
 * L4-a-3c P5 — Shared current-document print helper for Lab report viewers.
 *
 * Replaces the legacy `window.open('', '_blank')` clone-and-restyle pattern.
 * Instead of cloning HTML into a popup with a hand-rolled CSS dictionary, this
 * helper temporarily marks the body and target element with data attributes,
 * then invokes `window.print()` on the current document. The matching rules
 * live in `src/styles/labPrint.css` and hide app chrome while exposing only
 * the marked report subtree — so the printed output inherits the real
 * Tailwind/design-system styling, fonts, and `dir`/`lang` already set by P3.
 *
 * Scope guard:
 *   - Does NOT open popups.
 *   - Does NOT clone or sanitize HTML.
 *   - Does NOT touch global `document.documentElement.dir`/`lang`.
 *   - Does NOT affect PDF handlers.
 */

const PRINTING_ATTR = "data-printing";
const TARGET_ATTR = "data-print-target";

export interface PrintReportOptions {
  /** Optional document title to use while printing (restored afterwards). */
  title?: string;
}

/**
 * Mark `targetEl` and `document.body`, fire `window.print()`, then clean up.
 *
 * Cleanup runs on the `afterprint` event, with a defensive timeout fallback
 * in case the browser does not dispatch `afterprint` (some embedded
 * environments and Safari edge cases).
 */
export function printReport(
  targetEl: HTMLElement | null | undefined,
  options: PrintReportOptions = {}
): void {
  if (!targetEl) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const body = document.body;
  if (!body) return;

  const previousTitle = document.title;
  const hadPrinting = body.hasAttribute(PRINTING_ATTR);
  const hadTarget = targetEl.hasAttribute(TARGET_ATTR);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      if (!hadPrinting) body.removeAttribute(PRINTING_ATTR);
      if (!hadTarget) targetEl.removeAttribute(TARGET_ATTR);
      if (options.title) document.title = previousTitle;
    } catch {
      // best-effort cleanup
    }
    window.removeEventListener("afterprint", onAfterPrint);
    if (mql) {
      try {
        mql.removeEventListener?.("change", onMqlChange);
      } catch {
        // legacy listener API
      }
    }
  };

  const onAfterPrint = () => cleanup();
  const onMqlChange = (e: MediaQueryListEvent) => {
    if (!e.matches) cleanup();
  };

  // Mark body + target for the @media print rules.
  body.setAttribute(PRINTING_ATTR, "1");
  targetEl.setAttribute(TARGET_ATTR, "1");
  if (options.title) document.title = options.title;

  // Wire cleanup hooks.
  window.addEventListener("afterprint", onAfterPrint);
  const mql =
    typeof window.matchMedia === "function"
      ? window.matchMedia("print")
      : null;
  if (mql) {
    try {
      mql.addEventListener?.("change", onMqlChange);
    } catch {
      // legacy listener API — fall through to timeout cleanup
    }
  }

  // Defensive timeout — if afterprint never fires (cancelled dialog in some
  // browsers, embedded webviews), cleanup after 60s so the page recovers.
  window.setTimeout(cleanup, 60_000);

  // Defer the print() call so the browser commits the attribute changes and
  // the @media print rules apply to a stable DOM.
  window.setTimeout(() => {
    try {
      window.print();
    } catch (err) {
      console.warn("[printReport] window.print() failed", err);
      cleanup();
    }
  }, 50);
}
