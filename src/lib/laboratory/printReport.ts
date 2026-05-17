/**
 * L4-a-3c P5 / P5.1 — Shared current-document print helper for Lab report viewers.
 *
 * Marks the body and the target subtree with data attributes so the print
 * stylesheet in `src/styles/labPrint.css` can hide app chrome and expose only
 * the report. Printed output inherits the on-screen Tailwind/design-system
 * styling, fonts, and `dir`/`lang` already established by P3.
 *
 * P5.1 — Also tags every ancestor of the target up to (but not including)
 * `<body>` with `data-print-ancestor="1"`. The matching CSS rule neutralizes
 * dialog/portal layout constraints (`position: fixed`, `transform`,
 * `max-height`, `overflow`, etc.) so dialog-hosted reports are no longer
 * clipped and re-anchored to their `DialogContent` containing block.
 *
 * Scope guard:
 *   - Does NOT open popups.
 *   - Does NOT clone or sanitize HTML.
 *   - Does NOT touch `document.documentElement.dir`/`lang`.
 *   - Does NOT affect PDF handlers.
 */

const PRINTING_ATTR = "data-printing";
const TARGET_ATTR = "data-print-target";
const ANCESTOR_ATTR = "data-print-ancestor";

export interface PrintReportOptions {
  /** Optional document title to use while printing (restored afterwards). */
  title?: string;
}

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

  // Collect ancestors we tag, so cleanup only removes attributes we added.
  const taggedAncestors: HTMLElement[] = [];
  let node: HTMLElement | null = targetEl.parentElement;
  while (node && node !== body) {
    if (!node.hasAttribute(ANCESTOR_ATTR)) {
      node.setAttribute(ANCESTOR_ATTR, "1");
      taggedAncestors.push(node);
    }
    node = node.parentElement;
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      if (!hadPrinting) body.removeAttribute(PRINTING_ATTR);
      if (!hadTarget) targetEl.removeAttribute(TARGET_ATTR);
      for (const el of taggedAncestors) {
        el.removeAttribute(ANCESTOR_ATTR);
      }
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
