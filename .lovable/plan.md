
# Lab Invoice Details — Hide Internal Marker, Restore Sample-Number Context

## A. Verdict

`LAB INVOICE DISPLAY CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED`

No DB migration, no RPC change, no marker-storage change. Presentation-only fix in `InvoiceDetailsSheet.tsx` plus one tiny helper.

## B. What the Screenshots Prove

- Screenshot 31: `lab_samples.daily_number` is the user-visible number (`#4`); this column is persisted and stable — not a row index.
- Screenshot 38: `INV-9921` (created via the RPC path) renders `[LAB:lab_sample:<uuid>]` because the Notes card prints `invoice.notes` verbatim, and no Sample-number row appears because the RPC-created row has no `entity_type/entity_id` on `invoice_items` (only the pre-RPC legacy path populated those).

## C. Current Component and Data Flow

- Route: `/dashboard/finance/invoices` → `src/pages/DashboardFinance.tsx`
- Drawer: `src/components/finance/InvoiceDetailsSheet.tsx` (single generic layout for all invoices).
- Fetches: direct `supabase.from("invoices").select("*")` + `supabase.from("invoice_items").select("*")` inside `fetchInvoiceDetails` (lines 129–342).
- Notes rendering: lines 700–709 render `invoice.notes` unescaped/unfiltered.
- Header context: `invoiceContext` state `{ horseName, sampleLabel }` computed at lines 292–335. Sample resolution today runs ONLY when `invoice_items.entity_type === 'lab_sample'` (line 155). RPC-generated items never satisfy that, so `sampleLabel`/header horse stay empty for all new Lab invoices.
- Per-line enrichment: line 254–288 uses `horse_id` / `lab_horse_id` on items — those DO work on RPC-created rows.
- No source-aware branch exists; presentation is unified.

## D. Git-History Findings

The persisted marker convention (`[LAB:<type>:<uuid>]` in `invoices.notes`) was added in the Lab RPC cutover (`useLabInvoiceDraft.ts`) that is already in the tree; the older Lab-specific summary card was replaced by the generic `invoiceContext` block above. The current `invoiceContext.sampleLabel` display (Sample No. row) is the intended "restored" surface — it just no longer fires because sample resolution never walks the marker. No obsolete component needs to be resurrected; we extend the existing `invoiceContext` computation to also read the marker.

## E. Previous Laboratory Invoice Presentation

Client + Issue Date + Horse + Sample No. rows already exist in the Invoice Info card (lines 712–779). They render correctly whenever `invoiceContext` is populated. Fix = repopulate `invoiceContext` for RPC-origin Lab invoices; do not add a new card.

## F. Internal Marker Contract

- Producer: `src/hooks/laboratory/useLabInvoiceDraft.ts::composeNotesWithMarker` → appends `\n[LAB:<sourceType>:<uuid>]` to `invoices.notes`.
- Consumer (dedupe): `useLabInvoiceDraft.checkExistingInvoice` — `.ilike("notes", "%[LAB:...]%")`.
- Regex source of truth: `LAB_SOURCE_MARKER_RE = /\[LAB:(lab_sample|lab_request):([0-9a-fA-F-]{36})\]/`.
- Persisted only in `invoices.notes`. No other feature reads it. Genuine user notes may precede the marker (blank line separator).
- Display sanitization must remove ONLY the exact marker substring + adjacent whitespace; unrelated bracketed text must survive.

## G. Exact Sample-Number Source

`public.lab_samples.daily_number` (nullable integer). Rendered elsewhere as `#${daily_number}` (see `SamplesList.tsx` / `SampleCard.tsx` / `ResultsList.tsx`). This is a persisted, tenant/date-scoped stable number — safe to display from an Invoice long after creation. No new numbering needed.

## H. Sample Resolution Strategy

Primary: parse marker in `invoice.notes` with the shared regex → `{ sourceType, sourceId }` → `select id, daily_number, physical_sample_id, lab_horse_id, horse_id from lab_samples where id = sourceId and tenant_id = invoice.tenant_id`.

Fallback (legacy invoices only): keep the existing `entity_type='lab_sample'` path already in `fetchInvoiceDetails` untouched.

Degradation: on any resolver error / missing row → `invoiceContext.sampleLabel = undefined` (row silently hidden). Never render the UUID.

## I. Horse Resolution Strategy

For Lab-origin header horse: prefer resolved sample's `lab_horse_id` → `lab_horses.name/name_ar`, else `horse_id` → `horses.name/name_ar`. Existing per-line horse chips (from `resolvedHorseName`) still suppress the header horse via the existing `!items.some(...resolvedHorseName)` guard — no duplicate display.

## J. Laboratory-Origin Discriminator

`LAB_SOURCE_MARKER_RE.test(invoice.notes ?? "")`. Source-trace based, not description text, not account-type. If false → sheet behaves exactly as today (no sanitation, no extra sample lookup).

## K. Stable and Manual Invoice Preservation

Because the discriminator is marker presence, invoices without the marker take zero new code paths. Notes card renders verbatim, no sample lookup, no header horse override, no per-line changes. `InvoicePDFGenerator`, list view, edit dialog, approve/cancel/delete, ledger, dedupe — all untouched.

## L. Bilingual and UI Contract

All labels already exist: `finance.invoices.client`, `finance.invoices.issueDate`, `finance.invoices.horse`, `finance.invoices.sample`. Latin digits via existing `#${daily_number}` template and `dir="ltr"` on the value. IBM Plex / card layout unchanged.

## M. Exact Files Proposed for Modification

1. `src/lib/finance/labInvoiceMarker.ts` — NEW tiny helper (regex + `parseLabSourceMarker` + `stripLabSourceMarker`). Single source of truth reused by hook and sheet.
2. `src/hooks/laboratory/useLabInvoiceDraft.ts` — swap local `LAB_SOURCE_MARKER_RE` / `buildLabSourceMarker` to re-export from the helper (no behavior change; keeps existing tests green).
3. `src/components/finance/InvoiceDetailsSheet.tsx` — two localized edits (notes sanitation + marker-based sample resolution).
4. `src/lib/finance/__tests__/labInvoiceMarker.test.ts` — NEW unit tests.

No other files touched. No PDF / list / form / edge function / migration.

## N. Execution-Ready Implementation Plan

### N.1 `src/lib/finance/labInvoiceMarker.ts` (new, ~30 lines)

```ts
export const LAB_SOURCE_MARKER_RE =
  /\[LAB:(lab_sample|lab_request):([0-9a-fA-F-]{36})\]/;

export type LabSourceType = "lab_sample" | "lab_request";

export function parseLabSourceMarker(
  notes: string | null | undefined,
): { sourceType: LabSourceType; sourceId: string } | null {
  if (!notes) return null;
  const m = notes.match(LAB_SOURCE_MARKER_RE);
  return m ? { sourceType: m[1] as LabSourceType, sourceId: m[2] } : null;
}

/** Removes the exact recognized marker plus at most one adjacent newline
 * on each side. Trims trailing whitespace only. Never touches other text. */
export function stripLabSourceMarker(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(new RegExp(`\\n?${LAB_SOURCE_MARKER_RE.source}\\n?`), "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildLabSourceMarker(
  sourceType: LabSourceType,
  sourceId: string,
): string {
  return `[LAB:${sourceType}:${sourceId}]`;
}
```

### N.2 `src/hooks/laboratory/useLabInvoiceDraft.ts`

- Replace the local `LAB_SOURCE_MARKER_RE` / `buildLabSourceMarker` definitions with imports from `@/lib/finance/labInvoiceMarker`. `composeNotesWithMarker`, `checkExistingInvoice`, and the `__internal` export continue to work unchanged. Existing `useLabInvoiceDraftRpcCutover.test.ts` assertions (`buildLabSourceMarker`, `[LAB:`, `.ilike("notes"`) still pass because the strings and behavior are identical.

### N.3 `src/components/finance/InvoiceDetailsSheet.tsx`

**Edit 1 — Notes card (lines 700–709):**

```tsx
{(() => {
  const visibleNotes = stripLabSourceMarker(invoice.notes);
  return visibleNotes ? (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {visibleNotes}
        </p>
      </CardContent>
    </Card>
  ) : null;
})()}
```

Add import: `import { parseLabSourceMarker, stripLabSourceMarker } from "@/lib/finance/labInvoiceMarker";`

**Edit 2 — Sample resolution (lines 292–335):**

Wrap the existing sample-lookup block so it ALSO runs when the marker is present. New logic (drop-in inside `fetchInvoiceDetails`, replacing the current `try { if (labSampleIds.length > 0) ... }` block):

```ts
try {
  const marker = parseLabSourceMarker((invoiceData as any).notes);
  const sampleId =
    (marker?.sourceType === "lab_sample" && marker.sourceId) ||
    labSampleIds[0] /* legacy entity_type path */ ||
    null;

  if (sampleId) {
    const { data: s } = await supabase
      .from("lab_samples")
      .select("id, daily_number, physical_sample_id, lab_horse_id, horse_id")
      .eq("id", sampleId)
      .eq("tenant_id", (invoiceData as any).tenant_id)
      .maybeSingle();

    if (s) {
      const sLabel = (s as any).daily_number
        ? `#${(s as any).daily_number}`
        : ((s as any).physical_sample_id?.slice(0, 12) || null);

      let hName: string | null = null;
      if ((s as any).lab_horse_id) {
        const { data: h } = await supabase
          .from("lab_horses")
          .select("name, name_ar")
          .eq("id", (s as any).lab_horse_id).maybeSingle();
        if (h) hName = dir === "rtl" ? ((h as any).name_ar || (h as any).name) : ((h as any).name || (h as any).name_ar);
      } else if ((s as any).horse_id) {
        const { data: h } = await supabase
          .from("horses")
          .select("name, name_ar")
          .eq("id", (s as any).horse_id).maybeSingle();
        if (h) hName = dir === "rtl" ? ((h as any).name_ar || (h as any).name) : ((h as any).name || (h as any).name_ar);
      }
      setInvoiceContext({ horseName: hName || undefined, sampleLabel: sLabel || undefined });
    } else if (Object.keys(stableEntityMap).length > 0) {
      const firstEnriched = stableEntityMap[Object.keys(stableEntityMap)[0]];
      setInvoiceContext({ horseName: firstEnriched || undefined });
    } else {
      setInvoiceContext(null);
    }
  } else if (Object.keys(stableEntityMap).length > 0) {
    const firstEnriched = stableEntityMap[Object.keys(stableEntityMap)[0]];
    setInvoiceContext({ horseName: firstEnriched || undefined });
  } else {
    setInvoiceContext(null);
  }
} catch {
  setInvoiceContext(null);
}
```

Behavior: for non-Lab invoices `marker` is null and `labSampleIds` empty → falls through to today's stable/none branches unchanged.

### N.4 Data/query impact

+1 lightweight `lab_samples` select (`.maybeSingle()`, tenant-scoped, indexed PK) and at most +1 horse select per Lab invoice open. No new writes, no schema, no RLS/grants.

### N.5 Translation impact

None — reuses `finance.invoices.{client,issueDate,horse,sample}`.

### N.6 Rollback

Revert the three touched files. Marker storage and dedupe are unaffected because `useLabInvoiceDraft` behavior is byte-equivalent.

## O. Narrow Test Plan

New file `src/lib/finance/__tests__/labInvoiceMarker.test.ts`:

1. `parseLabSourceMarker` returns `{lab_sample, uuid}` for `"note\n[LAB:lab_sample:<uuid>]"`.
2. Returns `null` for `null`, `""`, plain text, and malformed brackets like `"[LAB:foo]"` / `"[LAB:lab_sample:not-a-uuid]"`.
3. `stripLabSourceMarker` marker-only note → `""`.
4. Genuine note + marker → returns genuine note only.
5. Unrelated bracket text (`"[URGENT] check horse"`) preserved verbatim.
6. Marker never present in the returned string; UUID never returned.
7. Multiline note above marker retains internal newlines.

Update `useLabInvoiceDraftRpcCutover.test.ts`: no change (contract stable). Re-run to confirm.

Manual `tsgo` + `bun run build` + `bunx vitest run` for the two test files.

## P. Manual Acceptance Plan

Exactly the 15 steps in §16 of the prompt. Run against `INV-9921` and one manual + one Stable invoice.

## Q. Risks and Rollback

- Risk: marker regex over-strip — mitigated by anchoring to full `LAB_SOURCE_MARKER_RE` and unit tests 5 & 7.
- Risk: extra select on non-Lab invoices — guarded by `if (sampleId)`, so it only fires when marker parses or legacy `entity_type='lab_sample'` items exist.
- Risk: cache/permissions — reads use existing RLS on `lab_samples`/`lab_horses`/`horses`; failure returns `null` and degrades silently.
- Rollback: `git revert` on the three files (no DB state to undo).

## R. Database Changes Required

`None`

## S. Files Created

`None` (this turn is plan-only).

## T. Files Modified

`None` (this turn is plan-only).

## U. Production Objects Modified

`None`

## V. Persistent Rows Modified

`None`

## W. Roadmap

1. Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
2. Phase 2 — N+1B: FUNCTIONALLY CLOSED. LABORATORY INVOICE DISPLAY ALIGNMENT IN THIS TURN. DEEP HARDENING DEFERRED.
3. Phase 3 — N+2: CONTRACT ALIGNED. SLICE 1 NEXT AFTER THIS DISPLAY PLAN IS APPROVED AND EXECUTED.
4. Phase 4 — N+3: NOT STARTED.
5. Phase 5 — N+4: NOT STARTED.

## X. Next Exact Action

`AWAIT USER APPROVAL OF THE PLAN BELOW.`

---

## APPROVAL HANDOFF — SEND THIS EXACT MESSAGE

`APPROVED — EXECUTE EXACTLY THE LABORATORY INVOICE DISPLAY PLAN ABOVE. DO NOT EXPAND SCOPE. PRESERVE THE INTERNAL SOURCE MARKER, DUPLICATE-INVOICE PROTECTION, AND ALL STABLE/MANUAL INVOICE PRESENTATION. RUN THE SPECIFIED NARROW TESTS, TYPESCRIPT CHECK, AND PRODUCTION BUILD. STOP AFTER THE IMPLEMENTATION REPORT AND USER MANUAL-ACCEPTANCE SCRIPT.`
