## A. Verdict

**UNIFIED INVOICE PAGINATION CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED**

## B. Attached PDF Finding (`فاتورة INV-0986 - 4.pdf`)

- Page 1 renders: header, Bill-To, items grouped by horse, totals, Payment Summary block, then Payment History heading, then Session #1 in full, then **Session #2 heading + date + total + subsection headings** — clipped at the page bottom mid-block.
- Page 2 continues with the remaining Session #2 rows (Cash SAR 100.00, Fatin SAR 100.00) and the thank-you footer.
- No page numbering appears on either page.
- No `page-break-inside: avoid` rule is present on any session/item/totals block in `createInvoiceHTML`.
- The 2-page output was produced by the browser Print path (`printInvoice`), which relies purely on native browser reflow with `@page { size: A4; margin: 0 }` and no CSS keep-together hints.

## C. Current Output Architecture

Single shared generator: `src/components/finance/InvoicePDFGenerator.tsx`.

| Function | Path | Mechanism |
|---|---|---|
| `createInvoiceHTML(options)` | Pure HTML string builder | One flat `<div>` tree; no page containers, no block metadata for pagination |
| `generateInvoicePDF` → `downloadInvoicePDF` | Download PDF | Offscreen `<div style="width:210mm">` → `html2canvas(scale:2)` → **one** `pdf.addImage(png, "PNG", 0, 0, 210, imgHeight)` with `imgHeight` derived from full canvas ratio. **No `addPage`, no canvas slicing** — a >297 mm image is placed once and jsPDF clips it visually to page 1. |
| `printInvoice` | Browser print popup | Same `createInvoiceHTML` HTML written into a same-origin popup with `@page { size: A4; margin: 0 }`; the browser reflows and paginates natively with **no `page-break-inside` / `break-inside` rules** on any logical block. |

Both entry surfaces (`InvoicesList.doExport` + `InvoiceDetailsSheet.handleExport`) call `printInvoice` / `downloadInvoicePDF` with the same options contract. There are no other Invoice PDF or print entry points in the codebase.

## D. Account-Type & Invoice-Path Inventory

Invoice output uses one shared surface pair for every account type that opens the shared Finance Invoice UI (Stable, Laboratory, Horse Owner, Doctor/Clinic and other tenants using the shared Invoice list). No account-specific PDF generator, HTML template, or print handler exists — search for `InvoicePDFGenerator|downloadInvoicePDF|printInvoice|createInvoiceHTML` returns exactly the two consumer files and the tests.

| Surface | Route/Handler | Generator | Template | Pagination today |
|---|---|---|---|---|
| Invoice Details → Print | `InvoiceDetailsSheet.handleExport("print")` | `printInvoice` | shared `createInvoiceHTML` | browser native, no rules |
| Invoice Details → Download | `InvoiceDetailsSheet.handleExport("download")` | `downloadInvoicePDF` | shared `createInvoiceHTML` | single-image, no addPage |
| Invoice List → Print | `InvoicesList.doExport("print")` | `printInvoice` | shared | browser native, no rules |
| Invoice List → Download | `InvoicesList.doExport("download")` | `downloadInvoicePDF` | shared | single-image, no addPage |

There is no Share/Email/Preview path emitting invoice HTML.

## E. Shared Generator Coverage

The proposed single Shared Invoice Pagination Engine can be installed inside `InvoicePDFGenerator.tsx` and cover 100% of active surfaces without any per-account fork.

## F. Exact Pagination Root Cause

Two independent defects producing the reported symptoms:

1. **Download PDF** — `generateInvoicePDF` renders one long canvas and inserts it with a single `pdf.addImage(..., 0, 0, 210, imgHeight)`. Content past page 1 is clipped, not paginated. There is no `addPage` loop and no per-page canvas slice.
2. **Print (attached INV-0986 PDF)** — `createInvoiceHTML` emits a flat HTML tree with no `page-break-inside: avoid`, `break-inside: avoid`, or `page-break-before` hints on any block. Session #2's container is therefore free to break at any DOM element boundary, so the browser splits it after the subsection headings when the remaining Page-1 space runs out. There is also no page-number footer.

Both defects are eliminated by installing one shared, block-aware paginator that pre-slices the content into fixed-height page containers before rendering.

## G. Canonical Page Dimensions

Locked contract for the engine:

- Paper: **A4 portrait**, 210 × 297 mm.
- Outer container width: 210 mm (already used).
- Page padding (all four sides): 12 mm (usable content 186 × 273 mm).
- Reserved footer strip: 10 mm at the bottom for `Page X of Y`.
- Usable block-flow height per page: **263 mm** (≈ 993 px @ 96 dpi, ≈ 1986 px @ scale 2).
- Same dimensions for Download PDF and Print (Print `@page` becomes `size: A4; margin: 0` with the paginator supplying its own inner padding).

## H. Logical-Block Contract

Every renderer output attaches `data-block` metadata. The paginator only decides breaks between siblings that expose one of these block types:

```
data-block="header"           keep-together
data-block="bill-to"          keep-together
data-block="items-table"      splittable at item-group boundaries
data-block="item-group"       keep first heading with first item
data-block="item"             atomic
data-block="totals"           keep-together
data-block="payment-summary"  keep-together
data-block="payment-session"  keep-together (see M for oversize)
data-block="session-row"      atomic (method row / distribution row)
data-block="notes"            keep-together when it fits, else split at paragraph
data-block="footer-thankyou"  keep-together
```

## I. Invoice Item Pagination

Items are wrapped in `<tbody data-block="item-group" data-horse-id="…">`. Each item row plus its child package rows carry `data-block="item"` so the paginator moves the row as a unit. The `item-group` header row (`<tr data-block="group-heading">`) is glued to the first `item` — the paginator never places a group heading as the last block on a page.

## J. Horse-Group Pagination

When a group needs to continue across pages, the paginator repeats the group heading on the continuation page and appends a localized continuation suffix:

- Arabic: `— تابع`
- English: `— Continued`

Break points are always between whole `data-block="item"` rows.

## K. Totals & Payment-Summary Pagination

`totals` and `payment-summary` are wrapped as atomic keep-together blocks. If either does not fit in the remaining space, it moves whole to the next page.

## L. Payment-Session Pagination

Each session becomes `<div data-block="payment-session">`. When it fits on an empty page, it is atomic — this is the exact correction that keeps Session #2 whole on Page 2 in INV-0986. Method rows and horse-distribution rows are wrapped as `data-block="session-row"` so oversized sessions (M) split only between whole rows.

## M. Oversized-Block Behavior

- **Oversized item group (>1 page)** — split between `data-block="item"` rows; repeat the group heading with the continuation suffix on each new page.
- **Oversized payment session (>1 page)** — split between `data-block="session-row"` rows; repeat the session heading + the currently open subsection heading (Methods / Distribution) with the continuation suffix; never split an individual row.
- **Single item taller than one full page** — measure once; if `item.height > usable`, the paginator places it on a fresh page and allows one controlled overflow onto the next page, splitting only at the nearest text-line boundary inside the description cell. This is the only case where an atomic block may break. The engine logs a `pdf.item.overflow` warning and the block still carries its group heading on both pages.

## N. Orphan / Widow Protection

Deterministic minimum-companion rules enforced by the paginator, not by CSS:

- `group-heading` requires ≥1 following `item` on the same page.
- `payment-session` heading requires ≥ session-total row + first `session-row` on the same page.
- `methods-heading` / `distribution-heading` require ≥1 `session-row` on the same page.
- `totals-heading` requires the full totals block.
- No content is placed in the bottom 10 mm reserved footer strip.

## O. Page-Numbering Contract

- Every page renders a footer `<div data-page-footer>` inside its page container, absolutely positioned at 8 mm from the page bottom, centered.
- Format: Arabic `الصفحة X من Y`, English `Page X of Y`, always with Latin digits (0-9).
- Font: current IBM Plex family; 10 pt; color `#6b7280`.
- The value is written **after** pagination completes and `Y` is known — never CSS `counter()` (unsupported in html2canvas and inconsistent in browser print). For Download PDF the footer text is drawn twice: once into the HTML page container captured by html2canvas, once by `pdf.text` overlay to guarantee crispness. For Print the same in-container footer is used and the app suppresses default browser headers/footers via `@page { margin: 0 }` (already in place).

## P. Arabic / English Contract

- Direction is set on the outer page container (`dir`, `lang`).
- Block measurement occurs after `waitForInvoicePdfFonts` resolves (already implemented) and one `requestAnimationFrame` later — extended by a `document.fonts.check` re-poll to catch late-swapped Arabic faces.
- Continuation suffix and page-number strings resolve through the existing `InvoicePDFLabels` bundle (new keys added).
- No pagination logic depends on English character widths — all decisions are based on `getBoundingClientRect().height` of the rendered block in its final direction.

## Q. Print / Download Parity

Both paths call one new `paginateInvoiceHTML(html, opts)` helper that returns an array of page containers (`<div class="pdf-page" data-page-index="i">`). Print writes those containers in sequence into the popup; Download rasterizes each container to its own canvas and calls `pdf.addPage()` between them. Same HTML, same measurements, same block decisions.

## R. Account-Specific Content Safety

The engine treats any block with `data-block` as opaque content. Laboratory sample metadata, package details, external references, notes, horse identity, tax and discount breakdown remain fully rendered — the paginator never mutates or truncates content.

## S. Exact Files Proposed

| File | Function | Current | Change |
|---|---|---|---|
| `src/components/finance/InvoicePDFGenerator.tsx` | `createInvoiceHTML` | flat HTML, no block metadata | annotate every logical block with `data-block` and stable `data-page-key` attributes; wrap output in a single `.pdf-body` container without pagination |
| `src/components/finance/InvoicePDFGenerator.tsx` | `generateInvoicePDF` | one canvas, one addImage | mount body offscreen, run new `paginateIntoPages(bodyEl, geometry)`, then loop pages: `html2canvas(pageEl)` + `pdf.addPage()` between iterations, overlay `pdf.text` page-number after loop |
| `src/components/finance/InvoicePDFGenerator.tsx` | `printInvoice` | writes single flat HTML | write the paginated `.pdf-page` containers into the popup with the same shared paginator |
| `src/components/finance/InvoicePDFGenerator.tsx` | `InvoicePDFLabels` | no continuation/page-number keys | add `continuationSuffix`, `pageOf` (format string `"Page {current} of {total}"` / `"الصفحة {current} من {total}"`) |
| `src/components/finance/invoicePaginator.ts` **(new)** | `paginateIntoPages` | — | pure DOM measurement engine implementing the block contract |
| `src/components/finance/InvoiceDetailsSheet.tsx` | label bundle | 15 keys | supply the two new label keys |
| `src/components/finance/InvoicesList.tsx` | label bundle | 15 keys | supply the two new label keys |
| `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts` | invoice PDF label group | — | add `pdf.continuationSuffix` and `pdf.pageOf` |
| `src/components/finance/__tests__/invoicePaginator.test.ts` **(new)** | — | — | pure paginator unit tests |
| `src/components/finance/__tests__/InvoicePDFGenerator.pagination.test.ts` **(new)** | — | — | rendered-HTML page-boundary + page-number tests over Stable / Lab / Horse-Owner fixtures |

No other files are modified. No database, RPC, RLS, grant, migration, translation-key rename, invoice-row, payment-row, or ledger change.

## T. Three-Step Execution Plan

### Step A — Shared logical-block paginator

- **Files:** new `src/components/finance/invoicePaginator.ts`; edits to `createInvoiceHTML` in `src/components/finance/InvoicePDFGenerator.tsx`.
- **Block metadata:** the `data-block` vocabulary in H, attached at HTML build time (no runtime classification).
- **Measurement:** after `waitForInvoicePdfFonts` + one `requestAnimationFrame`, iterate top-level children of `.pdf-body`; for each block read `getBoundingClientRect().height`.
- **Geometry:** A4 portrait, 210 × 297 mm, 12 mm padding all sides, 10 mm reserved footer, usable height 263 mm converted to px via the container's actual CSS pixel ratio.
- **Placement algorithm (deterministic):**
  1. Open first `.pdf-page` with `used = 0`.
  2. For each block in DOM order: if `used + height ≤ usable` → append clone to current page and add height; else if the block is atomic → close current page, open new page, append; else (splittable — `item-group`, `payment-session`, `notes`) recurse into its `data-block` children applying the same rule, cloning the heading with the continuation suffix onto every continuation page.
  3. If a single atomic block exceeds `usable`, mark it oversize and split at nearest text-line boundary (see M single-item rule).
- **Bilingual behavior:** measurement happens after fonts load; direction attributes are propagated to every `.pdf-page` container.
- **Account coverage:** one code path used by every Invoice output surface.
- **Rollback:** revert `InvoicePDFGenerator.tsx` and delete `invoicePaginator.ts` — the flat renderer returns.

### Step B — Page numbering and output integration

- **Files:** `src/components/finance/InvoicePDFGenerator.tsx` (`generateInvoicePDF`, `printInvoice`); `src/i18n/locales/{en,ar}.ts`; label bundles in `InvoiceDetailsSheet.tsx` and `InvoicesList.tsx`.
- **Footer:** after pagination knows `total`, walk `.pdf-page` nodes and set `data-page-footer` text using `labels.pageOf` with Latin digits (`current`, `total`).
- **Download integration:** rasterize each `.pdf-page` at `scale: 2`; call `pdf.addImage` per page and `pdf.addPage()` between; after the loop, additionally overlay page-number text via `pdf.text` centered at `y = 297 - 6 mm` for print-crisp legibility.
- **Print integration:** the popup receives the array of `.pdf-page` containers in order; the existing `@page { size: A4; margin: 0 }` rule keeps one container per printed page; the in-container footer supplies `Page X of Y`.
- **Existing final footer interaction:** the existing thank-you block becomes `data-block="footer-thankyou"` and is placed as the last document block; the paginator ensures it does not overlap the reserved footer strip.
- **Rollback:** revert the two functions and the label additions.

### Step C — Focused regression tests

- **Files:**
  - `src/components/finance/__tests__/invoicePaginator.test.ts` — pure paginator: keep-together, split at row boundaries, oversize handling, orphan protection.
  - `src/components/finance/__tests__/InvoicePDFGenerator.pagination.test.ts` — build HTML via `__createInvoiceHTMLForTest` on Stable, Laboratory, and Horse-Owner-shaped fixtures (including INV-0986 shape); run paginator over a jsdom snapshot with mocked `getBoundingClientRect`; assert exact page contents and page-number strings in EN + AR.
- Extend existing `InvoicePDFGenerator.paymentDisclosure.test.ts` only to add one assertion that a two-session fixture matching INV-0986 places Session #2 on page 2 as a whole.
- Run `bunx vitest run src/components/finance/__tests__` for the focused suite.
- Run `bunx tsgo --noEmit` and `bun run build`.

## U. Focused Test Plan

Assertions covered (all executed under EN + AR variants where relevant):

- 1-line item stays whole; 3-line item stays whole when it fits on an empty page; item that doesn't fit moves whole.
- Horse group heading remains with first item; group with 20 items splits only between items; heading repeats on continuation page with `— Continued` / `— تابع`.
- Totals block atomic; Payment Summary (Status + Paid + Outstanding) atomic.
- Payment Session atomic when it fits an empty page; INV-0986 fixture: Session #2 moves whole to page 2.
- Payment Session oversize: splits only between whole `session-row` blocks; session heading + subsection heading repeated with suffix.
- Method rows and horse-distribution rows never split.
- Notes block stays whole when it fits.
- No orphan heading at bottom; no blank trailing page (assert `pages.length` equals last populated index + 1).
- Page-number strings: `Page 1 of 1`, `Page 1 of 2`, `Page 2 of 2`, three-page cases; Arabic form uses Latin digits; footer never overlaps the last content row (assert vertical distance).
- No financial values change during pagination (snapshot totals + line totals identical to pre-paginated tree).
- Both Download and Print paths call the same paginator (spy on `paginateIntoPages`).

## V. Manual Acceptance Plan

Scenarios 1–6 as specified: INV-0986 two-session parity, 20-item invoice, multi-line item, ≥3 sessions, Arabic/English parity, and cross-account (Stable + Laboratory + one additional configured Invoice-capable account).

## W. Performance & Reliability

- Complexity: O(blocks) DOM measurements + O(pages) canvas rasterizations. On a 50-item, 3-session invoice this is <100 measurements and ≤4 canvases at `scale: 2` (~2 MB each) — within the current html2canvas budget already used for single-page rasterization.
- No duplicated rendering: the same offscreen `.pdf-body` is measured once, then decomposed by node cloning; render passes are per-page canvas only.
- No timeout risk beyond current baseline.
- Memory: peak ~4 canvases in scope during Download; Print does not rasterize.

## X. Database Changes Required

None.

## Y. Persistent Rows Modified

None.

## Z. Roadmap

Phase N+3 Slice 2.2D — closes unified invoice pagination. Slices 3 and 4 remain not started. Phase N+4 and Retail POS still excluded.

## AA. Next Exact Action

AWAIT USER APPROVAL OF THE UNIFIED INVOICE PAGINATION PLAN.

---

## APPROVAL HANDOFF — SEND THIS EXACT MESSAGE

Approve Slice 2.2D: install one Shared Invoice Pagination Engine in `src/components/finance/InvoicePDFGenerator.tsx` plus a new pure module `src/components/finance/invoicePaginator.ts`, annotate every logical block in `createInvoiceHTML` with the `data-block` contract (header, bill-to, item-group, item, totals, payment-summary, payment-session, session-row, notes, footer-thankyou), refactor `generateInvoicePDF` to loop `html2canvas` + `pdf.addPage()` per paginated `.pdf-page` container, refactor `printInvoice` to write the paginated containers into the popup with `@page { size: A4; margin: 0 }`, add localized `Page X of Y` (Latin digits, Arabic `الصفحة X من Y`) as an in-container footer on every page plus a jsPDF text overlay for Download, honor keep-together for headers/totals/payment-summary/payment-session, allow oversize splits only between `data-block="item"` or `data-block="session-row"` rows with repeated heading + `— Continued` / `— تابع`, protect orphans/widows by deterministic minimum-companion rules, add the two label keys `pdf.continuationSuffix` and `pdf.pageOf` in `src/i18n/locales/{en,ar}.ts` and thread them through `InvoiceDetailsSheet.tsx` and `InvoicesList.tsx` label bundles, add focused Vitest coverage under `src/components/finance/__tests__/invoicePaginator.test.ts` and `src/components/finance/__tests__/InvoicePDFGenerator.pagination.test.ts` including an INV-0986-shaped fixture, and run `bunx tsgo --noEmit` + `bun run build`.

Authorized:
- One shared Invoice pagination engine covering every Invoice-capable account type through the existing shared generator
- Logical-block page-break protection, Invoice Item atomicity, Horse-heading continuation behavior, Payment Session atomicity, controlled oversized-block continuation, orphan/widow protection
- `Page X of Y` on every page (Download + Print, EN + AR, Latin digits)
- Print and Download integration via the same paginator
- Focused Vitest additions
- TypeScript check + production build

Prohibited:
- Financial calculation changes; Invoice-row changes; Payment-row changes; Ledger, Customer Balance, or allocation changes
- Database changes; RPC changes; RLS or grant changes; migrations
- Payment Dialog changes; Invoice approval changes
- Multi-Invoice Payment UI; refunds; reversals; credit; overpayment
- Retail POS