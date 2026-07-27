/// <reference types="node" />
/**
 * Phase N+3 Slice 2.2D — Shared Invoice Pagination Engine tests.
 *
 * The engine measures block heights via a caller-supplied `measure` function
 * so jsdom (which does not compute real layout) is fully deterministic.
 */
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { paginateIntoPages, applyPageNumberFooters } from "../invoicePaginator";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
const document = dom.window.document;

const makeBody = (html: string): HTMLElement => {
  const container = document.createElement("div");
  container.className = "pdf-body";
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
};

const heightMap = (map: Record<string, number>) =>
  (el: HTMLElement): number => {
    const key = el.getAttribute("data-h");
    if (key && key in map) return map[key];
    // sum of descendants (used for shell headings once children exist)
    let total = 0;
    for (const child of Array.from(el.children)) {
      total += (child as HTMLElement).getAttribute("data-h") &&
        map[(child as HTMLElement).getAttribute("data-h")!] || 0;
    }
    return total;
  };

describe("paginateIntoPages", () => {
  it("keeps atomic blocks whole and moves overflow to a new page", () => {
    const body = makeBody(`
      <div data-block="header" data-h="a">A</div>
      <div data-block="bill-to" data-h="b">B</div>
      <div data-block="totals" data-h="c">C</div>
    `);
    const pages = paginateIntoPages(body, {
      usablePx: 100,
      continuationSuffix: " — cont",
      measure: heightMap({ a: 40, b: 40, c: 40 }),
    });
    expect(pages).toHaveLength(2);
    expect(pages[0].map((el) => el.getAttribute("data-block"))).toEqual([
      "header",
      "bill-to",
    ]);
    expect(pages[1].map((el) => el.getAttribute("data-block"))).toEqual(["totals"]);
  });

  it("keeps a payment session whole when it fits on a fresh page (INV-0986 shape)", () => {
    // Page 1 already has header + Session #1. Session #2 heading + rows don't
    // fit on page 1 but fit entirely on an empty page 2.
    const body = makeBody(`
      <div data-block="header" data-h="h">H</div>
      <div data-block="payment-session" data-h="s1">
        <div data-block-heading data-h="s1h"><span data-continuation-label>Session 1</span></div>
        <div data-block="session-row" data-h="s1r1">r</div>
        <div data-block="session-row" data-h="s1r2">r</div>
      </div>
      <div data-block="payment-session" data-h="s2">
        <div data-block-heading data-h="s2h"><span data-continuation-label>Session 2</span></div>
        <div data-block="session-row" data-h="s2r1">r</div>
        <div data-block="session-row" data-h="s2r2">r</div>
      </div>
    `);
    // usable=100. header=30, s1=40 (fits on p1 total 70), s2=40 but only 30 left
    // → s2 must move whole to page 2.
    const pages = paginateIntoPages(body, {
      usablePx: 100,
      continuationSuffix: " — Continued",
      measure: heightMap({
        h: 30, s1: 40, s1h: 10, s1r1: 15, s1r2: 15,
        s2: 40, s2h: 10, s2r1: 15, s2r2: 15,
      }),
    });
    expect(pages).toHaveLength(2);
    // Page 1: header + full session-1
    expect(pages[0].map((el) => el.getAttribute("data-block"))).toEqual([
      "header",
      "payment-session",
    ]);
    // Page 2: full session-2 with heading text intact (no continuation suffix)
    expect(pages[1]).toHaveLength(1);
    const s2 = pages[1][0];
    expect(s2.getAttribute("data-block")).toBe("payment-session");
    const heading = s2.querySelector("[data-continuation-label]");
    expect(heading?.textContent).toBe("Session 2");
    // Both rows remain attached
    expect(s2.querySelectorAll('[data-block="session-row"]').length).toBe(2);
  });

  it("splits an oversized session only between rows and repeats heading with suffix", () => {
    const body = makeBody(`
      <div data-block="payment-session" data-h="s">
        <div data-block-heading data-h="sh"><span data-continuation-label>S1</span></div>
        <div data-block="session-row" data-h="r1">r</div>
        <div data-block="session-row" data-h="r2">r</div>
        <div data-block="session-row" data-h="r3">r</div>
        <div data-block="session-row" data-h="r4">r</div>
      </div>
    `);
    // usable=50. heading=10, each row=20. Whole session=90 > 50, so must split.
    // Page 1: heading(10) + r1(20) + r2(20) = 50. Page 2: heading(10) + r3(20) + r4(20) = 50.
    const pages = paginateIntoPages(body, {
      usablePx: 50,
      continuationSuffix: " — Continued",
      measure: heightMap({ s: 90, sh: 10, r1: 20, r2: 20, r3: 20, r4: 20 }),
    });
    expect(pages).toHaveLength(2);
    const p1Rows = pages[0][0].querySelectorAll('[data-block="session-row"]');
    const p2Rows = pages[1][0].querySelectorAll('[data-block="session-row"]');
    expect(p1Rows.length).toBe(2);
    expect(p2Rows.length).toBe(2);
    // Continuation heading suffix appended on page 2 only
    expect(
      pages[0][0].querySelector("[data-continuation-label]")?.textContent,
    ).toBe("S1");
    expect(
      pages[1][0].querySelector("[data-continuation-label]")?.textContent,
    ).toBe("S1 — Continued");
  });

  it("glues payment-history heading to the first session", () => {
    const body = makeBody(`
      <div data-block="header" data-h="h">H</div>
      <div data-block="payment-history-heading" data-block-glue-next data-h="ph">History</div>
      <div data-block="payment-session" data-h="s">
        <div data-block-heading data-h="sh"><span data-continuation-label>S</span></div>
        <div data-block="session-row" data-h="r">r</div>
      </div>
    `);
    // usable=60. header=40. If we placed ph alone (5), then session (30) wouldn't fit on same page.
    // Glue rule: both ph+session fit together in remaining? 40+5+30=75 > 60 → move pair to p2.
    const pages = paginateIntoPages(body, {
      usablePx: 60,
      continuationSuffix: "",
      measure: heightMap({ h: 40, ph: 5, s: 30, sh: 10, r: 20 }),
    });
    expect(pages).toHaveLength(2);
    expect(pages[0].map((e) => e.getAttribute("data-block"))).toEqual(["header"]);
    expect(pages[1].map((e) => e.getAttribute("data-block"))).toEqual([
      "payment-history-heading",
      "payment-session",
    ]);
  });

  it("splits an item-group between complete items and repeats the horse heading", () => {
    const body = makeBody(`
      <div data-block="item-group" data-h="g">
        <div data-block-heading data-h="gh"><span data-continuation-label>Horse: Tako</span></div>
        <div data-block="item" data-h="i1">item</div>
        <div data-block="item" data-h="i2">item</div>
        <div data-block="item" data-h="i3">item</div>
      </div>
    `);
    // usable=50. heading=10, each item=20. Total=70>50 → split.
    // Page 1: heading + i1 + i2 = 50. Page 2: heading(cont) + i3 = 30.
    const pages = paginateIntoPages(body, {
      usablePx: 50,
      continuationSuffix: " — تابع",
      measure: heightMap({ g: 70, gh: 10, i1: 20, i2: 20, i3: 20 }),
    });
    expect(pages).toHaveLength(2);
    expect(pages[0][0].querySelectorAll('[data-block="item"]').length).toBe(2);
    expect(pages[1][0].querySelectorAll('[data-block="item"]').length).toBe(1);
    expect(pages[1][0].querySelector("[data-continuation-label]")?.textContent).toBe(
      "Horse: Tako — تابع",
    );
  });

  it("does not create a blank trailing page", () => {
    const body = makeBody(`
      <div data-block="header" data-h="a">A</div>
      <div data-block="totals" data-h="b">B</div>
    `);
    const pages = paginateIntoPages(body, {
      usablePx: 100,
      continuationSuffix: "",
      measure: heightMap({ a: 40, b: 40 }),
    });
    expect(pages).toHaveLength(1);
  });
});

describe("applyPageNumberFooters", () => {
  it("writes Page X of Y with Latin digits (EN and AR templates)", () => {
    const p1 = document.createElement("div");
    const p2 = document.createElement("div");
    const p3 = document.createElement("div");
    for (const p of [p1, p2, p3]) {
      const f = document.createElement("div");
      f.setAttribute("data-page-footer", "");
      p.appendChild(f);
    }

    applyPageNumberFooters([p1, p2, p3], "Page {current} of {total}");
    expect(p1.querySelector("[data-page-footer]")!.textContent).toBe("Page 1 of 3");
    expect(p2.querySelector("[data-page-footer]")!.textContent).toBe("Page 2 of 3");
    expect(p3.querySelector("[data-page-footer]")!.textContent).toBe("Page 3 of 3");

    applyPageNumberFooters([p1, p2], "الصفحة {current} من {total}");
    expect(p1.querySelector("[data-page-footer]")!.textContent).toBe(
      "الصفحة 1 من 2",
    );
    expect(p2.querySelector("[data-page-footer]")!.textContent).toBe(
      "الصفحة 2 من 2",
    );
  });

  it("emits Page 1 of 1 for a single-page invoice", () => {
    const p = document.createElement("div");
    const f = document.createElement("div");
    f.setAttribute("data-page-footer", "");
    p.appendChild(f);
    applyPageNumberFooters([p], "Page {current} of {total}");
    expect(p.querySelector("[data-page-footer]")!.textContent).toBe("Page 1 of 1");
  });
});
