
# Final Mini Investigative Alignment Audit — Collision-Safe Entity Keys, Normalized Customer Dedup, Truly Non-Blocking Client Enrichment, Type-Safe Horse Identity

Read-only audit. Zero files, translations, DB objects, or records modified.

## A. Executive Verdict

**READY FOR NARROW EXECUTION PROMPT.**

All four remaining contradictions have a code-verified, three-file-scoped correction that does not require any backend, schema, translation-key-count expansion beyond the two already agreed, or query-budget increase.

## B. Documentation and Skills Applied

- Doc 10 (Financial Architecture Maturation) — invoice/statement freeze scope and money-truth invariants.
- Doc 12 (Backend Permission Enforcement) — confirms Invoice Details already uses `hasPermission` gates; no permission surface change.
- Doc 13 (Operational Truth Stabilization) — reinforces snapshot-as-truth (`invoices.client_name`, `invoice_items.*_snapshot`).
- Skill 04 (Tenant Isolation) — client lookup must be `tenant_id`-scoped.
- Skill 06 (API/RPC Hardening) — no new RPC/round-trips; PostgREST embed reuse only.
- Skill 07 (TS/React Review) — discriminated-union recommendation for `ResolvedHorse`; no `any` for header keys.
- Skill 10/11/12 (UX / Content Truth / Bilingual) — snapshot preservation, no fabrication, RTL/LTR ordering.
- Skill 16 (Customer Identity) — historical snapshot governs; master is supplement-only.
- Skill 19 (Money Truth) — consulted only to confirm the freeze boundary; totals unchanged.
- Skill 23 (Perf/Reliability) — non-blocking enrichment separation of render-critical vs optional queries.
- Skill 24 (Mobile/Responsive) — 375/768/1280 acceptance retained.
- Skill 25 (QA Readiness) — typecheck + one existing test are necessary but not sufficient; visual + scenario acceptance required.
- Skill 26 (Skill Network Governance) — Skill 01 not treated as ceremonial approval.
- Skills 03, 05, 08 consulted; no new tables/policies/workflows, so they only bound the "no schema change" guarantee.

## C. Current Invoice Details Loading and Enrichment Trace

File: `src/components/finance/InvoiceDetailsSheet.tsx` (1048 lines).

- Local state: `invoice`, `items`, `loading`, `invoiceContext`.
- Effect (L114–122): on `open && invoiceId` calls `fetchInvoiceDetails`; on close resets state.
- `fetchInvoiceDetails` (L124+) is a **single serial async** that:
  1. `invoices` fetch → `setInvoice`.
  2. `invoice_items` fetch.
  3. Optional `lab_samples` batch.
  4. Four **sequential** entity enrichment queries in a `for … of Object.entries(stableTypes)` loop (vet_treatment, vaccination, breeding_attempt, foaling).
  5. `horses` batch and `lab_horses` batch.
  6. Builds enriched items → `setItems`.
  7. Secondary context resolution → `setInvoiceContext`.
  8. `finally { setLoading(false) }` — so every one of the above serially gates the render skeleton.
- Render commit: primary state (invoice header, totals, items) is not visible until `loading === false`.
- Customer render today: L686 → `invoice.client_name || t('finance.invoices.noClient')`. No `clients` fetch exists.

## D. Canonical Entity Types and Current Map-Key Evidence

Canonical literals actually stored/compared in `invoice_items.entity_type` (verified from L150, L171–174, L179, L262, L268):

- `lab_sample`
- `vet_treatment`
- `vaccination`
- `breeding_attempt`
- `foaling`

All **singular**. No plural aliases handled or emitted. `stableTypes` keys L171–174 are the source-of-truth for the four "stable-origin" enrichment types.

Current map (L169): `stableEntityMap: Record<string, string>` — keyed by **bare `entity_id`**. Lookup at L268 (`stableEntityMap[item.entity_id]`) is also keyed by bare `entity_id`. This is the collision surface: a UUID equal across `vet_treatments.id` and `foalings.id` (astronomically rare but not schema-forbidden) will silently overwrite/mis-attribute.

Also: L316 uses `stableEntityMap[stableEntityIds[0]]` — which is a joined display string ("`title — horseName`"), then `setInvoiceContext({ horseName: firstEnriched })`. That is not a horse name; it is a description. This is the same defect class the prior audit already flagged for removal.

## E. Collision-Safe Composite Entity-Key Contract

Corrected pseudocode (drop-in replacement for the current `stableEntityMap`, still one map, still zero extra queries):

```ts
type EntityType = 'vet_treatment' | 'vaccination' | 'breeding_attempt' | 'foaling';
const ENTITY_TYPES: readonly EntityType[] = ['vet_treatment','vaccination','breeding_attempt','foaling'];

type EntityRecord = {
  itemTitle: string | null;                  // was the joined display string
  horse: { id: string; name: string | null; name_ar: string | null } | null;
};

// Composite key: `${canonicalEntityType}:${entityId}`
const entityMap = new Map<string, EntityRecord>();
const keyOf = (t: EntityType, id: string) => `${t}:${id}`;

// Enrichment adds `horse.id` / `mare.id` to existing embeds (same 4 queries, no new round-trip).
// Insertion:
entityMap.set(keyOf('vet_treatment', d.id), {
  itemTitle: d.title ?? null,
  horse: d.horse ? { id: d.horse.id, name: d.horse.name, name_ar: d.horse.name_ar } : null,
});
// (breeding_attempt / foaling use `mare` embed and store it under `horse`.)

// Lookup (per item):
const et = ENTITY_TYPES.includes(item.entity_type as EntityType) ? item.entity_type as EntityType : null;
const rec = et && item.entity_id ? entityMap.get(keyOf(et, item.entity_id)) ?? null : null;
```

Guarantees:
- `vet_treatment:X` and `foaling:X` occupy distinct keys — cross-table UUID collisions cannot overwrite each other, cannot mis-attribute another line's horse.
- Insert-site and lookup-site both go through `keyOf` — one canonical normalization path.
- Unknown/legacy `entity_type` values fall through to `null` (never accidentally hit another type's data).
- Direct `item.horse_id` / `item.lab_horse_id` still take absolute precedence in `resolvedHorse` construction; `entityMap` only supplies fallback identity/title.
- No entity type invented; no per-line query; still exactly the four existing enrichment queries.
- Any `horses.id` produced by these embeds is unioned into the single `platform-horses` batch request set before the batch fires — still ≤1 platform-horse query.

## F. Corrected Historical Customer Snapshot Algorithm

```ts
const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const snapshot = (invoice.client_name ?? '').trim() || null;

// Rendering — computed lazily; does NOT gate primary render.
function renderCustomer(
  client: { name: string | null; name_ar: string | null } | null | undefined,
  clientLoaded: boolean, // true only after optional lookup settles successfully
): string {
  if (!snapshot) return t('finance.invoices.noClient');
  if (!invoice.client_id || !clientLoaded || !client) return snapshot;

  const cEn = client.name?.trim()    || null;
  const cAr = client.name_ar?.trim() || null;
  const sN  = norm(snapshot);
  const matchEn = !!cEn && norm(cEn) === sN;
  const matchAr = !!cAr && norm(cAr) === sN;

  // Case 6: matches neither → renamed/unrelated → snapshot only.
  if (!matchEn && !matchAr) return snapshot;

  // Case 5: matches BOTH sides (after normalization) → snapshot once, no bilingual pair.
  if (matchEn && matchAr) return snapshot;

  if (matchEn) {
    // Add AR supplement only if genuinely distinct from the normalized snapshot.
    if (cAr && norm(cAr) !== sN) {
      return displayClientName(snapshot, cAr); // snapshot verbatim on EN side
    }
    return snapshot;
  }
  // matchAr
  if (cEn && norm(cEn) !== sN) {
    return displayClientName(cEn, snapshot);   // snapshot verbatim on AR side
  }
  return snapshot;
}
```

Guarantees:
- Master value is never rendered on the side the snapshot already matched.
- Internal whitespace, punctuation, casing, spelling of the snapshot are preserved after outer trim only.
- Empty-parens and duplicate normalized names cannot appear.
- `displayHelpers.ts` is not modified; existing `displayClientName(en, ar)` used with snapshot pre-placed on the matched side.

## G. Customer Scenario Matrix

Ordering: AR UI puts AR outer, EN parenthetical; EN UI reverses.

| # | Snapshot | Cur EN | Cur AR | AR UI | EN UI |
|---|---|---|---|---|---|
| 1 EN match | `Nawaf Al-Otaibi` | `Nawaf Al-Otaibi` | `نواف العتيبي` | `نواف العتيبي (Nawaf Al-Otaibi)` | `Nawaf Al-Otaibi (نواف العتيبي)` |
| 2 AR match | `نواف العتيبي` | `Nawaf Al-Otaibi` | `نواف العتيبي` | `نواف العتيبي (Nawaf Al-Otaibi)` | `Nawaf Al-Otaibi (نواف العتيبي)` |
| 3 renamed | `Nawaf Al-Otaibi` | `Nawaf Al-Fadel` | `نواف الفاضل` | `Nawaf Al-Otaibi` | `Nawaf Al-Otaibi` |
| 4 internal 2-space snapshot | `Nawaf  Al-Otaibi` | `Nawaf Al-Otaibi` | `نواف العتيبي` | `نواف العتيبي (Nawaf  Al-Otaibi)` | `Nawaf  Al-Otaibi (نواف العتيبي)` |
| 5 both sides normalize to snapshot | `ACME LLC` | `ACME LLC` | `ACME  LLC` | `ACME LLC` | `ACME LLC` |
| 6 no client_id | `Legacy Buyer LLC` | — | — | `Legacy Buyer LLC` | `Legacy Buyer LLC` |
| 7 query fails / RLS-hidden / null row | any snapshot | — | — | snapshot | snapshot |
| 8 missing snapshot, client_id present | `null` | `X` | `س` | `t('finance.invoices.noClient')` | `t('finance.invoices.noClient')` |
| 9 EN matches, AR missing on master | `Nawaf Al-Otaibi` | `Nawaf Al-Otaibi` | `null` | `Nawaf Al-Otaibi` | `Nawaf Al-Otaibi` |
| 10 EN==AR on master | `ACME` | `ACME` | `ACME` | `ACME` | `ACME` |

## H. Truly Non-Blocking Client-Enrichment Architecture

Verified: current `fetchInvoiceDetails` serially awaits everything before `setLoading(false)`. Adding the optional `clients` query inside that function (even under `Promise.allSettled`) inherits the same latency gate. Fix contract:

1. `invoice.client_name` renders immediately from `invoice` state — no dependency on any `clients` lookup.
2. Add a **separate `useEffect`** keyed on `[invoice?.id, invoice?.tenant_id, invoice?.client_id]` that runs after `invoice` is committed and issues **one** `clients` query. This effect must NOT touch `loading`.
3. New local state: `clientEnrichment: { forInvoiceId: string; client: { name, name_ar } | null } | null` (nullable, defaulted to `null` on every invoice change).
4. Effect body:
   ```ts
   if (!invoice?.client_id) { setClientEnrichment(null); return; }
   let cancelled = false;
   const activeInvoiceId = invoice.id;
   const activeTenantId = invoice.tenant_id;
   const activeClientId = invoice.client_id;
   supabase.from('clients')
     .select('name, name_ar')
     .eq('tenant_id', activeTenantId)
     .eq('id', activeClientId)
     .maybeSingle()
     .then(({ data, error }) => {
       if (cancelled) return;
       if (error || !data) { /* silent */ return; }
       // Guard against stale invoice: only commit if the currently-mounted invoice still matches.
       setClientEnrichment(prev => ({ forInvoiceId: activeInvoiceId, client: data }));
     })
     .catch(() => { /* silent — no toast, no error state */ });
   return () => { cancelled = true; };
   ```
5. Render:
   ```ts
   const client = clientEnrichment?.forInvoiceId === invoice?.id ? clientEnrichment.client : null;
   const clientLoaded = !!client;
   const customerText = renderCustomer(client, clientLoaded);
   ```
6. No toast, no `throw`, no `setLoading`, no invoice-level error propagation from this effect. Latency of the `clients` query never delays invoice open, items, totals, or horse chips.
7. No new hook, no new file. Effect lives inside `InvoiceDetailsSheet.tsx`.

## I. Async Race, Cleanup, Stale-Result Contract

Guards:
- **Cleanup flag** (`cancelled`) drops any late-arriving result of a superseded effect run.
- **Identity binding**: commit is gated by `activeInvoiceId === invoice.id` at render time via `clientEnrichment.forInvoiceId`. If the user switches A→B and A's fetch resolves last, `A.forInvoiceId !== B.id` so it will not display.
- **Tenant binding**: tenant switch triggers unmount / route change; the sheet effect either re-runs (new invoice) or is torn down. The `tenant_id` embedded in the query prevents cross-tenant reads even under RLS bypass hypotheticals.
- **Reset**: on `!open || invoiceId change`, existing L114–122 effect already clears `invoice`/`items`/`invoiceContext`; add `setClientEnrichment(null)` to that same reset.
- **Locale toggle**: enrichment effect does NOT depend on `dir`/locale — no re-query on locale switch. `renderCustomer` reads `dir` at render time and reorders bilingual pair without re-fetching.
- **Reopen same invoice**: same `invoiceId` → same effect dependency → one query per open (acceptable; still ≤1 per applicable invoice open).

## J. Latency and Failure Matrix

| Scenario | Primary render | Customer display |
|---|---|---|
| Fast client success | immediate | briefly snapshot → upgraded to bilingual on resolve |
| Slow client success (2s) | immediate | snapshot for 2s → upgraded to bilingual |
| Client query rejection | immediate | snapshot; no toast; no error UI |
| RLS-hidden / null row | immediate | snapshot |
| Rapid A → B switch, A resolves late | B renders immediately | A's client never displays on B (id guard) |
| Close before resolve | n/a | discarded (cancelled flag) |
| Reopen same invoice | immediate | one fresh lookup |
| Locale toggle mid-flight | unchanged | no re-fetch; on resolve, ordering follows current `dir` |
| Reopen different invoice, prior enrichment cached | immediate | prior enrichment ignored (forInvoiceId mismatch) until new resolves |

## K. Type-Safe `ResolvedHorse` and `headerKey` Contract

Discriminated union (recommended):

```ts
type PlatformResolvedHorse = {
  identitySource: 'platform';
  identityId: string;                        // guaranteed non-null
  resolutionSource: 'direct' | 'entity';
  entityType?: EntityType;
  entityId?: string;
  name: string | null;
  name_ar: string | null;
};
type LabResolvedHorse = {
  identitySource: 'lab';
  identityId: string;                        // guaranteed non-null
  resolutionSource: 'direct';                // lab horses only via item.lab_horse_id today
  name: string | null;
  name_ar: string | null;
};
type EnrichedResolvedHorse = {
  identitySource: 'enrich';
  identityId: null;
  resolutionSource: 'entity';
  entityType: EntityType;                    // required
  entityId: string;                          // required
  name: string | null;
  name_ar: string | null;
};
type ResolvedHorse = PlatformResolvedHorse | LabResolvedHorse | EnrichedResolvedHorse;

function headerKey(h: ResolvedHorse): string {
  switch (h.identitySource) {
    case 'platform': return `platform:${h.identityId}`;
    case 'lab':      return `lab:${h.identityId}`;
    case 'enrich':   return `enrich:${h.entityType}:${h.entityId}`;
  }
}
```

Call-site narrowing:

```ts
const distinct = new Map<string, ResolvedHorse>();
for (const it of items) {
  const h = it.resolvedHorse;              // ResolvedHorse | null
  if (!h) continue;                        // <-- TS narrows to non-null in the body
  const k = headerKey(h);
  if (!distinct.has(k)) distinct.set(k, h);
}
```

Runtime guards (data trust):
- When building `PlatformResolvedHorse` from `horseNameMap`, only construct it if `identityId` is truthy string.
- When building `EnrichedResolvedHorse`, require `entityType && entityId` both truthy.
- No `any`, no unsafe cast to hide null; typechecker enforces `platform:null` / `enrich:undefined:undefined` cannot be emitted.

## L. Corrected Consolidated Narrow Execution Blueprint (plan only)

Files (exactly three): `src/components/finance/InvoiceDetailsSheet.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts`.

1. **Enrichment embed extension**: add `id` to the existing `horse:` / `mare:` embeds on all four enrichment queries (`vet_treatments`, `horse_vaccinations`, `breeding_attempts`, `foalings`). Same 4 queries, no new round-trip.
2. **Collision-safe entity map**: replace `stableEntityMap: Record<string,string>` with `entityMap: Map<string, EntityRecord>` keyed by ``${entityType}:${entityId}``, storing structured `{ itemTitle, horse: {id, name, name_ar} | null }`. Insertion and lookup both go through `keyOf`.
3. **Union entity-surfaced platform IDs**: before firing the `horses` batch, union any `horse.id` / `mare.id` produced by enrichment into `platformHorseIds`. Still one `horses` query.
4. **Per-line `resolvedHorse` (discriminated union §K)**: precedence direct `horse_id` → direct `lab_horse_id` → entity horse with real ID (`platform`) → identity-less enrichment (`enrich`). Never overwrite direct with entity. Never invent `identityId`. Never parse display strings.
5. **Enriched description rebuild** from structured `entityMap` values (title + bilingual horse), not from the previous joined string.
6. **Remove secondary context misuse** at current L282–325: delete the `invoiceContext.horseName = firstEnriched` path. `invoiceContext` is either removed or narrowed to `sampleLabel`-only.
7. **Header Horse/Horses card**: iterate items → dedup via `headerKey` (§K); render bilingual via existing `displayHorseName`; label `finance.invoices.horse` (singular) / `finance.invoices.horses` (plural); text always visible; decorative glyph `aria-hidden`. Remove the current L719 `!items.some(...)` suppression.
8. **Independent horse-name warning row**: capture platform/lab query errors and per-namespace unresolved-ID sets; render as sibling row after Due Date, before Horse card; key `finance.invoices.horseNamesUnavailable`; EN `Some horse names could not be loaded.` / AR `تعذر تحميل بعض أسماء الخيل.`; no toast; independent of card rendering.
9. **Truly non-blocking client enrichment (§H)**: new local state `clientEnrichment`, dedicated `useEffect` keyed on `[invoice?.id, invoice?.tenant_id, invoice?.client_id]`, cancellable, silent-on-failure, forInvoiceId-guarded. Reset alongside existing state resets.
10. **Customer render (§F)**: replace L686's `invoice.client_name || t(...)` with `renderCustomer(client, clientLoaded)`.
11. **Item/Service chip dedup** unchanged: `normalize(s) = s.trim().replace(/\s+/g,' ')`; equal ⇒ hide Service chip; unequal ⇒ keep both; packages excluded; category snapshots retained.
12. **i18n additions**: `finance.invoices.horses` (EN `Horses` / AR `الخيل`), `finance.invoices.horseNamesUnavailable` (copy above). All other keys reused.
13. **No changes** to: `useInvoiceCustomerHorses.ts`, `HorseLinePicker.tsx`, `InvoiceFormDialog.tsx`, `InvoiceLineItemsEditor.tsx`, `displayHelpers.ts`, `ClientStatementTab.tsx`, statement exports, PDF/print, RPCs, ledger, billing_links, invoice numbering, payment intents, tax, discount, currency, totals, package pricing, `supabase/**`.

## M. Exact Future File Scope

Three files, zero others. `displayHelpers.ts` is NOT modified — the algorithm supplies the snapshot on the matched side and calls existing `displayClientName(en, ar)`. `useInvoiceCustomerHorses.ts` is a create-invoice concern and is unaffected. Scope expansion is not required by any evidence.

## N. Query Count and Critical-Path Classification

Per invoice open:

| Query | Max | Critical path? |
|---|---|---|
| `invoices` | 1 | yes |
| `invoice_items` | 1 | yes |
| `lab_samples` (existing) | ≤1 | yes |
| Entity enrichment (vet_treatment/vaccination/breeding_attempt/foaling) | ≤4 | yes |
| `horses` batch | ≤1 | yes |
| `lab_horses` batch | ≤1 | yes |
| `clients` (optional) | ≤1 | **no** — non-blocking, own effect |
| Header-specific horse query | 0 | — |
| Per-line query | 0 | — |
| All-tenant fallback | 0 | — |

No N+1 possible: horse lookups are single batched `.in('id', ids)` calls.

## O. Acceptance and Verification Plan

Horse identity: INV-0982, 3× same direct platform horse, 3× same direct lab horse, Maha+Faten, direct+entity same platform horse, two different entities same platform horse, two different entity tables with equal simulated UUIDs, two enrich-fallback rows with equal IDs different types, one enrich row on multiple lines, vet_treatment invoice, vaccination invoice, breeding_attempt invoice, foaling/mare-only, horse-free invoice, simulated platform batch failure, simulated lab batch failure, partial resolution.

Customer: EN match, AR match, renamed, whitespace-only master diff, internal double-space snapshot preservation, both-sides normalize to snapshot, missing opposite language, no client_id, missing snapshot, RLS-hidden, query rejection, null row.

Non-blocking / race: slow client + fast invoice (invoice visible first), rapid A→B (A's late result suppressed), close before resolve, reopen same invoice, reopen different invoice, locale toggle mid-flight (no re-fetch), locale toggle after enrichment (order flips), no duplicate query on rerender.

Responsive/bilingual: 375 / 768 / 1280 px; AR/RTL + EN/LTR; ≥5 distinct horses at 375px.

Technical (necessary, not sufficient):
```
bunx tsgo --noEmit
bunx vitest run src/lib/finance/__tests__/n2_5InvoiceRpcRuntimeWiring.test.ts
```
Plus visual acceptance of the scenarios above. Financial totals byte-identical pre/post.

## P. Residual Unknowns

- Whether any tenant has vet/vaccination rows where the embedded `horses` row is RLS-hidden while the parent event is visible — under the contract this degrades safely to `enrich` fallback.
- Runtime behavior of the client-enrichment effect against a real renamed-customer invoice not exercised in read-only mode.
- Header rendering with ≥5 distinct horses at 375 px not visually verified in-audit.
- Breeding-attempt stallion inclusion in Header remains deliberately out of scope; future product decision.

## Q. Final Readiness Rationale

The four contradictions each map to a concrete, code-visible defect with a correction that is (i) internally consistent with the previously frozen contracts, (ii) implementable strictly within the three-file scope, (iii) query-budget neutral, (iv) TypeScript-provable, (v) financially inert. The remaining unknowns are runtime-verification items appropriate for the acceptance phase, not design gaps. **READY FOR NARROW EXECUTION PROMPT.**
