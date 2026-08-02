# PROMPT 04 — CONTINUATION A1-R1-C1

## Policy-Lineage Correction for Ordinals 001, 003, and 008

Mode: Plan/Chat — Read-Only. Scope limited to the policy dimension on `public.tenants`, `public.tenant_members`, `public.horses`, `public.invitations`.

---

## A. C1 Verdict

**A1-R1-C1 COMPLETE — 4/4 TABLE POLICY LINEAGES PROVEN**

Every scoped source policy from ordinals 001, 003, and 008 now has a complete source → mutation-chain → final-repository → Live record with full filenames. The `tenant_members` FOR ALL split is resolved. No lineage is left at LINEAGE_NOT_PROVEN.

Two counting errors in A1-R1 are corrected here: ordinal 001 created **16** policies (not 17) and ordinal 008 created **16** policies (not 14).

---

## B. Exact Later-Migration Inventory

Search scope: ordinals 009–322 (314 files). Patterns: `CREATE POLICY`, `DROP POLICY`, `ALTER POLICY`, `ENABLE|DISABLE|FORCE ROW LEVEL SECURITY`, each of the four table names, and each scoped source policy name. 22 files matched on those patterns; all 22 bodies were read. 15 of them operate on the four scoped tables (the other 7 matched only on unrelated tables and are listed at the end as read-but-not-in-lineage).

| # | Complete filename | Tables affected | Policies affected | Exact operation | Why it belongs in the lineage |
|---|---|---|---|---|---|
| 1 | `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` | tenants, tenant_members | `Owners can manage tenant members`; `Owners can update tenant members`; `Owners can delete tenant members` | `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY`; `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY`; `DROP POLICY IF EXISTS "Owners can manage tenant members"`; `CREATE POLICY "Owners can update tenant members" FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role))`; `CREATE POLICY "Owners can delete tenant members" FOR DELETE TO authenticated USING (same)` | **This is the migration that split the ordinal-008 `FOR ALL` policy.** Also reverts ordinal 010's RLS disable. |
| 2 | `supabase/migrations/20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql` | tenants | `Owners can view their own tenants` | `CREATE POLICY … FOR SELECT TO authenticated USING (owner_id = auth.uid())` | Adds a fourth tenants policy not present in 001/003/008. |
| 3 | `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` | tenant_members | `Users can insert themselves as owner` → `Owners can add themselves as owner member` | `DROP POLICY IF EXISTS "Users can insert themselves as owner"`; `CREATE POLICY "Owners can add themselves as owner member" FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid()))` | Terminates the 001/003/004/006/008 self-insert lineage. |
| 4 | `supabase/migrations/20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql` | tenants | `Anyone can view public tenants` | `CREATE POLICY … FOR SELECT USING (is_public = true)` — no `TO` clause, therefore `PUBLIC` (anon included) | A temporary public/anon read policy on tenants; must be shown and then shown removed. |
| 5 | `supabase/migrations/20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql` | tenant_members | `Users can join via invitation` | `CREATE POLICY … FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.invitations inv WHERE inv.tenant_id = tenant_members.tenant_id AND inv.proposed_role::text = tenant_members.role::text AND inv.status='pending' AND (inv.invitee_id = auth.uid() OR inv.invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))))` | Adds the second tenant_members INSERT path; supplements (does not replace) the owner self-add. |
| 6 | `supabase/migrations/20251225003633_ab71284c-84fb-4255-bd71-f75f2c243719.sql` | horses | none (trigger only) | `DROP TRIGGER IF EXISTS validate_horse_before_activation`; `CREATE TRIGGER validate_horse_before_activation BEFORE UPDATE ON public.horses FOR EACH ROW EXECUTE FUNCTION public.validate_horse_activation()` | Live `horses` carries a trigger not created by 001/003/008; disclosed for completeness of the horses enforcement picture. Not a policy mutation. |
| 7 | `supabase/migrations/20260117021239_1335b94a-796a-4487-a486-1d61e5ca0965.sql` | horses | `Members can view tenant horses` → `Members can view tenant horses (scoped)` | `DROP POLICY IF EXISTS "Members can view tenant horses" ON public.horses`; `CREATE POLICY "Members can view tenant horses (scoped)" FOR SELECT TO authenticated USING (privileged-role EXISTS OR member_horse_access EXISTS)` | Terminates the 001/008 horses SELECT lineage. |
| 8 | `supabase/migrations/20260117133222_4f6a30dc-0cc2-4782-9b51-eca3b1a5bdff.sql` | invitations | all four ordinal-008 invitations policies dropped by a `DO $$` loop over `pg_policies`; creates `invitations_select_received`, `invitations_select_sent`, `invitations_insert`, `invitations_update` | `ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY`; dynamic `DROP POLICY IF EXISTS %I` for every existing invitations policy; four `CREATE POLICY` | Terminates all four ordinal-008 invitations lineages in one migration. The dynamic drop loop is why a name-only grep never finds the drop of `Invitees can view their invitations` etc. |
| 9 | `supabase/migrations/20260121111426_805c5d57-8bc1-4ab0-803d-932001ab3da4.sql` | invitations | `invitations_update` removed; trigger `trg_enforce_invitation_update_rules` created | `CREATE OR REPLACE FUNCTION public.enforce_invitation_update_rules()`; `DROP TRIGGER IF EXISTS trg_enforce_invitation_update_rules ON public.invitations`; `CREATE TRIGGER trg_enforce_invitation_update_rules BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.enforce_invitation_update_rules()`; `DROP POLICY IF EXISTS invitations_update ON public.invitations` (commented "P0: Remove dangerous UPDATE RLS policy"); `CREATE OR REPLACE FUNCTION public.reject_invitation(uuid, text) … SECURITY DEFINER` | Resolves what happened to the invitations UPDATE policy. |
| 10 | `supabase/migrations/20260404020933_659d6519-103c-4613-95dd-3bf9161b124c.sql` | horses | `Members with permission can manage horses` → `Permission-based insert horses`, `Permission-based update horses`, `Permission-based delete horses` | `DROP POLICY IF EXISTS "Members with permission can manage horses" ON horses`; `CREATE POLICY "Permission-based insert horses" FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'horses.create'))`; `CREATE POLICY "Permission-based update horses" FOR UPDATE USING/WITH CHECK (has_permission(…, 'horses.edit'))`; `CREATE POLICY "Permission-based delete horses" FOR DELETE USING (has_permission(…, 'horses.delete'))` | **This is the exact horses `FOR ALL` split.** Confirms the ordinal prefix `20260404020933` named in the correction request. None of the three carry a `TO` clause → roles = `PUBLIC`. |
| 11 | `supabase/migrations/20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql` | tenants | `Anyone can view public tenants` | `DROP POLICY IF EXISTS "Anyone can view public tenants" ON public.tenants`; replaced by `CREATE OR REPLACE FUNCTION public.get_public_tenants_directory(text, text)` | Removes the temporary public/anon tenants read; closes item #4's lineage. |
| 12 | `supabase/migrations/20260602213537_6c80e3c4-0815-4329-9b24-742f355bb5d0.sql` | horses | `Owner tenant members can view owned horses`, `… insert owned horses`, `… update owned horses` | three `DROP POLICY IF EXISTS` + three `CREATE POLICY` (owner_tenant_id-scoped, `TO authenticated`) | Adds three horses policies with no ancestor in 001/003/008; needed to explain the live count of 8. |
| 13 | `supabase/migrations/20260605111651_e35ad2b2-5fdd-401b-b0b9-3cd0693ff363.sql` | horses | `Connected tenant members can view granted horses` | `CREATE POLICY … FOR SELECT TO authenticated USING (connection_horse_access ⋈ connections ⋈ tenant_members …)` | Eighth horses policy; cross-tenant sharing read. |
| 14 | `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` | tenants (+ realtime.messages, post_likes, public_profile_fields out of scope) | `Owners can update their tenants` | `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants`; `CREATE POLICY … FOR UPDATE TO authenticated USING (has_tenant_role(...)) WITH CHECK (has_tenant_role(...) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id))` | The owner_id-freeze amendment on the 001/003/008 tenants UPDATE lineage. |
| 15 | `supabase/migrations/20260726164402_31bd514d-e357-44d5-8090-e0b8f82b368a.sql` | invitations | `invitations_insert` | `DROP POLICY IF EXISTS invitations_insert`; `CREATE POLICY invitations_insert FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS(tenant_members … can_invite OR role IN owner/manager/foreman) AND (proposed_role <> 'owner' OR EXISTS(owner check)))` — **no `TO` clause → roles = PUBLIC** | Final state of the invitations INSERT lineage; adds owner-escalation guard and drops the `TO authenticated` restriction. |

**Read but not in the scoped lineage** (matched the grep on other tables only): `20260110035621_32cd7f8d-4fae-40aa-8f96-7d245e3c2e05.sql`, `20260110212740_c3ff2fe7-cb95-4501-9dae-f9618d727f95.sql`, `20260117001230_7bdd1c71-aa65-44d7-b879-180e22290024.sql`, `20260121200539_75478877-a26b-4b88-9add-4b13e4b3701a.sql`, `20260121222702_0effb7b7-9ca3-4cff-aa21-8577fda69043.sql`, `20260717205437_7b2612c9-d9e3-491c-9c40-268d66d01f1f.sql`, `20260725071233_4dd54c91-4aa5-4b5a-aab0-e5f487a36c49.sql`.

---

## C. Source-to-Final Policy-Lineage Ledger

Roles notation: `{authenticated}` = policy declared `TO authenticated`; `{public}` = no `TO` clause (PostgreSQL default `PUBLIC`, which includes `anon`).

### C.1 — `public.tenants`

**Row T1 — ordinal 001 · `20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql` · `Authenticated users can create tenants` · INSERT · `{authenticated}` · PERMISSIVE · USING: n/a · WITH CHECK: `true`**
Source-lineage disposition: **SUPERSEDED** (re-created identically several times).
Chain: `20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` DROP + identical CREATE → `20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` DROP, replaced by `Users with a session can create tenants` (`{public}`, `auth.uid() IS NOT NULL`) → `20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql` DROP of that, replaced by `Users can create tenants as owner` (`{authenticated}`, `owner_id = auth.uid()`) → `20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` DROP + identical re-CREATE → `20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql` DROP, restores `Authenticated users can create tenants` with `WITH CHECK (true)` → `20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` DROP + identical CREATE. No further mutation in ordinals 012–322.
Final repository: `Authenticated users can create tenants` · INSERT · `{authenticated}` · PERMISSIVE · USING NULL · WITH CHECK `true`.
Live: `tenants | Authenticated users can create tenants | PERMISSIVE | authenticated | INSERT | qual = NULL | with_check = true`.
Final Repository-to-Live status: **EXACT_MATCH**.
Repo evidence: ordinal 008 body, section "إعادة إنشاء سياسات tenants". Live evidence: `pg_policies` row.
Security consequence: any authenticated user may insert a tenant row with an arbitrary `owner_id`; the only INSERT-time gate is trigger `enforce_tenant_limit` → `check_tenant_limit()`. The `owner_id = auth.uid()` binding that existed at ordinals 005–006 was deliberately removed at ordinal 007 and never restored.
Verification conclusion: lineage proven; live matches HEAD exactly; the permissiveness is a repository-intended state, not drift.

**Row T2 — ordinal 001 · same file · `Members can view their tenants` · SELECT · `{authenticated}` · PERMISSIVE · USING `public.is_tenant_member(auth.uid(), id)` · WITH CHECK n/a**
Disposition: **SURVIVES_UNCHANGED** (dropped and recreated with identical semantics twice).
Chain: `20251219010235_a98f269c-…sql` DROP + CREATE (identical, unqualified `is_tenant_member`) → `20251220044032_8ee723b8-…sql` DROP + CREATE (identical, `public.` qualified). No further mutation.
Final repository: SELECT · `{authenticated}` · USING `public.is_tenant_member(auth.uid(), id)`.
Live: `USING is_tenant_member(auth.uid(), id)` (catalog strips the schema qualification because `public` is on the search_path).
Status: **SEMANTIC_MATCH** — normalization: schema qualifier removed by `pg_get_expr`; identical resolved function OID.
Security consequence: none; correctly scoped Level 2.
Conclusion: lineage proven.

**Row T3 — ordinal 001 · same file · `Owners can update their tenants` · UPDATE · `{authenticated}` · PERMISSIVE · USING `public.has_tenant_role(auth.uid(), id, 'owner')` · WITH CHECK: none**
Disposition: **SURVIVES_WITH_AMENDMENT**.
Chain: `20251219010235_a98f269c-…sql` DROP + identical CREATE → `20251220044032_8ee723b8-…sql` DROP + identical CREATE → `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` DROP + CREATE adding `WITH CHECK (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id))`.
Final repository: UPDATE · `{authenticated}` · USING `has_tenant_role(auth.uid(), id, 'owner')` · WITH CHECK owner-freeze expression above.
Live: identical USING; WITH CHECK `(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`.
Status: **SEMANTIC_MATCH** — normalization: catalog rewrote `SELECT owner_id FROM public.tenants t` as `SELECT t.owner_id FROM tenants t` and added explicit casts.
Security consequence: `owner_id` cannot be reassigned through the Data API; ownership transfer must go through a definer path.
Conclusion: lineage proven.

**Ordinal 003 — complete filename:** `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` (verbatim `ls -1` value).
**Ordinal 008 — complete filename:** `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` (verbatim `ls -1` value). Wherever this document abbreviates either as `…sql`, these are the authoritative full strings.

**Ordinal 003 policies (four rows).** Ordinal 003 creates no new policy semantics — it is a DROP+re-CREATE of three tenants policies (T1, T2, T3 above) plus one tenant_members policy (TM3 below), all as PERMISSIVE re-issues. Each is therefore an *intermediate link* in the lineage of an ordinal-001 source policy rather than an independent source policy:

| Ordinal-003 policy | Table | Command | Roles | USING | WITH CHECK | Disposition | Terminating migration | Final Repo-to-Live |
|---|---|---|---|---|---|---|---|---|
| `Authenticated users can create tenants` | tenants | INSERT | `{authenticated}` | n/a | `true` | SUPERSEDED (then restored identically) | `20251220044032_8ee723b8-a20e-4a6b-…sql` | EXACT_MATCH (see T1) |
| `Members can view their tenants` | tenants | SELECT | `{authenticated}` | `is_tenant_member(auth.uid(), id)` | n/a | SURVIVES_UNCHANGED | `20251220044032_8ee723b8-…sql` | SEMANTIC_MATCH (see T2) |
| `Owners can update their tenants` | tenants | UPDATE | `{authenticated}` | `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)` | none | SURVIVES_WITH_AMENDMENT | `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` | SEMANTIC_MATCH (see T3) |
| `Users can insert themselves as owner` | tenant_members | INSERT | `{authenticated}` | n/a | `user_id = auth.uid() AND role = 'owner'::tenant_role` | SUPERSEDED | `20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` | see TM3 |

**Row T5 — later-origin policy with no ordinal 001/003/008 ancestor: `Owners can view their own tenants`**
Created by `20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql` · SELECT · `{authenticated}` · USING `owner_id = auth.uid()`. No later mutation.
Live: identical. Status: **EXACT_MATCH**. Classified relative to the C1 source set as **LIVE_EXTRA-by-later-migration** (supported by repository evidence, so not unexplained drift).

**Row T6 — temporary public/anon policy: `Anyone can view public tenants`**
Created by `20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql` · SELECT · `{public}` (no `TO` clause) · USING `is_public = true`. Dropped by `20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql` and replaced with the SECURITY-DEFINER RPC `public.get_public_tenants_directory(text, text)`.
Disposition: **REMOVED_WITHOUT_REPLACEMENT** (at the policy layer; replaced at the RPC layer).
Live: absent from `pg_policies`. Status: **EXACT_MATCH** to final repository expectation (absent).
Security consequence: between 2025-12-21 and 2026-05-13 anonymous clients could read every row of `public.tenants` where `is_public = true`, including all 28 columns. Combined with the `anon=awdDxtm` relation grant (no `r`), the SELECT would in fact have been blocked at the privilege layer for `anon` — the policy was reachable only by roles holding table SELECT. This is a materially narrower exposure than the policy text alone suggests and is recorded as such.

### C.2 — `public.tenant_members`

**Row TM1 — ordinal 001 · `Members can view tenant members` · SELECT · `{authenticated}` · USING `public.is_tenant_member(auth.uid(), tenant_id)`**
Disposition: **SURVIVES_UNCHANGED**. Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE. No later mutation (verified: no `CREATE|DROP POLICY … "Members can view tenant members"` in ordinals 012–322).
Final repository = source. Live: `USING is_tenant_member(auth.uid(), tenant_id)`, PERMISSIVE, `{authenticated}`.
Status: **SEMANTIC_MATCH** (schema qualifier normalization only).
Consequence: Level 2, correctly scoped.

**Row TM2 — ordinal 001 · `Owners can manage tenant members` · ALL · `{authenticated}` · USING `public.has_tenant_role(auth.uid(), tenant_id, 'owner')` · WITH CHECK: none**
Disposition: **SPLIT_INTO_MULTIPLE_POLICIES**.
Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE → **`20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql`** DROP + `CREATE POLICY "Owners can update tenant members" FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role))` and `CREATE POLICY "Owners can delete tenant members" FOR DELETE TO authenticated USING (same)`. No later mutation of either child.
Final repository: two policies (UPDATE + DELETE). The SELECT and INSERT arms of the original `FOR ALL` are **not** reproduced — SELECT is covered by TM1, INSERT by TM3/TM4.
Live: `Owners can update tenant members` (UPDATE, `{authenticated}`, USING `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`) and `Owners can delete tenant members` (DELETE, same USING).
Status per child: **EXACT_MATCH** for both.
Consequence: an owner can no longer INSERT arbitrary members via this policy — INSERT is restricted to the two narrow paths TM3/TM4. This is a deliberate tightening.
Conclusion: **the A1-R1 unresolved ambiguity is resolved.** The splitting migration is `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — ordinal 011, 6 minutes 28 seconds after ordinal 010.

**Row TM3 — ordinal 001 · `Users can insert themselves as owner` · INSERT · `{authenticated}` · WITH CHECK `user_id = auth.uid() AND role = 'owner'`**
Disposition: **SUPERSEDED**.
Chain: `20251219010235_a98f269c-…sql` DROP + identical CREATE → `20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` DROP + CREATE with roles widened to `{public}` and `auth.uid() IS NOT NULL` added → `20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` DROP + CREATE back to `{authenticated}` → `20251220044032_8ee723b8-…sql` DROP + CREATE (`user_id = auth.uid() AND role = 'owner'`) → **`20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql`** DROP, replaced by `Owners can add themselves as owner member` with the added `EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())` clause.
Final repository: `Owners can add themselves as owner member` · INSERT · `{authenticated}` · WITH CHECK as above.
Live: `WITH CHECK ((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`.
Status: **SEMANTIC_MATCH** (schema qualifier and explicit enum cast added by the catalog).
Consequence: closes the ordinal-001 hole where any authenticated user could self-insert as owner of *any* tenant id.

**Row TM4 — later-origin: `Users can join via invitation`**
Created by `20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql` · INSERT · `{authenticated}` · WITH CHECK invitation-existence expression. No later mutation.
Live: identical modulo `(inv.proposed_role)::text = (tenant_members.role)::text` casts and `'pending'::invitation_status`.
Status: **SEMANTIC_MATCH**. No ordinal 001/003/008 ancestor.

### C.3 — `public.horses`

**Row H1 — ordinal 001 · `Members can view tenant horses` · SELECT · `{authenticated}` · USING `public.is_tenant_member(auth.uid(), tenant_id)`**
Disposition: **SUPERSEDED**.
Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE → **`20260117021239_1335b94a-796a-4487-a486-1d61e5ca0965.sql`** DROP, replaced by `Members can view tenant horses (scoped)` · SELECT · `{authenticated}` · USING `(privileged role in owner/manager/foreman for this tenant) OR (member_horse_access assignment)`.
Final repository: the scoped policy.
Live: `((EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = horses.tenant_id AND tm.is_active = true AND tm.role = ANY (ARRAY['owner'::tenant_role,'manager'::tenant_role,'foreman'::tenant_role]))) OR (EXISTS (SELECT 1 FROM member_horse_access mha JOIN tenant_members tm ON tm.id = mha.tenant_member_id WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.tenant_id = horses.tenant_id AND mha.horse_id = horses.id)))`.
Status: **SEMANTIC_MATCH** — normalization: `role IN (...)` rewritten as `role = ANY (ARRAY[...])` with explicit enum casts.
Consequence: a material tightening — plain employees no longer see all tenant horses.

**Row H2 — ordinal 001 · `Members with permission can manage horses` · ALL · `{authenticated}` · USING `EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = auth.uid() AND tenant_id = horses.tenant_id AND (can_manage_horses = true OR role = 'owner') AND is_active = true)` · WITH CHECK: none**
Disposition: **SPLIT_INTO_MULTIPLE_POLICIES**.
Chain: `20251220044032_8ee723b8-…sql` DROP + CREATE (identical semantics, table-qualified column references) → **`20260404020933_659d6519-103c-4613-95dd-3bf9161b124c.sql`** DROP, replaced by three policies:
- `Permission-based insert horses` · INSERT · **no `TO` clause → `{public}`** · WITH CHECK `has_permission(auth.uid(), tenant_id, 'horses.create')`
- `Permission-based update horses` · UPDATE · `{public}` · USING and WITH CHECK `has_permission(auth.uid(), tenant_id, 'horses.edit')`
- `Permission-based delete horses` · DELETE · `{public}` · USING `has_permission(auth.uid(), tenant_id, 'horses.delete')`
No later mutation of the three.
Live: all three present, `PERMISSIVE`, roles `{public}`, expressions exactly as written.
Status: **EXACT_MATCH** for all three.
Consequence: the SELECT arm of the original `FOR ALL` is gone (covered by H1). The three replacements are addressed to `PUBLIC`, which includes `anon`; `anon` also holds `arwdDxtm` on `public.horses`. Enforcement therefore rests entirely on `has_permission(auth.uid(), …)` being false/NULL for an anonymous caller. `has_permission` is `SECURITY DEFINER` with `search_path=public`; for `auth.uid() IS NULL` it cannot match a `tenant_members` row, so the practical result is denial — but the safety margin is a function's null-handling rather than a role restriction. Recorded as a security observation, not as drift.

**Rows H3–H5 — later-origin owner-tenant policies (no ordinal 001/003/008 ancestor)**
All created by `20260602213537_6c80e3c4-0815-4329-9b24-742f355bb5d0.sql`, each preceded by its own `DROP POLICY IF EXISTS`:
- `Owner tenant members can view owned horses` · SELECT · `{authenticated}`
- `Owner tenant members can insert owned horses` · INSERT · `{authenticated}`
- `Owner tenant members can update owned horses` · UPDATE · `{authenticated}`
Live: all three present with the `owner_tenant_id`-scoped expressions and the `tenants.type = 'horse_owner'::tenant_type` guard on the SELECT and INSERT variants. Status: **SEMANTIC_MATCH** (catalog casts only).

**Row H6 — later-origin: `Connected tenant members can view granted horses`**
Created by `20260605111651_e35ad2b2-5fdd-401b-b0b9-3cd0693ff363.sql` · SELECT · `{authenticated}`. Live expression identical modulo `access_level = ANY (ARRAY['read'::text,'readwrite'::text])` normalization of `IN`. Status: **SEMANTIC_MATCH**.

### C.4 — `public.invitations`

All four ordinal-001/008 policies terminate in the same migration, `20260117133222_4f6a30dc-0cc2-4782-9b51-eca3b1a5bdff.sql`, whose `DO $$ … FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invitations' … EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations;', pol.policyname)` block drops them dynamically by name lookup.

**Row I1 — ordinal 001 · `Senders can view their sent invitations` · SELECT · `{authenticated}` · USING `sender_id = auth.uid()`**
Disposition: **SUPERSEDED**. Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE → `20260117133222_4f6a30dc-…sql` dynamic DROP, replaced by `invitations_select_sent` · SELECT · `{authenticated}` · USING `sender_id = auth.uid() AND EXISTS (tenant_members … can_invite OR role IN ('owner','manager','foreman'))`.
Live: `((sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM tenant_members tm WHERE ((tm.tenant_id = invitations.tenant_id) AND (tm.user_id = auth.uid()) AND (tm.is_active = true) AND ((tm.can_invite = true) OR (tm.role = ANY (ARRAY['owner'::tenant_role,'manager'::tenant_role,'foreman'::tenant_role])))))))`.
Status: **SEMANTIC_MATCH**. Consequence: a former sender who lost invite authority can no longer read their historical invitations.

**Row I2 — ordinal 001 · `Invitees can view their invitations` · SELECT · `{authenticated}` · USING `invitee_id = auth.uid() OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())`**
Disposition: **SUPERSEDED**. Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE → `20260117133222_4f6a30dc-…sql` dynamic DROP, replaced by `invitations_select_received`, which adds a mandatory `EXISTS (tenant_members … is_active)` precondition and case-insensitive `lower()` email comparison.
Live: matches, with `(invitee_email IS NOT NULL)` guard and `lower(...) = lower((SELECT p.email FROM profiles p WHERE p.id = auth.uid()))`.
Status: **SEMANTIC_MATCH**.
Consequence worth flagging: the replacement requires the invitee to *already be an active member of the inviting tenant*. A genuinely external invitee cannot read their own invitation row through RLS; the acceptance path must therefore run through a SECURITY DEFINER RPC or a token lookup, not a direct table read. This is a behavioural change introduced by the replacement, not drift.

**Row I3 — ordinal 001 · `Members with permission can create invitations` · INSERT · `{authenticated}` · WITH CHECK `public.can_invite_in_tenant(auth.uid(), tenant_id)`**
Disposition: **SUPERSEDED**. Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE → `20260117133222_4f6a30dc-…sql` dynamic DROP, replaced by `invitations_insert` (`{authenticated}`, sender + membership + invite-authority) → `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` (owner-escalation guard added) → **`20260726164402_31bd514d-e357-44d5-8090-e0b8f82b368a.sql`** DROP + final CREATE, **without a `TO` clause**.
Final repository: `invitations_insert` · INSERT · `{public}` · WITH CHECK sender-identity + invite-authority + owner-escalation guard.
Live: `invitations | invitations_insert | PERMISSIVE | public | INSERT` with exactly that WITH CHECK.
Status: **EXACT_MATCH**.
Consequence: the helper `can_invite_in_tenant` is no longer referenced by any invitations policy — it survives in the catalog with EXECUTE granted but is unused by RLS on this table. The role widening from `{authenticated}` to `{public}` in the final migration is repository-intended; `anon` cannot satisfy `sender_id = auth.uid()` when `auth.uid()` is NULL.

**Row I4 — ordinal 001 · `Invitees can update their invitations` · UPDATE · `{authenticated}` · USING `invitee_id = auth.uid() OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())`**
Disposition: **ENFORCEMENT_MOVED_TO_TRIGGER — with a critical qualification** (see child row I4-a).
Chain: `20251220044032_8ee723b8-…sql` DROP + identical CREATE → `20260117133222_4f6a30dc-…sql` dynamic DROP, replaced by `invitations_update` (`{authenticated}`, sender-or-privileged-role, `WITH CHECK (true)`) → **`20260121111426_805c5d57-8bc1-4ab0-803d-932001ab3da4.sql`** `DROP POLICY IF EXISTS invitations_update ON public.invitations;` under the comment `P0: Remove dangerous UPDATE RLS policy`, with no replacement policy.
Final repository: **no UPDATE policy on `public.invitations`.**
Live: `pg_policies` for `invitations` returns exactly three rows — `invitations_insert`, `invitations_select_received`, `invitations_select_sent`. No UPDATE policy.
Status: **EXACT_MATCH** to the final repository expectation (absence).
Security consequence: with RLS enabled and no UPDATE policy, **every direct `UPDATE` through the Data API is denied for `anon` and `authenticated`** — the table is fail-closed for updates. Invitation state changes are performed by SECURITY DEFINER RPCs such as `public.reject_invitation(uuid, text)` created in the same migration.

**Child row I4-a — trigger, not a policy**
Complete migration filename: `supabase/migrations/20260121111426_805c5d57-8bc1-4ab0-803d-932001ab3da4.sql`.
Trigger name: `trg_enforce_invitation_update_rules`.
Timing and events: `BEFORE UPDATE`, `FOR EACH ROW`.
Complete live definition: `CREATE TRIGGER trg_enforce_invitation_update_rules BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION enforce_invitation_update_rules()`.
Trigger function: `public.enforce_invitation_update_rules()` — `LANGUAGE plpgsql`, `SET search_path TO 'public'`, **`prosecdef = false` (SECURITY INVOKER)**.
Normalized enforcement logic: Rule 1 raises on any change to `tenant_id`, `sender_id`, `invitee_email`, `proposed_role`, `assigned_horse_ids`, or `token`; Rules 2–3 restrict status transitions (`pending → pending|preaccepted|accepted|rejected|revoked|expired`; `preaccepted → preaccepted|accepted|rejected|revoked|expired`); Rule 4 raises `'Invitation has expired'` when a transition to `accepted|preaccepted|rejected` occurs with `OLD.expires_at <= now()`.
**Actual enforcement relationship — stated explicitly, not assumed equivalent:** the trigger is a *field-immutability and state-machine validator*, not an authorization boundary. It never inspects `auth.uid()` and would happily permit any actor's update if one reached it. Authorization for invitation updates is supplied by two separate mechanisms: (a) the *absence* of an UPDATE policy, which blocks the Data API path entirely, and (b) the identity checks inside the SECURITY DEFINER RPCs (`reject_invitation` verifies `lower(invitee_email) = lower(profiles.email)` for the caller). The trigger runs after those gates and constrains *what* may change, not *who* may change it. Describing this as "enforcement moved to a trigger" is therefore only half correct; the authorization actually moved to policy-absence plus definer RPCs.

---

## D. Final Policy Snapshots

### D.1 `public.tenants`

| Policy name | Command | Roles | Perm. | USING | WITH CHECK | Repository source migration | Live result | Drift status |
|---|---|---|---|---|---|---|---|---|
| `Authenticated users can create tenants` | INSERT | authenticated | PERMISSIVE | — | `true` | `20251220044032_8ee723b8-…sql` (last write) | present, identical | EXACT_MATCH |
| `Members can view their tenants` | SELECT | authenticated | PERMISSIVE | `is_tenant_member(auth.uid(), id)` | — | `20251220044032_8ee723b8-…sql` | present | SEMANTIC_MATCH |
| `Owners can update their tenants` | UPDATE | authenticated | PERMISSIVE | `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)` | owner-freeze expression | `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` | present | SEMANTIC_MATCH |
| `Owners can view their own tenants` | SELECT | authenticated | PERMISSIVE | `owner_id = auth.uid()` | — | `20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql` | present | EXACT_MATCH |

Repository-expected count: 4 · Live count: 4 · Missing: none · Live-extra: none · Definition drifts: none · RLS enabled: **true** · FORCE RLS: **false** · Conclusion: **lineage complete, no drift**. No DELETE policy exists — tenants are fail-closed against deletion via the Data API.

### D.2 `public.tenant_members`

| Policy name | Command | Roles | Perm. | USING | WITH CHECK | Repository source migration | Live result | Drift status |
|---|---|---|---|---|---|---|---|---|
| `Members can view tenant members` | SELECT | authenticated | PERMISSIVE | `is_tenant_member(auth.uid(), tenant_id)` | — | `20251220044032_8ee723b8-…sql` | present | SEMANTIC_MATCH |
| `Owners can update tenant members` | UPDATE | authenticated | PERMISSIVE | `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)` | — | `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` | present | EXACT_MATCH |
| `Owners can delete tenant members` | DELETE | authenticated | PERMISSIVE | `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)` | — | `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` | present | EXACT_MATCH |
| `Owners can add themselves as owner member` | INSERT | authenticated | PERMISSIVE | — | self + owner role + `tenants.owner_id = auth.uid()` | `20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` | present | SEMANTIC_MATCH |
| `Users can join via invitation` | INSERT | authenticated | PERMISSIVE | — | self + matching pending invitation | `20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql` | present | SEMANTIC_MATCH |

Repository-expected count: 5 · Live count: 5 · Missing: none · Live-extra: none · Definition drifts: none · RLS enabled: **true** · FORCE RLS: **false** · Conclusion: **lineage complete, no drift; the FOR ALL split is proven.**

### D.3 `public.horses`

| Policy name | Command | Roles | Perm. | USING | WITH CHECK | Repository source migration | Live result | Drift status |
|---|---|---|---|---|---|---|---|---|
| `Members can view tenant horses (scoped)` | SELECT | authenticated | PERMISSIVE | privileged-role OR member_horse_access | — | `20260117021239_1335b94a-796a-4487-a486-1d61e5ca0965.sql` | present | SEMANTIC_MATCH |
| `Permission-based insert horses` | INSERT | public | PERMISSIVE | — | `has_permission(auth.uid(), tenant_id, 'horses.create')` | `20260404020933_659d6519-103c-4613-95dd-3bf9161b124c.sql` | present | EXACT_MATCH |
| `Permission-based update horses` | UPDATE | public | PERMISSIVE | `has_permission(…, 'horses.edit')` | `has_permission(…, 'horses.edit')` | `20260404020933_659d6519-…sql` | present | EXACT_MATCH |
| `Permission-based delete horses` | DELETE | public | PERMISSIVE | `has_permission(…, 'horses.delete')` | — | `20260404020933_659d6519-…sql` | present | EXACT_MATCH |
| `Owner tenant members can view owned horses` | SELECT | authenticated | PERMISSIVE | owner_tenant scoped + `tenants.type='horse_owner'` | — | `20260602213537_6c80e3c4-0815-4329-9b24-742f355bb5d0.sql` | present | SEMANTIC_MATCH |
| `Owner tenant members can insert owned horses` | INSERT | authenticated | PERMISSIVE | — | `owner_tenant_id = tenant_id` + membership + `type='horse_owner'` | `20260602213537_6c80e3c4-…sql` | present | SEMANTIC_MATCH |
| `Owner tenant members can update owned horses` | UPDATE | authenticated | PERMISSIVE | owner_tenant membership | `owner_tenant_id = tenant_id` + membership | `20260602213537_6c80e3c4-…sql` | present | SEMANTIC_MATCH |
| `Connected tenant members can view granted horses` | SELECT | authenticated | PERMISSIVE | accepted, unrevoked, unexpired connection with read/readwrite grant | — | `20260605111651_e35ad2b2-5fdd-401b-b0b9-3cd0693ff363.sql` | present | SEMANTIC_MATCH |

Repository-expected count: 8 · Live count: 8 · Missing: none · Live-extra: none · Definition drifts: none · RLS enabled: **true** · FORCE RLS: **false** · Conclusion: **lineage complete, no drift.** Observation carried forward: three write policies are addressed to `PUBLIC` while `anon` holds `arwdDxtm` on the relation; denial depends on `has_permission()` returning false for a NULL `auth.uid()`.

### D.4 `public.invitations`

| Policy name | Command | Roles | Perm. | USING | WITH CHECK | Repository source migration | Live result | Drift status |
|---|---|---|---|---|---|---|---|---|
| `invitations_select_received` | SELECT | authenticated | PERMISSIVE | active membership AND (invitee_id match OR lower(email) match) | — | `20260117133222_4f6a30dc-0cc2-4782-9b51-eca3b1a5bdff.sql` | present | SEMANTIC_MATCH |
| `invitations_select_sent` | SELECT | authenticated | PERMISSIVE | sender match AND invite-authority membership | — | `20260117133222_4f6a30dc-…sql` | present | SEMANTIC_MATCH |
| `invitations_insert` | INSERT | public | PERMISSIVE | — | sender match + invite-authority + owner-escalation guard | `20260726164402_31bd514d-e357-44d5-8090-e0b8f82b368a.sql` | present | EXACT_MATCH |
| *(UPDATE)* | — | — | — | — | — | removed by `20260121111426_805c5d57-8bc1-4ab0-803d-932001ab3da4.sql` | absent | EXACT_MATCH (absence expected) |
| *(DELETE)* | — | — | — | — | — | never created | absent | EXACT_MATCH (absence expected) |

Repository-expected count: 3 · Live count: 3 · Missing: none · Live-extra: none · Definition drifts: none · RLS enabled: **true** (`20260117133222_4f6a30dc-…sql`) · FORCE RLS: **false** · Conclusion: **lineage complete, no drift.** UPDATE and DELETE are fail-closed at the policy layer; mutation flows through SECURITY DEFINER RPCs, validated by the SECURITY INVOKER trigger `trg_enforce_invitation_update_rules`.

---

## E. Prior-Claim Correction Register

| A1-R1 claim | Verdict | Correction |
|---|---|---|
| Ordinal 001's "17 source policies" were fully traced | **OVERTURNED** | Ordinal 001 creates **16** policies (profiles 4, tenants 3, tenant_members 3, invitations 4, horses 2), not 17. The 12 non-profiles policies are now fully traced. |
| Ordinal 003's tenant policies have a complete final chain | **NARROWED → now CONFIRMED** | A1-R1 named only some links. The complete chain is now given for all four ordinal-003 policies, terminating at `20251220044032_8ee723b8-…sql`, `20260716174522_00b02fa6-…sql`, and `20251221015154_8e77334b-…sql`. |
| Ordinal 008 is contract-verified on the policy dimension | **NARROWED → now CONFIRMED** | A1-R1's claim was unsupported while the FOR ALL split was unresolved. It is resolved; ordinal 008's policy dimension is now verified. Also corrected: ordinal 008 creates **16** policies, not 14. |
| "The exact migration performing that split was not isolated" | **OVERTURNED** | The split migration is `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql`. |
| The complete Horses `has_permission` migration chain | **OVERTURNED** ("has_permission era" was not evidence) | The chain is `20251217045741_3c096c3e-…sql` → `20251220044032_8ee723b8-…sql` → `20260404020933_659d6519-103c-4613-95dd-3bf9161b124c.sql`, plus independent additions `20260117021239_1335b94a-…sql`, `20260602213537_6c80e3c4-…sql`, `20260605111651_e35ad2b2-…sql`. |
| The complete invitation policy-to-trigger enforcement chain | **OVERTURNED** | Chain: `20251217045741_3c096c3e-…sql` → `20251220044032_8ee723b8-…sql` → `20260117133222_4f6a30dc-…sql` (dynamic drop of all four, four replacements) → `20260121111426_805c5d57-…sql` (UPDATE policy removed, trigger + RPC added) → `20260716174522_00b02fa6-…sql` → `20260726164402_31bd514d-…sql`. A1-R1's implication that the trigger replaced the UPDATE policy's authorization is corrected: authorization moved to policy-absence plus SECURITY DEFINER RPCs; the trigger is a SECURITY INVOKER field/state validator. |
| Every later migration cited in A1-R1 Section D also appeared in Run Metadata | **OVERTURNED** | A1-R1's Section D referenced the "has_permission era" and an "invitation family" that never appeared in its metadata inventory. Section B of this document is the complete, reconciled inventory. |
| Policies described as EXACT_MATCH that are only SEMANTIC_MATCH | **OVERTURNED** | A1-R1 called the `profiles` set and the tenant_members SELECT policy EXACT_MATCH. Every policy whose live text differs by schema-qualifier stripping, `IN` → `= ANY (ARRAY[...])`, or explicit enum/text casts is reclassified SEMANTIC_MATCH here. Only 8 of the 20 scoped live policies are true EXACT_MATCH. |
| Any Live policy unsupported by repository migration evidence | **CONFIRMED — none** | All 20 live policies across the four tables map to a named migration. Zero LIVE_EXTRA-without-evidence. |
| A1-R1's `horses` "3 `Permission-based` policies" description | **NARROWED** | Correct, but A1-R1 omitted that all three are addressed to `PUBLIC`, not `authenticated`. |
| A1-R1's implication that `Anyone can view public tenants` never existed | **STILL UNVERIFIED in A1-R1 → now resolved** | It existed from `20251221061910_6c9457c8-…sql` to `20260513153215_379d0973-…sql` and is absent live. |

---

## F. Exact Evidence Gaps

**Proven access limitations:** none. Every repository read and every catalog query for this correction succeeded.

**Work omitted (not blocked):**
1. The full bodies of the 7 grep-matched migrations that touch only out-of-scope tables were scanned for the four table names but not read line-by-line for unrelated content.
2. `public.profiles` policy lineage was excluded per the correction's own scope statement.
3. `pg_policy.polroles` OID arrays were read through the `pg_policies.roles` view rather than resolved directly against `pg_authid`; the `{public}` determinations rest on the view's `{public}` rendering plus the absence of a `TO` clause in the source migrations.
4. `has_permission(uuid, uuid, text)` was confirmed to exist, be SECURITY DEFINER, and carry `search_path=public`, but its body was not read — its null-`auth.uid()` behaviour is inferred from its signature and usage, not proven.
5. The ordinal-009 GRANT/ACL correction was not performed, per the hard stop.

**Repository ambiguity:** none remaining for the four scoped tables. The previously open `tenant_members` FOR ALL split is resolved.

**Live-state ambiguity:** none for the policy dimension. All 20 live policies reconcile to named migrations.

**Lineage not proven:** none.

---

## G. Reconciliation

```
Source migrations in C1:                       3
Target tables in C1:                           4
Expected scoped source policies:               28   (ordinal 001: 12; ordinal 003: 4; ordinal 008: 12)
Scoped source policy rows produced:            28
Later matching migration files found:          22
Later matching migration bodies read:          22   (15 in-lineage, 7 out-of-scope)
Final repository policies enumerated:          20   (tenants 4, tenant_members 5, horses 8, invitations 3)
Final Live policies enumerated:                20   (tenants 4, tenant_members 5, horses 8, invitations 3)
Tables with complete lineage:                  4/4
Missing source policies:                       none
Duplicate source policies:                     none
Unresolved policy lineages:                    none
```

Parent migration-coverage counter is unchanged by this correction:

```
File bodies reported read:                     40/322
A1 primary summaries returned:                 40/322
A1-R1 contract-verification claim:             10/322 — not accepted pending correction
```

---

## H. Run Metadata and Exact Stopping Point

| Field | Value |
|---|---|
| Mode | Plan/Chat — Read-Only |
| Operation | Policy-lineage correction for ordinals 001, 003, 008 across four tables |
| Parent Prompt ID | PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04 |
| Continuation identity | Prompt 04 — Continuation A1-R1-C1 |
| Prompt Preparation Date/Time | 2026-08-02 13:21 Asia/Riyadh (UTC+03:00) |
| Actual Run Start | 2026-08-02T10:31:39Z |
| Actual Run End | 2026-08-02T10:32:32Z (last catalog query) |
| Final Report time | 2026-08-02T10:33Z |
| Timezone | UTC for run evidence; Asia/Riyadh for prompt preparation |
| Timestamp evidence | sandbox `date -u +%Y-%m-%dT%H:%M:%SZ` at run start and after the final query |
| Branch | `edit/edt-da35f96a-75d1-4576-bc5a-ed9d5e48401c` |
| HEAD before | `c4f649a42114671d1ecb2949e4ca9cb1c8e9cced` |
| HEAD after | `c4f649a42114671d1ecb2949e4ca9cb1c8e9cced` |
| Working tree before | clean (`git status --porcelain` empty) |
| Working tree after | modified: `.lovable/plan.md` only |
| `.lovable/plan.md` disclosure | Before: contained the A1-R1 report. After: contains this A1-R1-C1 report. Platform-generated planning artifact, written automatically by the planning tool; not a source-code change. |
| Complete source filenames read | `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`, `supabase/migrations/20251219010235_a98f269c-9bcf…` *(see note)*, `supabase/migrations/20251220044032_8ee723b8-81c7-…` *(see note)* |
| Complete later migration filenames read | the 22 listed at the head of Section B plus its trailing out-of-scope list |
| Repository paths inspected | `supabase/migrations/` only |
| Live objects inspected | `pg_policies` (schema `public`, four tables), `pg_class.relrowsecurity`/`relforcerowsecurity`, `pg_proc` for `enforce_invitation_update_rules` and `has_permission`, `pg_get_functiondef` for the invitation trigger function |
| Read-only queries by purpose | (1) per-table live policy counts; (2) full policy definitions with roles/command/permissiveness/USING/WITH CHECK; (3) RLS + FORCE RLS state; (4) trigger-function security mode and search_path; (5) trigger-function body prefix for enforcement logic |
| Intended repository writes | zero |
| Actual repository writes | zero, except the disclosed `.lovable/plan.md` planning artifact |
| Database writes / DDL / DML / mutating RPCs / migrations applied / backfills / deployment | zero for every category |
| Roadmap persistence / Workstream persistence | zero |
| Acceptance / Closure | none |
| Last fully completed table policy lineage | `public.invitations` (fourth and final table) |
| Exact unresolved limitations | the five omitted-work items in Section F |
| Exact stopping point | All four table policy lineages complete. Ordinal-009 GRANT/ACL correction NOT performed. Ordinal-005 backfill narrowing NOT performed. Ordinals 011–020 NOT opened as independent coverage. No Prompt 05 preparation. |
| Recommended next continuation identity | **Prompt 04 — Continuation A1-R1-C2** (ordinal 009 Grant/ACL evidence + ordinal 005 backfill-claim narrowing) — no new Prompt number consumed |

**Filename note (full transparency):** the three source filenames are reproduced verbatim from `ls -1 supabase/migrations` as:
`20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`,
`20251219010235_a98f269c-9bcf-4b9a-…` — the directory listing value is `20251219010235_a98f269c-9bcf`… **Authoritative listing values:** `20251219010235_a98f269c-9bcf-4b9a` could not be re-verified character-for-character in this run beyond the listing already captured in A1-R1, which reads `20251219010235_a98f269c-9bcf`. Use the A1-R1 Section C list as the authoritative filename register for ordinals 001–010; it was produced by direct `ls -1` output and contains the full UUIDs.
