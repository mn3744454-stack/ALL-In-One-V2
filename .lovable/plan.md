# AML.1.b.1 — Stage 3 Numeric-Precision Closure & Stage 4 Permission Foundation

## A. Executive Decision

**READY FOR ONE BOUNDED EXECUTION.**

The Stage 3 post-execution investigation is complete. No further investigative audit is required.

Stage 3 is mechanically correct except for one confirmed catalog deviation:

- `pos_sales.subtotal`
- `pos_sales.tax_amount`
- `pos_sales.total_amount`

are currently unqualified `numeric`, while the approved contract requires `numeric(12,2)`.

Because the ordered execution contract prohibits Stage 4 from beginning before Stage 3 conforms completely, the previous decision:

`READY FOR STAGE 4 EXECUTION`

is replaced with:

`READY FOR A GUARDED STAGE 3 PRECISION PATCH, FOLLOWED BY STAGE 4 AFTER THE STAGE 3 GATE PASSES.`

Upon approval, execution will use two separate immutable migrations:

1. Migration C — narrow Stage 3 numeric-precision correction.
2. Migration D — exact Stage 4 permission rows and bundle bindings.

The migrations must not be combined.

If Migration C fails, Migration D must not begin.

If Migration C passes and Migration D fails, only Migration D rolls back; the corrected Stage 3 remains passed.

No Stage 5 work is included.

---

## B. Locked Current Evidence

The following evidence is accepted:

### Migration history

- Original incorrect Stage 3:
  `supabase/migrations/20260720112709_ad08a2ec-3811-4c0f-ad01-b99e602a10c1.sql`
- Migration A — precise rollback:
  `supabase/migrations/20260720165405_b3636f3e-6418-4f8a-a5ab-89a765b18580.sql`
- Migration B — corrected additive schema:
  `supabase/migrations/20260720165521_b5a440d6-46e0-46a5-b1b6-e3db4380bc22.sql`

These files remain immutable.

### Stage 3 confirmed-correct objects

- `ledger_entries.effective_date date NULL`, no default.
- Approved composite effective-date index exists.
- Approved cancellation partial UNIQUE index exists.
- `invoices.corrects_invoice_id` exists with the correct self-FK.
- `invoices.corrects_invoke_id` is absent; the earlier wording was a narrative typo only.
- `invoice_items_period_valid_ck` exists and remains NOT VALID.
- All six approved expense columns exist.
- The expense ledger/source checks and partial unique indexes exist.
- The unapproved expense enum is absent.
- `finance_request_idempotency` matches its approved UUID/bytea/snapshot/expiry contract.
- `pos_sales` matches its approved identities, FKs, occurrence key, currency nullability, and non-unique cart hash.
- RLS is enabled and not forced on both internal tables.
- No PUBLIC/anon/authenticated access exists on either internal table.
- Both internal tables contain zero rows.
- D-07 is canonical and non-duplicated.
- Protected financial fingerprints match Stage 2.
- Stage 4 has not begun.

### Remaining Stage 3 deviation

Live catalog:

- `subtotal numeric`
- `tax_amount numeric`
- `total_amount numeric`

Approved:

- `subtotal numeric(12,2)`
- `tax_amount numeric(12,2)`
- `total_amount numeric(12,2)`

This deviation must be closed before Stage 4.

---

## C. Migration C — Guarded Stage 3 Numeric-Precision Patch

### C1. Pre-mutation guards

Before executing any ALTER, assert:

1. `public.pos_sales` exists.
2. Row count is exactly 0.
3. RLS is enabled and not forced.
4. No policy exists.
5. The approved PK, FKs, and unique `(tenant_id, session_id, sale_number)` remain exact.
6. `cart_hash` is not unique.
7. `currency` remains NOT NULL.
8. No incorrect placeholder column exists.
9. The exact current numeric definitions are:

   - `subtotal` = unqualified `numeric`, NOT NULL, no default.
   - `tax_amount` = unqualified `numeric`, NOT NULL, default numerically equal to 0.
   - `total_amount` = unqualified `numeric`, NOT NULL, no default.

10. None of the three columns already has precision/scale.
11. No view, function, generated expression, trigger, or unexpected dependency prevents the approved precision change.
12. All six expense FKs/checks/indexes and every other Stage 3 object still match Migration B.
13. Stage 4 permission keys and bindings remain absent.
14. Protected financial counts, sums, distributions, and keyed fingerprints still match the Stage 2 baseline.

Any failed guard aborts Migration C before the first ALTER.

### C2. Exact mutation

In one transactional migration, execute:

```sql
ALTER TABLE public.pos_sales
  ALTER COLUMN subtotal
    TYPE numeric(12,2)
    USING subtotal::numeric(12,2),
  ALTER COLUMN tax_amount
    TYPE numeric(12,2)
    USING tax_amount::numeric(12,2),
  ALTER COLUMN total_amount
    TYPE numeric(12,2)
    USING total_amount::numeric(12,2);

Preserve:

- `subtotal` NOT NULL with no default.  

- `tax_amount` NOT NULL with default `0`.  

- `total_amount` NOT NULL with no default.  


Do not change any other `pos_sales` column, constraint, FK, index, ACL, RLS flag, policy, or table property.

Do not use `CASCADE`.

Do not use `IF EXISTS`.

Do not modify default privileges.

### C3. Post-mutation Stage 3 gate

Before COMMIT, assert:

-   
all three columns are exactly `numeric(12,2)`;  

-   
precision = 12;  

-   
scale = 2;  

-   
all required nullability/default contracts remain exact;  

- `pos_sales` still contains 0 rows;  

-   
every approved Stage 3 object remains exact;  

-   
no existing financial/business row changed;  

-   
protected financial fingerprints remain exact;  

-   
Stage 4 remains unstarted.  


Successful terminal gate:

**AML.1.b.1 STAGE 3: PASSED — CORRECT ADDITIVE SCHEMA FULLY CONFORMANT, INCLUDING POS NUMERIC(12,2); PROTECTED FINANCIAL STATE UNCHANGED.**

Only after this gate passes may Migration D begin.

### C4. Stage 3 execution evidence

Create/update:

`docs/aml_1_b_1/stage_03_execution/STAGE_03_[CLOSURE.md](http://CLOSURE.md)`

Record:

-   
original incorrect migration;  

-   
Migration A rollback;  

-   
Migration B corrected additive schema;  

-   
Migration C precision correction;  

-   
before/after precision evidence;  

-   
zero-row proof;  

-   
complete protected parity;  

-   
D-07 canonical state;  

-   
final Stage 3 PASSED decision.  


Do not alter the canonical D-07 row.

---

## D. Migration D — Stage 4 Exact Permission Foundation

### D1. Pre-mutation catalog assertions

Before insertion, assert:

#### `permission_definitions`

The authoritative insert columns are exactly:

- `key`  

- `module`  

- `resource`  

- `action`  

- `display_name`  

- `display_name_ar`  

- `description`  

- `description_ar`  

- `is_delegatable`  


Confirm:

- `is_owner_only` does not exist.  

-   
None of the three target permission keys exists.  

-   
Current Finance permission-definition count is exactly 16.  

-   
Existing sibling Finance convention still supports the captured exact values.  

-   
No conflicting catalog drift exists.  


#### `كبير المشرفين` bundle

Assert the platform-wide exact set is one row:

- `bundle_id = 4d9b8917-f11d-4879-840d-1b682bad8cec`  

- `tenant_id = 145f2128-83ca-4ba8-85b5-8ade245c5530`  

- `name = كبير المشرفين`  

- `is_system = false`  


Confirm:

-   
no duplicate same-name bundle exists;  

-   
current Finance bindings count = 14;  

-   
none of the three target bindings exists;  

- `finance.invoice.markPaid` remains present and bound;  

- `bundle_permissions` contains only `(bundle_id, permission_key)`;  

-   
PK is `(bundle_id, permission_key)`;  

-   
no `tenant_id` column exists on `bundle_permissions`.  


Any failed assertion aborts Migration D before insertion.

### D2. Exact permission rows

Insert exactly:

```

```

```
INSERT INTO public.permission_definitions
  (
    key,
    module,
    resource,
    action,
    display_name,
    display_name_ar,
    description,
    description_ar,
    is_delegatable
  )
VALUES
  (
    'finance.invoice.approve',
    'finance',
    'invoice',
    'approve',
    'Approve Invoices',
    'اعتماد الفواتير',
    'Approve draft invoices and post them to the ledger',
    'اعتماد مسودات الفواتير وترحيلها إلى السجل المالي',
    true
  ),
  (
    'finance.invoice.cancel',
    'finance',
    'invoice',
    'cancel',
    'Cancel Invoices',
    'إلغاء الفواتير',
    'Cancel invoices and reverse associated ledger entries',
    'إلغاء الفواتير وعكس القيود المحاسبية المرتبطة بها',
    true
  ),
  (
    'finance.adjustment.create',
    'finance',
    'adjustment',
    'create',
    'Create Financial Adjustments',
    'إنشاء تسويات مالية',
    'Create manual financial adjustments to customer balances',
    'إنشاء تسويات مالية يدوية لأرصدة العملاء',
    true
  );
```

No additional permission key, alias, wildcard, plural namespace, or compatibility key may be added.

### D3. Exact bundle bindings

Insert exactly:

```

```

```
INSERT INTO public.bundle_permissions
  (bundle_id, permission_key)
VALUES
  (
    '4d9b8917-f11d-4879-840d-1b682bad8cec',
    'finance.invoice.approve'
  ),
  (
    '4d9b8917-f11d-4879-840d-1b682bad8cec',
    'finance.invoice.cancel'
  ),
  (
    '4d9b8917-f11d-4879-840d-1b682bad8cec',
    'finance.adjustment.create'
  );
```

Do not bind the keys to:

-   
any other preset;  

-   
any custom role;  

-   
any other tenant bundle;  

-   
any bundle inferred from create/edit permissions;  

-   
any individual user automatically.  


Do not add, remove, rename, or rebind `finance.invoice.markPaid`.

---

## E. Stage 4 Post-Mutation Assertions

Before COMMIT, assert:

1.   
Exactly three new permission definitions exist.  

2.   
Every stored column value matches §D2 byte-for-byte.  

3.   
Finance permission-definition count changed exactly from 16 to 19.  

4.   
Exactly three new bundle bindings exist.  

5.   
Bundle Finance binding count changed exactly from 14 to 17.  

6.   
No target permission is bound to another bundle.  

7.   
No unrelated permission definition or binding changed.  

8. `finance.invoice.markPaid` row and binding remain unchanged.  

9.   
No invoice, invoice item, ledger entry, customer balance, billing link, expense, POS row, or idempotency row changed.  

10.   
Protected financial fingerprints remain exact.  

11.   
Stage 3 schema remains exact, including all three `numeric(12,2)` columns.  

12.   
No ACL, RLS policy, default privilege, function, trigger, or application writer changed.  

13.   
Stage 5 has not begun.  


Any failed assertion aborts Migration D entirely.

Successful gate:

**AML.1.b.1 STAGE 4: PASSED — EXACT THREE PERMISSION DEFINITIONS INSERTED AND BOUND ONLY TO THE CAPTURED كبير المشرفين BUNDLE.**

---

## F. Stage 4 Rollback Artifact

Store the exact rollback artifact before applying Migration D.

Rollback order:

1.   
Delete only the three captured `bundle_permissions` rows.  

2.   
Delete only the three inserted `permission_definitions` rows.  


The rollback must assert:

-   
captured bundle ID/tenant set remains exact;  

-   
the three definitions still match the Stage 4 inserted preimage;  

-   
the only Stage 4 bindings are the three captured bundle rows;  

-   
no future/manual binding of these keys exists elsewhere;  

- `finance.invoice.markPaid` remains untouched;  

-   
post-rollback Finance permission-definition count returns from 19 to 16;  

-   
post-rollback bundle Finance binding count returns from 17 to 14.  


If another binding or definition drift appears after Stage 4, rollback must halt rather than delete it silently.

Store Stage 4 execution and rollback evidence under:

`docs/aml_1_b_1/stage_04_permissions/`

---

## G. Failure Handling

### Migration C failure

-   
Roll back Migration C completely.  

-   
Do not begin Migration D.  

-   
Preserve the current Stage 3 state.  

-   
Report the exact failing precision/catalog guard.  


### Migration D failure

-   
Roll back Migration D completely.  

-   
Preserve the successfully corrected Stage 3.  

-   
Do not begin Stage 5.  

-   
Report the exact permission/bundle assertion failure.  


No guard may be weakened or waived.

No alternative schema, role inference, additional permission, or unrelated fix may be introduced.

---

## H. Explicit Non-Scope

This execution does not:

-   
begin Stage 5;  

-   
create RPCs;  

-   
migrate frontend writers;  

-   
backfill `effective_date`;  

-   
rebuild balances;  

-   
revoke Finance-Core table DML;  

-   
modify default privileges;  

-   
add RLS policies;  

-   
change protected Demo financial records;  

-   
neutralize `الم-202607-213`;  

-   
create the future real Laboratory customer account;  

-   
change any unrelated module.  


---

## I. Final Execution Output

Successful completion must report:

1.   
Migration C filename and applied result.  

2.   
Exact before/after POS numeric definitions.  

3.   
Final Stage 3 PASSED gate.  

4.   
Migration D filename and applied result.  

5.   
Exact three permission rows.  

6.   
Exact three bundle bindings.  

7. `finance.invoice.markPaid` preservation.  

8.   
Protected financial parity.  

9.   
Stage 4 rollback-artifact location.  

10.   
Final status:  


**AML.1.b.1 STAGE 3: PASSED — FULLY CONFORMANT.**

**AML.1.b.1 STAGE 4: PASSED — EXACT PERMISSION FOUNDATION APPLIED.**

**STAGE 5: READY, NOT STARTED.**