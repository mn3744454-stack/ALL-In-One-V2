# PROMPT 04 — CONTINUATION A1-R1

## Batch 01 Verification Correction — Ordinals 001–010 Only

Mode: Plan/Chat — Read-Only. No repository writes other than this planning artifact. No database writes.

---

## A. Correction Verdict

**A1-R1 COMPLETE — 10/10 CONTRACT-VERIFIED**

All ten scoped migration bodies were read in full, hashed, traced through every later migration that touches their objects, resolved to a final repository-expected definition at HEAD, and compared against the live catalog using normalized definitions (`pg_get_functiondef`, `pg_policies` USING/WITH CHECK text, `pg_get_constraintdef`, `pg_get_triggerdef`, `pg_enum` ordering, `relacl`/`proacl`).

One qualification stated up front, not buried: for ordinal 001 the `horses` table's *added-since* column surface (57 live columns vs 13 original) was compared only for the 13 originally created columns. Columns added by migrations 011–322 are out of A1-R1 scope and are neither claimed verified nor claimed drifted.

---

## B. Prior-Claim Correction Register

| # | A1 claim | Verdict | Correction |
|---|---|---|---|
| 1 | "BATCH 01 COMPLETE — 40/40 MIGRATIONS VERIFIED" | **OVERTURNED** | 40 bodies were read; 0 were contract-verified. After A1-R1, contract-verified = 10. |
| 2 | Scoped filename list with ellipses | **OVERTURNED** | Complete filenames listed in Section C. |
| 3 | Existence / RLS-enabled / policy-count treated as verification | **OVERTURNED** | Replaced with expression-level and body-level comparison. |
| 4 | "All 39 functions are `CREATE OR REPLACE`d by at least one later migration" | **OVERTURNED** | For the five functions in ordinals 001–010, only `handle_new_user` is redefined later (exactly once, by `20260328051924_1def4f56-8f5a-41c2-94c7-79bdc3ef9a1a.sql`). `is_tenant_member`, `has_tenant_role`, `can_invite_in_tenant`, and `update_updated_at_column` have **zero** later `CREATE OR REPLACE`. Evidence: `grep -l -E "FUNCTION public\.<name>"` over ordinals 011–322 returns no files for those four. This resolves the internal contradiction in A1 — the per-entry statements were right and the aggregate claim was wrong. |
| 5 | Only one index inspected | **CONFIRMED as a gap** — ordinals 001–010 create no explicit `CREATE INDEX`; only implicit PK/UNIQUE indexes, which were verified via `pg_get_constraintdef`. |
| 6 | Omitted work described as access limitation | **OVERTURNED** | No access limitation exists for ordinals 001–010. `psql` catalog reads succeeded for every object. |
| 7 | Approximate Run Start | **OVERTURNED** | See Section G — Exact time not recorded for A1; A1-R1 times are exact. |
| 8 | "`horses` has RLS enabled but `relforcerowsecurity` is false" | **CONFIRMED** | `relrowsecurity=true`, `relforcerowsecurity=false` for all five core tables. |
| 9 | Methodology question directed at Owner | **OVERTURNED** | Depth is now fixed by this contract; no question is asked. |
| 10 | Live/repo status for enums | **NARROWED** | Enum membership verified with full ordering; drift is additive-only (Section D). |

---

## C. Exact Scope Proof — Complete Filenames, Ordinals 001–010

```
001  supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql
002  supabase/migrations/20251217045847_e069af52-109e-4b18-8c5e-2f272eda94bd.sql
003  supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql
004  supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql
005  supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql
006  supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql
007  supabase/migrations/20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql
008  supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql
009  supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql
010  supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql
```

SHA-256 and byte size:

| Ord | SHA-256 | Bytes |
|---|---|---|
| 001 | `2d3272fec9ff6f6e9c35d4a62934ee589b0219834f19288df49e5821b7d0e18c` | 8925 |
| 002 | `57f66af30e80abf08b5f58ed367cb8be6e8f3c894fda05ebfa2c7c63f1e64b14` | 236 |
| 003 | `2f996c8f33e3020b6ad5704ee78427f584cca1462ef6dbfe435a54d428ebf3de` | 1081 |
| 004 | `2a2903e0c42595874267c3782246b3697b56d492461ee90d22826e7c65911309` | 665 |
| 005 | `35a758b2e038054a76b5d03eafc2c6b625330aa222be69968969bcc73a9f87fd` | 760 |
| 006 | `fa10c739bbae8ff46969218b072e46b08e42fa30b807689caf9602f6fcb96cae` | 606 |
| 007 | `37fc4b2a276230f486094ca57b70cb330584816f5fae475bcda510a5495cb1a8` | 306 |
| 008 | `4a071e735b8fef8d45de9082c18fcf7d7590cccad72ca1a644874d00a305ee68` | 6428 |
| 009 | `959ad5a68e2de13802d42d0616cf39f2361ee2fa3979c8e4e323d3a9a2fe7a40` | 1014 |
| 010 | `75050a8b4759161781d1d1b02a3750d9c2588f03259ce7fe63fc391fe22ae5e6` | 164 |

---

## D. Contract-Complete Migration Ledger — 001–010

### Ordinal 001 — `20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
Timestamp 2025-12-17 04:57:41 · SHA-256 `2d3272fec9ff…e18c` · Earlier dependencies: none (genesis) · Classification: **MIXED — see object sub-records**

**Objects touched:** 3 enums, 5 tables, 5 functions, 6 triggers, 17 policies.

| Object | Original operation | Supersession chain (complete filenames) | Final repo-expected | Live | Status |
|---|---|---|---|---|---|
| `TYPE public.tenant_type` | CREATE ENUM (7 labels: stable, clinic, lab, academy, pharmacy, transport, auction) | `20260225023857_3348d854-05a2-4fab-a33a-e402f99584ac.sql` adds `horse_owner`, `trainer`, `doctor` | 10 labels in that order | `pg_enum` order 1–10: stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor | **SEMANTIC_MATCH** (membership + ordering identical) |
| `TYPE public.tenant_role` | CREATE ENUM (6 labels) | `20251221115224_1466aea9-40e6-407b-8c99-18a7c4844ff9.sql` adds `manager` | 7 labels | order 1–7: owner, admin, foreman, vet, trainer, employee, manager | **SEMANTIC_MATCH** |
| `TYPE public.invitation_status` | CREATE ENUM (pending, accepted, rejected) | `20260116014518_94209a46-cca4-4048-8955-452c61963680.sql`, re-asserted idempotently by `20260116021754_d5659ab7-e453-446d-9091-d9039bda996d.sql` | 6 labels | order 1–6: pending, accepted, rejected, preaccepted, expired, revoked | **SEMANTIC_MATCH** |
| `TABLE public.profiles` | CREATE (7 cols, PK→auth.users ON DELETE CASCADE) | later additive columns (bio, location, website, social_links, full_name_ar) | 7 original cols unchanged | positions 1–7 identical: id uuid NOT NULL, email text NOT NULL, full_name, phone, avatar_url, created_at NOT NULL now(), updated_at NOT NULL now(); `profiles_pkey`, `profiles_id_fkey → auth.users(id) ON DELETE CASCADE` | **EXACT_MATCH** (original surface); live extra columns out of A1-R1 scope |
| `TABLE public.tenants` | CREATE (10 cols) | ordinal 005 adds `owner_id`; later additive (slug…currency) | 10 original cols unchanged | positions 1–10 identical incl. `type tenant_type NOT NULL`; `tenants_pkey` | **EXACT_MATCH** (original surface) |
| `TABLE public.tenant_members` | CREATE (9 cols + UNIQUE(tenant_id,user_id)) | none in 011–322 that alter these columns | 9 cols | 9 cols exactly, identical types/defaults/nullability; `tenant_members_tenant_id_user_id_key UNIQUE (tenant_id, user_id)`, both FKs ON DELETE CASCADE | **EXACT_MATCH** |
| `TABLE public.invitations` | CREATE (14 cols; `invitee_email TEXT NOT NULL`) | `20260116021754_d5659ab7…sql` / `20260117021239_1335b94a…sql` / `20260121183504_2f7d073f…sql` family: email made optional, `invitee_phone` added, CHECK `invitee_email OR invitee_phone` added, `token`/`expires_at`/`sender_display_name` added | `invitee_email` nullable, guarded by CHECK | live: `invitee_email` `is_nullable=YES`; `invitations_email_or_phone_required CHECK ((invitee_email IS NOT NULL) OR (invitee_phone IS NOT NULL))`; `invitations_token_key UNIQUE (token)` | **SUPERSEDED_BY_LATER_MIGRATION** → final repo definition equals live: **SEMANTIC_MATCH** |
| `TABLE public.horses` | CREATE (13 cols, gender CHECK) | many later additive migrations | 13 original cols unchanged; `gender IN ('male','female')` | positions 1–13 identical; `horses_gender_check CHECK (gender = ANY (ARRAY['male','female']))`; `horses_pkey`; `horses_tenant_id_fkey → tenants(id) ON DELETE CASCADE` | **EXACT_MATCH** (original surface) |
| `FUNCTION public.is_tenant_member(uuid,uuid)` | CREATE, sql/STABLE/SECURITY DEFINER/search_path=public | **none** — zero later `CREATE OR REPLACE` | as originally written | `pg_get_functiondef` body byte-equivalent to the migration body; `LANGUAGE sql`, `STABLE SECURITY DEFINER`, `SET search_path TO 'public'`, owner `postgres`, `proacl` includes `authenticated=X/postgres` | **EXACT_MATCH** |
| `FUNCTION public.has_tenant_role(uuid,uuid,tenant_role)` | CREATE, sql/STABLE/SECDEF | **none** | as written | identical normalized body, attributes, owner, EXECUTE grants to anon/authenticated/service_role | **EXACT_MATCH** |
| `FUNCTION public.can_invite_in_tenant(uuid,uuid)` | CREATE, sql/STABLE/SECDEF | **none** | as written | identical normalized body and attributes | **EXACT_MATCH** |
| `FUNCTION public.handle_new_user()` | CREATE, plpgsql/SECDEF; inserts (id,email,full_name) | `20260328051924_1def4f56-8f5a-41c2-94c7-79bdc3ef9a1a.sql` (adds `phone` from `raw_user_meta_data`) | 4-column insert incl. phone | live body matches the 2026-03-28 body exactly (`INSERT … (id, email, full_name, phone)`), SECDEF, `search_path=public`, owner postgres | **SUPERSEDED_BY_LATER_MIGRATION** → final repo vs live: **EXACT_MATCH** |
| `FUNCTION public.update_updated_at_column()` | CREATE without `search_path` | ordinal 002 only; **no** later redefinition in 011–322 | plpgsql, `SET search_path = public`, SECURITY INVOKER | live: `SET search_path TO 'public'`, `prosecdef=false`, owner postgres | **SUPERSEDED_BY_LATER_MIGRATION (by 002)** → **EXACT_MATCH** |
| `TRIGGER on_auth_user_created` on `auth.users` | CREATE AFTER INSERT | none | as written | `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()` | **EXACT_MATCH** |
| Triggers `update_{profiles,tenants,tenant_members,invitations,horses}_updated_at` | CREATE BEFORE UPDATE … EXECUTE update_updated_at_column() | none | 5 triggers | all five present with identical `pg_get_triggerdef` | **EXACT_MATCH** |
| 17 policies (profiles ×4, tenants ×3, tenant_members ×3, invitations ×4, horses ×2) | CREATE POLICY | ordinals 003, 004, 005, 006, 007, 008 within batch; then `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` and the later permission-model rebuilds (`…_00b02fa6…`, `has_permission` era) | see per-table rows below | see per-table rows below | **SUPERSEDED_BY_LATER_MIGRATION** |

Impact classification: **UNRELATED_DEFERRED** (identity/tenancy foundation; no shared-finance or import-blocking surface).
Severity: low · Likelihood: low.
Risk/consequence: none identified for historical financial import.
Verification conclusion: contract-verified; genesis objects are intact or cleanly superseded with live agreement.

---

### Ordinal 002 — `20251217045847_e069af52-109e-4b18-8c5e-2f272eda94bd.sql`
Timestamp 2025-12-17 04:58:47 · SHA-256 `57f66af3…6b14` · Depends on 001 · **Classification: EXACT_MATCH**

Object: `FUNCTION public.update_updated_at_column()` — `CREATE OR REPLACE` adding `SET search_path = public`.
Supersession chain: **none** in 011–322 (verified by grep for `CREATE OR REPLACE FUNCTION … update_updated_at_column` over ordinals 011–322 → no matches).
Final repo-expected: plpgsql, returns trigger, SECURITY INVOKER, `search_path=public`, body `NEW.updated_at = now(); RETURN NEW;`.
Live: `prosecdef=false`, `proconfig={search_path=public}`, owner `postgres`, `proacl` grants EXECUTE to postgres/anon/authenticated/service_role, body identical.
Repo evidence: file body lines 2–10. Live evidence: `pg_get_functiondef` output.
Impact: **UNRELATED_DEFERRED** · Severity low · Likelihood low · Risk: none.
Conclusion: contract-verified, exact.

---

### Ordinal 003 — `20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`
Timestamp 2025-12-19 01:02:35 · SHA-256 `2f996c8f…f3de` · Depends on 001 · **Classification: SUPERSEDED_BY_LATER_MIGRATION**

Objects: DROP+CREATE 3 `tenants` policies and 1 `tenant_members` INSERT policy (permissive re-issue).
Supersession chain: ordinals 004, 005, 006, 007, 008 (all within batch), then `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` for the tenant_members owner-self-insert hardening.
Final repo-expected `tenants` policies: `Authenticated users can create tenants` (INSERT/authenticated/WITH CHECK true), `Members can view their tenants` (SELECT/USING is_tenant_member), `Owners can update their tenants` (UPDATE) plus later-added owner_id-freeze WITH CHECK and `Owners can view their own tenants`.
Live: exactly those four policies, all PERMISSIVE, `Owners can update their tenants` carries `WITH CHECK (has_tenant_role(...) AND owner_id = (SELECT t.owner_id FROM tenants t WHERE t.id = tenants.id))` — the later owner-freeze addition, not present in ordinal 003.
`Users can insert themselves as owner` on `tenant_members` **no longer exists**; live equivalent is `Owners can add themselves as owner member` requiring `tenants.owner_id = auth.uid()`.
Impact: **UNRELATED_DEFERRED** · Severity low · Likelihood low.
Risk: none — supersession is intentional hardening, verified end-state.
Conclusion: contract-verified as superseded; final repo definition agrees with live.

---

### Ordinal 004 — `20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql`
Timestamp 2025-12-19 01:20:01 · SHA-256 `2a2903e0…1309` · Depends on 003 · **Classification: SUPERSEDED_BY_LATER_MIGRATION**

Objects: replaces `tenants` INSERT policy with `Users with a session can create tenants` (role `public`, `auth.uid() IS NOT NULL`); replaces `tenant_members` INSERT policy to role `public`.
Supersession chain: ordinal 005 drops `Users with a session can create tenants`; ordinal 006, 007, 008 rewrite the tenants INSERT policy; `20260716174522_00b02fa6…sql` rewrites the tenant_members self-insert.
Final repo-expected: neither policy name survives.
Live: `pg_policies` for `tenants` contains no `Users with a session can create tenants`; `tenant_members` contains no `Users can insert themselves as owner`. The `TO public` widening is fully reverted — live `tenants` INSERT is `TO authenticated`.
Impact: **UNRELATED_DEFERRED** · Severity low · Likelihood low.
Risk: none. The transient `TO public` grant is not present live.
Conclusion: contract-verified as superseded and removed.

---

### Ordinal 005 — `20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql`
Timestamp 2025-12-19 23:58:06 · SHA-256 `35a758b2…f87d` · Depends on 001, 004 · **Classification: MIXED**

| Object | Operation | Chain | Final repo | Live | Status |
|---|---|---|---|---|---|
| `tenants.owner_id` column | ADD uuid REFERENCES auth.users ON DELETE RESTRICT, then SET NOT NULL | none altering it | ordinal position 11, uuid, NOT NULL, no default, FK ON DELETE RESTRICT | position 11, `uuid`, `is_nullable=NO`, default `-`; `tenants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT` | **EXACT_MATCH** |
| Backfill `UPDATE tenants SET owner_id = …` | DML | n/a | n/a | n/a | **DATA_MIGRATION_NOT_STRUCTURALLY_COMPARABLE** |
| Policy `Users can create tenants as owner` | CREATE | dropped by ordinal 006 (recreate) then ordinal 007 (drop) then ordinal 008 rebuild | not present | absent from `pg_policies` | **SUPERSEDED_BY_LATER_MIGRATION** |

Impact: **UNRELATED_DEFERRED** · Severity low · Likelihood low.
Risk: the backfill's row-level outcome is unverifiable structurally; `owner_id` is NOT NULL live, which proves the backfill completed for all rows that existed at the time.
Conclusion: contract-verified.

---

### Ordinal 006 — `20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql`
Timestamp 2025-12-20 00:25:55 · SHA-256 `fa10c739…6cae` · Depends on 005 · **Classification: SUPERSEDED_BY_LATER_MIGRATION**

Objects: re-issues `tenant_members` `Users can insert themselves as owner` (TO authenticated) and `tenants` `Users can create tenants as owner`.
Chain: ordinal 007 drops the tenants policy; ordinal 008 drops+rebuilds both; `20260716174522_00b02fa6…sql` replaces the tenant_members self-insert with the owner_id-bound variant.
Final repo-expected: neither policy name survives.
Live: confirmed absent; live equivalents are `Authenticated users can create tenants` and `Owners can add themselves as owner member`.
Impact: **UNRELATED_DEFERRED** · Severity low · Likelihood low · Risk: none.
Conclusion: contract-verified as superseded.

---

### Ordinal 007 — `20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql`
Timestamp 2025-12-20 02:24:33 · SHA-256 `37fc4b2a…cb38` · Depends on 006 · **Classification: SEMANTIC_MATCH**

Object: `tenants` INSERT policy → `Authenticated users can create tenants` / `TO authenticated` / `WITH CHECK (true)`.
Chain: ordinal 008 drops and recreates the identical policy; no later migration changes it.
Final repo-expected: `Authenticated users can create tenants`, PERMISSIVE, INSERT, roles `{authenticated}`, `qual = NULL`, `with_check = true`.
Live: `tenants | Authenticated users can create tenants | PERMISSIVE | authenticated | INSERT | qual '-' | with_check 'true'` — exact.
Note carried forward for later batches: this policy permits any authenticated user to insert a tenant row without binding `owner_id` to `auth.uid()`; `check_tenant_limit` (trigger `enforce_tenant_limit`) is the only INSERT-time gate. Not in A1-R1 remediation scope.
Impact: **PLATFORM_PERMISSION_DEFERRED** · Severity medium · Likelihood low.
Conclusion: contract-verified, semantically exact.

---

### Ordinal 008 — `20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
Timestamp 2025-12-20 04:40:32 · SHA-256 `4a071e73…ee68` · Depends on 001–007 · **Classification: MIXED**

Full RLS policy rebuild across five tables (14 DROPs, 14 CREATEs).

| Table | Ordinal-008 policy set | Chain | Live | Status |
|---|---|---|---|---|
| `profiles` | 4 policies (own SELECT/UPDATE/INSERT + tenant-member SELECT) | none replacing them | 4 policies, all PERMISSIVE, roles `{authenticated}`, USING/WITH CHECK expressions byte-equivalent to the migration text (incl. the `tm1 JOIN tm2` EXISTS clause) | **EXACT_MATCH** |
| `tenants` | 3 policies | later owner-freeze WITH CHECK + `Owners can view their own tenants` | 4 policies; `Owners can update their tenants` gained a WITH CHECK | **SUPERSEDED_BY_LATER_MIGRATION** → final repo = live |
| `tenant_members` | 3 policies (self-insert owner; member SELECT; owners FOR ALL) | `20260716174522_00b02fa6…sql` and the invitation-join work | live 5 policies: `Members can view tenant members` (USING `is_tenant_member(auth.uid(), tenant_id)` — **EXACT_MATCH** to ordinal 008), `Owners can update…`, `Owners can delete…` (the `FOR ALL` policy was split into UPDATE + DELETE), `Owners can add themselves as owner member`, `Users can join via invitation` | **POLICY_DRIFT vs ordinal 008, SEMANTIC_MATCH vs final repo HEAD** |
| `horses` | 2 policies (member SELECT; can_manage_horses FOR ALL) | replaced wholesale by the `has_permission` era and connection-sharing era | live 8 policies: 3 `Permission-based …` using `has_permission(auth.uid(), tenant_id, 'horses.create'/'edit'/'delete')`, `Members can view tenant horses (scoped)`, `Connected tenant members can view granted horses`, 3 owner-tenant policies | **SUPERSEDED_BY_LATER_MIGRATION** |
| `invitations` | 4 policies | `20260716174522_00b02fa6…sql` era rename to `invitations_insert` / `invitations_select_sent` / `invitations_select_received` | live 3 policies with those names; the ordinal-008 names are absent; the UPDATE policy is now enforced by trigger `trg_enforce_invitation_update_rules` | **SUPERSEDED_BY_LATER_MIGRATION** |

RLS state: all five tables live `relrowsecurity=true`, `relforcerowsecurity=false`. Table owner `postgres` for all five.
Impact: **PLATFORM_PERMISSION_DEFERRED** · Severity low · Likelihood low.
Conclusion: contract-verified. Only `profiles` retains the ordinal-008 policy set verbatim.

---

### Ordinal 009 — `20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql`
Timestamp 2025-12-20 05:23:39 · SHA-256 `959ad5a6…9a40` · Depends on 001 · **Classification: MIXED**

| Grant | Final repo-expected | Live (`relacl` / `proacl`) | Status |
|---|---|---|---|
| `USAGE ON SCHEMA public TO authenticated` | present | present (schema usable; all five tables reachable) | **EXACT_MATCH** |
| `SELECT,INSERT,UPDATE,DELETE` on `tenants`, `tenant_members`, `horses`, `invitations`, `profiles` TO authenticated | `arwd` minimum for authenticated | all five: `authenticated=arwdDxtm/postgres` | **EXACT_MATCH** (live is a superset: also `D`,`x`,`t`,`m`) |
| anon grants — **not** granted by this migration | not specified | `horses`, `invitations`, `profiles`, `tenant_members`: `anon=arwdDxtm/postgres`; `tenants`: `anon=awdDxtm/postgres` (**no `r`/SELECT**) | **LIVE_EXTRA** |
| `EXECUTE` on `update_updated_at_column()`, `is_tenant_member(uuid,uuid)`, `has_tenant_role(uuid,uuid,tenant_role)`, `can_invite_in_tenant(uuid,uuid)` TO authenticated | present | all four `proacl` contain `authenticated=X/postgres` (plus `anon`, `service_role`) | **EXACT_MATCH** (superset) |

Two findings worth carrying forward: (a) `anon` holds table-level DML privileges on all five core tables — RLS is the only barrier, so any future policy addressed `TO public` or `TO anon` becomes immediately exploitable; (b) `tenants` is the sole table where `anon` lacks SELECT, an asymmetry with no migration in 001–010 as its origin.
Impact: **PLATFORM_PERMISSION_DEFERRED** · Severity medium · Likelihood low (no anon-addressed policy exists on these tables today; `horses` has three `TO public` policies, all gated by `has_permission(auth.uid(), …)` which is null-safe for anon).
Conclusion: contract-verified.

---

### Ordinal 010 — `20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql`
Timestamp 2025-12-20 05:44:41 · SHA-256 `75050a8b…e5e6` · Depends on 001 · **Classification: SUPERSEDED_BY_LATER_MIGRATION**

Object/operation: `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;` and `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;` — an explicitly temporary test change ("تعطيل RLS مؤقتاً للاختبار").
Supersession chain: `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` (ordinal 011, 6m28s later) re-enables RLS on both tables. No later migration disables it again (grep for `DISABLE ROW LEVEL SECURITY` on these tables over 011–322 → no matches).
Final repo-expected: RLS enabled on both.
Live: `pg_class.relrowsecurity = true` for `tenants` and `tenant_members`; `relforcerowsecurity = false`.
Impact: **UNRELATED_DEFERRED** · Severity high-if-live, **not live** · Likelihood zero.
Risk: none currently. Historical note: between these two migrations the tenancy tables were unprotected.
Conclusion: contract-verified as superseded and reverted.

---

## E. Exact Evidence Gaps

**Proven access limitation:** none. Every catalog read attempted for ordinals 001–010 succeeded via `psql` against the managed database.

**Work still not performed (omitted, not blocked):**
1. Columns added to `horses`, `tenants`, `profiles`, and `invitations` by migrations 011–322 were not compared — out of A1-R1 scope by design.
2. `pg_get_indexdef` was not run: ordinals 001–010 create no explicit indexes; the implicit PK/UNIQUE indexes were verified through `pg_get_constraintdef` rather than `pg_get_indexdef`.
3. Column-level (`GRANT … (col)`) privileges were not enumerated; only relation-level `relacl` was read.
4. Default privileges (`pg_default_acl`) were not read, so the origin of the `anon` table grants in Ordinal 009's LIVE_EXTRA row is unattributed.
5. Parallel-safety (`proparallel`) was read only implicitly via `pg_get_functiondef`, which omits it when default.

**Repository ambiguity:** the ordinal-008 `tenant_members` `FOR ALL` policy has no single superseding migration; live shows it split into separate UPDATE and DELETE policies. The exact migration performing that split was not isolated in this run.

**Live-state ambiguity:** `tenants` `anon` privilege set lacks `r` while its four peers have it; no migration in 001–010 explains the asymmetry, and the responsible later migration was not identified.

---

## F. Reconciliation

```
File bodies previously reported read (A1):        40 / 322
Primary entries previously returned (A1):         40 / 322
Contract-verified migrations after A1-R1:         10 / 322
A1-R1 expected rows:                              10
A1-R1 complete rows:                              10
Missing ordinals:                                 none
Duplicate ordinals:                               none
```

The 40 A1 summaries are **not** converted into verified migrations. Ordinals 011–040 remain read-but-unverified. Ordinals 041–322 remain unread and unverified.

---

## G. Run Metadata and Exact Stopping Point

| Field | Value |
|---|---|
| Mode / operation | Plan/Chat — Read-Only; Batch 01 verification correction, ordinals 001–010 |
| Parent Prompt ID | PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04 |
| Continuation identity | Prompt 04 — Continuation A1-R1 |
| Prompt Preparation Date/Time | 2026-08-02 13:03 Asia/Riyadh (UTC+03:00) |
| Actual Run Start | 2026-08-02T10:11:10Z (UTC) — from `date -u` at first tool call |
| Actual Run End | 2026-08-02T10:19Z (UTC) |
| Final Report time | 2026-08-02T10:19Z (UTC) |
| Timezone / timestamp evidence | Sandbox `date -u +%Y-%m-%dT%H:%M:%SZ`; A1 run start: **Exact time not recorded** |
| Branch | `edit/edt-da35f96a-75d1-4576-bc5a-ed9d5e48401c` |
| HEAD before | `2fb16f9c51fbd0246b002466cdd2f9ef6ecb0450` |
| HEAD after | `2fb16f9c51fbd0246b002466cdd2f9ef6ecb0450` |
| Working tree before | clean (`git status --porcelain` empty) |
| Working tree after | modified: `.lovable/plan.md` only (platform-managed planning artifact, DEC-RM-DH-003-004) |
| Scoped filenames read | the 10 listed in Section C, complete bodies |
| Later migration files inspected for lineage | `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql`, `20251221115224_1466aea9-40e6-407b-8c99-18a7c4844ff9.sql`, `20260116014518_94209a46-cca4-4048-8955-452c61963680.sql`, `20260116021754_d5659ab7-e453-446d-9091-d9039bda996d.sql`, `20260225023857_3348d854-05a2-4fab-a33a-e402f99584ac.sql`, `20260328051924_1def4f56-8f5a-41c2-94c7-79bdc3ef9a1a.sql`, `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql`; plus name-level grep sweeps across all 312 files at ordinals 011–322 |
| Repository paths inspected | `supabase/migrations/` |
| Live schemas/objects inspected | `public` (5 tables, 5 functions, 3 enums, 17 triggers, 24 policies, relation ACLs) and `auth.users` trigger `on_auth_user_created` |
| Read-only queries (by purpose) | function definitions + attributes + ACL; policy roles/cmd/permissive/USING/WITH CHECK; `relrowsecurity`/`relforcerowsecurity`/owner/`relacl`; `information_schema.columns`; `pg_constraint` definitions; `pg_get_triggerdef`; `pg_enum` labels + sort order |
| Intended repository writes | zero |
| Actual repository writes | zero, except the disclosed automatic `.lovable/plan.md` behavior |
| Database writes / DDL / DML / mutating RPCs / migrations applied / backfills / deployment | zero for every category |
| Roadmap persistence / Workstream persistence | zero |
| Acceptance / Closure | none |
| Last contract-verified ordinal | **010** |
| Unresolved limitations | the five omitted-work items and two ambiguities in Section E |
| Exact stopping point | A1-R1 complete at ordinal 010. Ordinal 011 not opened as a scoped verification target. Batch 02 not started. No Prompt 05 preparation. |
| Recommended next continuation identity | **Prompt 04 — Continuation A1-R2 (ordinals 011–020)** — no new Prompt number consumed |
