
## Phase 7: "Receive & Number Now" Choice + Phase 8: Auto Lab Horse for Request-Origin Samples

### Overview

**Phase 7** adds a "Receive & Number Now" vs "Defer" choice to the lab wizard's Details step. When "Receive Now" is chosen, the sample is created with `status='accessioned'` (triggering daily number assignment). When deferred, `status='draft'` and `numbering_deferred=true`.

**Phase 8** eliminates "Unknown Horse" for request-origin samples by auto-creating (or reusing) a `lab_horses` record from request snapshots and linking it via `lab_horse_id`.

---

### Phase 7: Numbering Now == Receive Now

#### 7.1 DB: No migration needed
The `numbering_deferred` column already exists on `lab_samples` (confirmed in types.ts). The trigger `set_daily_sample_number` already respects it.

#### 7.2 Frontend: CreateSampleDialog.tsx

**Add to FormData interface:**
```typescript
receive_now: boolean; // true = accessioned + number, false = draft + deferred
```

**Modify LAB_STEPS:** No new step needed. The existing `details` step (for lab tenants) already contains daily number inputs. We add a radio choice at the top of the details step content (lab tenant path only):
- "Receive & Number Now" -- shows daily number inputs, sets `receive_now=true`
- "Save as Draft (Number Later)" -- hides daily number inputs, sets `receive_now=false`

**Default value:** `receive_now: true` (most common lab workflow)
- Exception: when `fromRequest` is present, default to `receive_now: false` (request samples typically need physical receipt first)

**Submission logic changes in `createSamplesForAllHorses()`:**
- If `receive_now === true`: set `status: 'accessioned'`, `numbering_deferred: false`
- If `receive_now === false`: set `status: 'draft'`, `numbering_deferred: true`, skip daily_number unless manually entered

#### 7.3 useLabSamples.ts: CreateLabSampleData

Add `numbering_deferred?: boolean` to the interface (it's already in the DB types but not in the create data interface).

#### 7.4 i18n additions

English keys under `laboratory.createSample`:
- `receiveNow`: "Receive & Number Now"
- `receiveNowDesc`: "Sample is physically received. A daily number will be assigned."
- `deferNumbering`: "Save as Draft"  
- `deferNumberingDesc`: "Number will be assigned when sample is received later."
- `steps.details` remains "Details"

Arabic equivalents:
- `receiveNow`: "استلام وترقيم الآن"
- `receiveNowDesc`: "العينة مستلمة فعلياً. سيتم تعيين رقم يومي."
- `deferNumbering`: "حفظ كمسودة"
- `deferNumberingDesc`: "سيتم تعيين الرقم عند استلام العينة لاحقاً."

---

### Phase 8: Auto Lab Horse for Request-Origin Samples

#### 8.1 useLabHorses.ts: Expand CreateLabHorseData

Add optional fields to `CreateLabHorseData`:
```typescript
linked_horse_id?: string;
source?: 'manual' | 'platform' | 'request';
```

Note: The DB column `source` currently accepts `'manual' | 'platform'`. We need a migration to expand the check constraint (or use `'platform'` as the value for request-created horses if a constraint exists).

#### 8.2 DB: Check if source constraint exists

If there's a CHECK constraint on `lab_horses.source`, we need a migration to add `'request'` as a valid value. If no constraint (just text column), no migration needed.

Based on the types.ts showing `source: 'manual' | 'platform'`, this appears to be a TS-level type but likely also a DB constraint. A small migration will be needed:

```sql
ALTER TABLE public.lab_horses 
  DROP CONSTRAINT IF EXISTS lab_horses_source_check;
ALTER TABLE public.lab_horses 
  ADD CONSTRAINT lab_horses_source_check 
  CHECK (source IN ('manual', 'platform', 'request'));
```

#### 8.3 CreateSampleDialog.tsx: `ensureLabHorseForRequest()`

New async helper function called at submit time when `fromRequest` is present:

```
async function ensureLabHorseForRequest():
  1. Query lab_horses WHERE linked_horse_id = fromRequest.horse_id 
     AND tenant_id = current tenant AND is_archived = false
  2. If found: return existing lab_horse.id
  3. If not found: INSERT into lab_horses with:
     - name: fromRequest.horse_name_snapshot
     - name_ar: fromRequest.horse_name_ar_snapshot  
     - breed_text: horse_snapshot?.breed
     - color_text: horse_snapshot?.color
     - linked_horse_id: fromRequest.horse_id
     - source: 'request'
     - owner_name: fromRequest.initiator_tenant_name_snapshot
  4. Return new lab_horse.id
```

#### 8.4 Submission flow change

In `createSamplesForAllHorses()`, when `fromRequest` is present:
- Before creating samples, call `ensureLabHorseForRequest()` 
- Set `lab_horse_id` on each created sample instead of relying on `horse_name` alone
- Keep `horse_name` as fallback display field

#### 8.5 Horse step prefill for fromRequest

When `fromRequest` is set, the initial `selectedHorses` array currently uses `horse_type: 'walk_in'`. Change to:
- Still prefill with snapshot name
- At submit, override with the ensured `lab_horse_id`
- The horse step remains functional (user can change selection)

#### 8.6 Client behavior (MVP)

Keep current approach: `walkInClient.client_name = fromRequest.initiator_tenant_name_snapshot`. No auto-creation of clients table entries.

---

### Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `src/components/laboratory/CreateSampleDialog.tsx` | 7, 8 | Add receive_now radio, ensureLabHorseForRequest(), submission logic |
| `src/hooks/laboratory/useLabSamples.ts` | 7 | Add `numbering_deferred` to CreateLabSampleData |
| `src/hooks/laboratory/useLabHorses.ts` | 8 | Add `linked_horse_id` and `source` to CreateLabHorseData, LabHorse source type |
| `src/i18n/locales/en.ts` | 7 | Add receiveNow/deferNumbering keys |
| `src/i18n/locales/ar.ts` | 7 | Add Arabic equivalents |
| New SQL migration | 8 | Expand source constraint on lab_horses (if needed) |

### Verification Checklist

- Walk-in sample with "Receive Now": created as accessioned, daily_number assigned
- Walk-in sample with "Defer": created as draft, no daily_number, numbering_deferred=true
- Request-origin sample with "Defer": draft, no number, lab_horse auto-created
- Request-origin sample appears in Samples list with horse name (not unknown)
- Same horse from second request reuses existing lab_horse (no duplicates)
- Manual daily_number entry still respected in both paths
- Multi-horse creation works with both paths
