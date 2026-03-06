# Fix Plan: Unified Enrichment Pipeline for Ledger + Payments Hover Parity (Patched)

## Root Causes

1. **LedgerTab pre-filter** (`DashboardFinance.tsx:305-308`): Only sends entries WITHOUT `" | "` to enrichment. Entries that already have pipe-separated descriptions (written at invoice/payment creation time) are excluded entirely — they never get structured fields.
2. **Short-circuit in enrichment** (`enrichLedgerDescriptions.ts:32-33`): If `desc.includes(" | ")`, immediately stores `{ display: desc }` with zero structured fields. Even if `reference_id` exists, no invoice_items/horses/samples are fetched.
3. **Payment branch** (`enrichLedgerDescriptions.ts:156-159`): Only builds display string with method + invoice number. Never resolves `invoice_items → lab_samples → lab_horses` for payment entries, so "paid for what?" is missing.

## Changes

### File 1: `src/lib/finance/enrichLedgerDescriptions.ts`

**Change the short-circuit logic (lines 30-37):**

- If `entry.reference_id` exists → always push to `needsEnrichment` (use existing description as fallback display only)
- Only short-circuit when `reference_id` is null AND description has pipes

**Important guard (edge-case safety):**

- If `needsEnrichment` contains entries but `invoiceIds.length === 0` (e.g., reference_id missing/invalid), return a safe fallback object per entry:
  - `display: entry.description || "-"` plus `paymentMethod` if present
  - This prevents breaking hover/cards when data is partially missing

**Change the payment branch (lines 156-159):**

- After building payment display string, also resolve `invoice_items` via `reference_id` (same as invoice branch)
- Populate `items[]` for payment entries ALWAYS (even if no lab_sample link)
- If any invoice_items have `entity_type='lab_sample'`, also populate `horseName`, `horseNameAr`, `sampleLabel`
- This directly enables “paid for what?” in Payments hover preview

**Shared resolution requirement (must be explicit):**

- The invoice_items → (optional) lab_sample → horse/sample resolution must run for BOTH `payment` and `invoice` entry types.
- If there are no `lab_sample` items, still return `items[]` so the preview shows “what it was for” at least on the items level.

This means the "Build enriched descriptions" loop (lines 141-202) must share the invoice_items/horse/sample resolution for BOTH `payment` and `invoice` entry types (not only invoice).

### File 2: `src/pages/DashboardFinance.tsx`

**LedgerTab enrichment** `useEffect` **(lines 303-326):**

- Remove the `genericEntries` pre-filter — send ALL entries to `enrichLedgerDescriptions`.
- Rationale: the enrichment function now safely short-circuits only when `reference_id` is null AND pipes exist, so passing all entries is safe and guarantees structured fields for anything linkable.

**PaymentsTab enrichment** `useEffect` **(lines 577-597):**

- Ensure we still send ALL payment entries (not only those without pipes).
- Keep the existing shaping/map to the minimal entry object `{ id, entry_type, description, reference_id, payment_method }`, but do NOT add any `" | "` based exclusion.
- This guarantees payment hover previews can resolve invoice_items/horses/samples.

Both tabs already store `Map<string, EnrichedDescription>` and wire `LedgerRowPreview` — no change needed there.

### File 3: `src/components/finance/LedgerRowPreview.tsx`

- Already correct — renders all structured fields. No changes needed.

## Concrete Implementation

### `enrichLedgerDescriptions.ts` — new short-circuit:

```
for (const entry of entries) {
  const desc = entry.description || "";
  if (!entry.reference_id && desc.includes(" | ")) {
    // No reference to resolve — keep existing display
    result.set(entry.id, { display: desc, paymentMethod: entry.payment_method || undefined });
  } else {
    needsEnrichment.push(entry);
  }
}
```

### `enrichLedgerDescriptions.ts` — payment branch gets items/horse/sample (and items even without lab_sample):

In the "Build enriched descriptions" loop:

- For BOTH `payment` and `invoice`:
  - Resolve `invoiceNumber` from invoices map
  - Resolve `itemsByInvoice` from invoice_items
  - Always collect `itemNames` from `items.map(i.description)`
  - If any item has `entity_type='lab_sample'`, resolve sample → horse/sampleLabel (same as invoice currently does)
- Payment display can remain the same (Payment | Method | INV...), but enriched object MUST include:
  - `invoiceNumber`, `items[]` (if any), `horseName/horseNameAr/sampleLabel` (when resolvable), `paymentMethod`

### `enrichLedgerDescriptions.ts` — safety guard when invoiceIds is empty:

- If `invoiceIds.length === 0`, do not attempt invoice/items fetch; return safe fallback objects for `needsEnrichment`.

### `DashboardFinance.tsx` — LedgerTab `useEffect`:

Remove `genericEntries` filter. Send all entries to `enrichLedgerDescriptions`.

### `DashboardFinance.tsx` — PaymentsTab `useEffect`:

Send all payment entries (no `" | "` exclusion), keeping the minimal object mapping.

## Gates

**Gate 1**: Update `enrichLedgerDescriptions.ts` — fix short-circuit + add items/horse/sample to payment branch (and ensure items[] is populated even without lab_sample). Add the empty-invoiceIds safety guard.  
  
**Gate 2**: Update `DashboardFinance.tsx` LedgerTab useEffect — remove pre-filter and send all entries.  
  
**Gate 3**: Verify both tabs show rich hover for all entry types.

## Verification

1. Ledger → hover invoice row created from Invoices page → shows invoice# + items (even if no lab_sample link)
2. Ledger → hover invoice row from lab flow → shows invoice# + horse + sample + items (unchanged)
3. Payments → hover any payment → shows invoice# + method + items + horse/sample when applicable
4. Arabic UI → horse `name_ar` shown, labels Arabic
5. No N+1 queries — all batch fetched
6. Print/CSV unaffected (uses `.display` string)