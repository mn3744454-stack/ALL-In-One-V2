/**
 * Phase N+3 Slice 2.2D — Shared Invoice Pagination Engine.
 *
 * Pure DOM decomposition: takes a `.pdf-body` element whose direct children
 * carry `data-block="…"` metadata (see H in the approved plan) and returns
 * an array of page-worth block arrays.
 *
 * Design intent:
 *   • Atomic blocks (header, bill-to, totals, payment-summary, footer, item,
 *     session-row, notes) are never split — they move whole to the next page
 *     when the remaining space cannot host them.
 *   • Splittable container blocks (item-group, payment-session, items-table)
 *     may split, but ONLY between their own `data-block` sub-children. The
 *     first `[data-block-heading]` child is cloned onto every continuation
 *     page and the localized continuation suffix is appended to the element
 *     tagged `[data-continuation-label]`.
 *   • A `[data-block-glue-next]` block sticks to the following block: if the
 *     next block cannot follow it on the same page, the glued block moves
 *     with it. This protects payment-history-heading + first session, and
 *     items-header + first item-group.
 *
 * All height measurements go through `opts.measure`. Production callers use
 * `getBoundingClientRect().height`; tests inject a synthetic height map so
 * the engine is deterministic under jsdom.
 */

export type PageBlockKind =
  | "header"
  | "bill-to"
  | "items-header"
  | "items-table"
  | "item-group"
  | "item"
  | "totals"
  | "payment-summary"
  | "payment-history-heading"
  | "payment-session"
  | "session-row"
  | "session-subheading"
  | "notes"
  | "footer-thankyou";

const SPLITTABLE: ReadonlySet<string> = new Set([
  "items-table",
  "item-group",
  "payment-session",
]);

export interface PaginateOptions {
  /** Usable content height per page, in the same units returned by `measure`. */
  usablePx: number;
  /** Localized continuation suffix, e.g. " — Continued" or " — تابع". */
  continuationSuffix: string;
  /** Height measurement function. Defaults to `getBoundingClientRect().height`. */
  measure?: (el: HTMLElement) => number;
}

const defaultMeasure = (el: HTMLElement) => el.getBoundingClientRect().height;

const directBlockChildren = (parent: Element): HTMLElement[] =>
  Array.from(parent.children).filter((c) =>
    (c as HTMLElement).dataset && (c as HTMLElement).dataset.block !== undefined,
  ) as HTMLElement[];

const findHeading = (parent: Element): HTMLElement | null => {
  for (const child of Array.from(parent.children)) {
    const el = child as HTMLElement;
    if (el.dataset && el.dataset.blockHeading !== undefined) return el;
  }
  return null;
};

const appendContinuationSuffix = (heading: HTMLElement, suffix: string) => {
  if (!suffix) return;
  const target =
    heading.querySelector<HTMLElement>("[data-continuation-label]") ?? heading;
  target.textContent = (target.textContent ?? "") + suffix;
};

/**
 * Paginate the top-level `data-block` children of `bodyEl` into pages.
 * Each returned array is the ordered list of block clones that belong on
 * one page (still detached — the caller wraps them in a `.pdf-page`).
 */
export function paginateIntoPages(
  bodyEl: HTMLElement,
  opts: PaginateOptions,
): HTMLElement[][] {
  const measure = opts.measure ?? defaultMeasure;
  const usable = opts.usablePx;
  const suffix = opts.continuationSuffix;

  const pages: HTMLElement[][] = [[]];
  let used = 0;

  const remaining = () => usable - used;
  const openNewPage = () => {
    pages.push([]);
    used = 0;
  };
  const commit = (el: HTMLElement, h: number) => {
    pages[pages.length - 1].push(el);
    used += h;
  };

  /** Place an atomic block. */
  const placeAtomic = (source: HTMLElement, h: number) => {
    if (h <= remaining()) {
      commit(source.cloneNode(true) as HTMLElement, h);
      return;
    }
    if (used === 0) {
      // Fresh page and still overflows — controlled oversize placement.
      commit(source.cloneNode(true) as HTMLElement, h);
      return;
    }
    openNewPage();
    commit(source.cloneNode(true) as HTMLElement, h);
  };

  /** Split a container block between its `data-block` sub-children. */
  const splitContainer = (block: HTMLElement, totalH: number) => {
    const children = directBlockChildren(block);
    const heading = findHeading(block);
    const headingH = heading ? measure(heading) : 0;

    if (children.length === 0) {
      // Nothing sensible to split by — treat as atomic.
      placeAtomic(block, totalH);
      return;
    }

    // Extra fixed height (heading + block padding/border) that must accompany
    // every continuation shell. Approximated as heading height only.
    const shellOverhead = headingH;

    const makeShell = (isContinuation: boolean): HTMLElement => {
      const shell = block.cloneNode(false) as HTMLElement;
      if (heading) {
        const h = heading.cloneNode(true) as HTMLElement;
        if (isContinuation) appendContinuationSuffix(h, suffix);
        shell.appendChild(h);
      }
      return shell;
    };

    let shell = makeShell(false);
    let shellH = shellOverhead;
    let shellHasContent = false;

    const flush = () => {
      if (shellHasContent) commit(shell, shellH);
    };

    for (const child of children) {
      const ch = measure(child);
      // Would this child (plus current shell if not committed yet) fit?
      const currentPageBudget = shellHasContent
        ? remaining() // shell not committed; shellH already counted separately below
        : remaining();

      // Case A: shell already has content on current page (uncommitted).
      // We need to see if shellH + ch <= remaining().
      if (shellHasContent) {
        if (shellH + ch <= remaining()) {
          shell.appendChild(child.cloneNode(true));
          shellH += ch;
          continue;
        }
        // Flush current shell to current page, open new page, restart shell as continuation.
        flush();
        openNewPage();
        shell = makeShell(true);
        shellH = shellOverhead;
        shellHasContent = false;
        // fall through to Case B
      }

      // Case B: shell has no content yet. Try to seat shell + child on current page.
      if (shellOverhead + ch <= remaining()) {
        shell.appendChild(child.cloneNode(true));
        shellH = shellOverhead + ch;
        shellHasContent = true;
        continue;
      }

      // Doesn't fit even on this page. If page is not empty, break to a new page.
      if (used > 0) {
        openNewPage();
        // Retry on fresh page.
        if (shellOverhead + ch <= usable) {
          shell = makeShell(pages.length > 1);
          shell.appendChild(child.cloneNode(true));
          shellH = shellOverhead + ch;
          shellHasContent = true;
          continue;
        }
      }

      // Fresh page still cannot hold heading+child — oversized child; place anyway.
      shell = makeShell(pages.length > 1);
      shell.appendChild(child.cloneNode(true));
      shellH = shellOverhead + ch;
      shellHasContent = true;
    }

    flush();
  };

  // Walk top-level blocks. Honor `data-block-glue-next`: buffer the block and
  // check whether it + the following block both fit on the current page.
  const topBlocks = directBlockChildren(bodyEl);
  let i = 0;
  while (i < topBlocks.length) {
    const block = topBlocks[i];
    const kind = block.dataset.block ?? "";
    const h = measure(block);
    const gluesNext = block.dataset.blockGlueNext !== undefined && i + 1 < topBlocks.length;

    if (gluesNext) {
      const next = topBlocks[i + 1];
      const nh = measure(next);
      // If both fit, place both. Otherwise move the glued pair to next page
      // (only when the current page isn't fresh).
      const both = h + nh;
      if (both <= remaining()) {
        commit(block.cloneNode(true) as HTMLElement, h);
        // fall through to place `next` normally (will fit)
      } else if (used > 0 && both <= usable) {
        openNewPage();
        commit(block.cloneNode(true) as HTMLElement, h);
      } else {
        // Cannot glue — place block on its own.
        if (h > remaining() && used > 0) openNewPage();
        commit(block.cloneNode(true) as HTMLElement, h);
      }
      i += 1;
      continue;
    }

    if (h <= remaining()) {
      commit(block.cloneNode(true) as HTMLElement, h);
    } else if (SPLITTABLE.has(kind)) {
      splitContainer(block, h);
    } else {
      placeAtomic(block, h);
    }
    i += 1;
  }

  // Trim a trailing empty page (defensive; shouldn't occur).
  while (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();
  return pages;
}

/**
 * Apply localized `Page X of Y` text to every page footer node under `root`.
 * The template must contain `{current}` and `{total}` placeholders and use
 * Latin digits (0–9) — Arabic strings written with Latin digits are honored.
 */
export function applyPageNumberFooters(
  pageEls: HTMLElement[],
  template: string,
): void {
  const total = pageEls.length;
  pageEls.forEach((pageEl, idx) => {
    const footer = pageEl.querySelector<HTMLElement>("[data-page-footer]");
    if (!footer) return;
    footer.textContent = template
      .replace("{current}", String(idx + 1))
      .replace("{total}", String(total));
  });
}
