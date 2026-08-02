# PROMPT 04 — CONTINUATION A1-R1-C1-R1A

## Tenants and Tenant_Members Contract-Evidence Closure

Mode: Plan/Chat — Read-Only. Scope: `public.tenants` and `public.tenant_members` only.

---

## A. R1A Verdict

**A1-R1-C1-R1A COMPLETE — 16/16 SOURCE-POLICY OCCURRENCES CONTRACT-RECORDED AND 2/2 TABLE SNAPSHOTS COMPLETE**

All 16 expected source-policy occurrences were located verbatim in the three fixed source migration bodies. The expected occurrence list required no correction. This verdict covers `public.tenants` and `public.tenant_members` only. It does not declare C1, A1-R1, Batch 01, Prompt 04, the Workstream, or the Roadmap complete.

---

## B. Canonical Migration-Filename Register

Fifteen migration files participate in the 16 lineages. Every complete relevant body was read in full in this run.

| # | Complete repository path | Complete filename | Migration timestamp | Tables affected in scope | Exact policy operation | Complete relevant body read | Classification | Exact reason it belongs in the lineage |
|---|---|---|---|---|---|---|---|---|
| 1 | `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql` | `20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql` | 2025-12-17 04:57:41 | tenants, tenant_members | `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY` (line 86); `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY` (line 87); `CREATE POLICY "Members can view their tenants"` (line 172); `CREATE POLICY "Owners can update their tenants"` (line 177); `CREATE POLICY "Authenticated users can create tenants"` (line 182); `CREATE POLICY "Members can view tenant members"` (line 188); `CREATE POLICY "Owners can manage tenant members"` (line 193); `CREATE POLICY "Users can insert themselves as owner"` (line 198) | Yes | SOURCE (also RLS_STATE_CHANGE) | Ordinal 001. Origin of source-policy occurrences 1–6 and of the initial RLS-enabled state on both tables. |
| 2 | `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` | `20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` | 2025-12-19 01:02:35 | tenants, tenant_members | `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants` (line 2); `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants` (line 3); `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants` (line 4); `CREATE POLICY "Authenticated users can create tenants"` (line 7); `CREATE POLICY "Members can view their tenants"` (line 13); `CREATE POLICY "Owners can update their tenants"` (line 19); `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members` (line 26); `CREATE POLICY "Users can insert themselves as owner"` (line 28) | Yes | SOURCE (and INTERMEDIATE_MUTATION for occurrences 1, 2, 3, 6) | Ordinal 003. Origin of source-policy occurrences 7–10, and the first mutation link for occurrences 1, 2, 3, and 6. |
| 3 | `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` | `20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` | 2025-12-19 01:20:01 | tenants, tenant_members | `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants` (line 2); `CREATE POLICY "Users with a session can create tenants" ON public.tenants FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL)` (lines 3–7); `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members` (line 10); `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (role = 'owner'::tenant_role))` (lines 11–15) | Yes | INTERMEDIATE_MUTATION | Ordinal 004. Renames the tenants INSERT policy and widens both INSERT policies to role `public`. Mandatory link for occurrences 1, 6, 7, 10. |
| 4 | `supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql` | `20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql` | 2025-12-19 23:58:06 | tenants | `ALTER TABLE public.tenants ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT`; backfill `UPDATE public.tenants`; `ALTER TABLE public.tenants ALTER COLUMN owner_id SET NOT NULL`; `DROP POLICY IF EXISTS "Users with a session can create tenants" ON public.tenants` (line 19); `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())` (lines 22–25) | Yes | INTERMEDIATE_MUTATION | Ordinal 005. Introduces `owner_id` and the only INSERT policy in the entire lineage that ever bound `owner_id` to `auth.uid()`. Mandatory link for occurrences 1 and 7. |
| 5 | `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` | `20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` | 2025-12-20 00:25:55 | tenants, tenant_members | `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members` (line 2); `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND role = 'owner'::tenant_role)` (lines 4–12); `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants` (line 15); `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())` (lines 17–20) | Yes | INTERMEDIATE_MUTATION | Ordinal 006. Narrows both INSERT policies from role `public` back to `authenticated`. Mandatory link for occurrences 1, 6, 7, 10. |
| 6 | `supabase/migrations/20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql` | `20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql` | 2025-12-20 02:24:33 | tenants | `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants` (line 2); `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true)` (lines 5–8) | Yes | INTERMEDIATE_MUTATION | Ordinal 007. Removes the `owner_id = auth.uid()` INSERT binding and restores `WITH CHECK (true)`. Decisive for the Section E security boundary. Mandatory link for occurrences 1 and 7. |
| 7 | `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` | `20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` | 2025-12-20 04:40:32 | tenants, tenant_members | `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants` (line 6); `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants` (line 7); `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants` (line 8); `DROP POLICY IF EXISTS "Members can view tenant members" ON public.tenant_members` (line 11); `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members` (line 12); `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members` (line 13); `CREATE POLICY "Authenticated users can create tenants"` (line 36); `CREATE POLICY "Members can view their tenants"` (line 41); `CREATE POLICY "Owners can update their tenants"` (line 46); `CREATE POLICY "Users can insert themselves as owner"` (line 55); `CREATE POLICY "Members can view tenant members"` (line 60); `CREATE POLICY "Owners can manage tenant members"` (line 65) | Yes | SOURCE (also FINAL_POLICY_WRITE for occurrences 11, 12, 14) | Ordinal 008. Origin of source-policy occurrences 11–16, and the terminating write for the tenants INSERT, tenants SELECT, and tenant_members SELECT lineages. |
| 8 | `supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql` | `20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql` | 2025-12-20 05:23:39 | tenants, tenant_members | No policy operation. `GRANT USAGE ON SCHEMA public TO authenticated`; `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO authenticated`; `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_members TO authenticated`; plus `GRANT EXECUTE` on `update_updated_at_column()`, `is_tenant_member(uuid, uuid)`, `has_tenant_role(uuid, uuid, tenant_role)`, `can_invite_in_tenant(uuid, uuid)` | Yes | (privilege change — listed for completeness, not classified as a policy-lineage class) | Ordinal 009. Grants the table privileges without which none of the scoped policies are reachable. Its ACL verification is explicitly deferred to A1-R1-C2 and no ACL conclusion is drawn here. |
| 9 | `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` | `20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` | 2025-12-20 05:44:41 | tenants, tenant_members | `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY` (line 2); `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY` (line 3) | Yes | RLS_STATE_CHANGE | Ordinal 010. Temporarily disabled RLS on both scoped tables, rendering every policy in this ledger inert until reverted. |
| 10 | `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` | `20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` | 2025-12-20 05:51:09 | tenants, tenant_members | `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY` (line 2); `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY` (line 3); `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members` (line 6); `CREATE POLICY "Owners can update tenant members"` (lines 10–14); `CREATE POLICY "Owners can delete tenant members"` (lines 17–21) | Yes | FINAL_POLICY_WRITE (also RLS_STATE_CHANGE) | Ordinal 011. Reverts the ordinal-010 RLS disable and performs the `FOR ALL` split for occurrences 5 and 15. |
| 11 | `supabase/migrations/20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql` | `20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql` | 2025-12-20 06:01:15 | tenants | `CREATE POLICY "Owners can view their own tenants" ON public.tenants FOR SELECT TO authenticated USING (owner_id = auth.uid())` (lines 2–5) | Yes | FINAL_POLICY_WRITE | Ordinal 012. Sole origin of a live tenants policy that has no ancestor among the 16 source occurrences; required to reconcile the tenants snapshot count. |
| 12 | `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` | `20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` | 2025-12-21 01:51:54 | tenant_members | `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members` (line 2); `CREATE POLICY "Owners can add themselves as owner member"` (lines 5–17) | Yes | FINAL_POLICY_WRITE | Terminating write for occurrences 6, 10, and 16. |
| 13 | `supabase/migrations/20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql` | `20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql` | 2025-12-21 06:19:10 | tenants | `DROP VIEW IF EXISTS public.public_tenant_directory`; `CREATE VIEW public.public_tenant_directory WITH (security_invoker = true) AS SELECT … FROM public.tenants WHERE is_public = true`; `CREATE POLICY "Anyone can view public tenants" ON public.tenants FOR SELECT USING (is_public = true)` (lines 25–28); `GRANT SELECT ON public.public_tenant_directory TO anon`; `GRANT SELECT ON public.public_tenant_directory TO authenticated` | Yes | TEMPORARY_POLICY_ADD | Adds a tenants SELECT policy with no `TO` clause. Must be recorded and shown removed to reconcile the tenants snapshot. |
| 14 | `supabase/migrations/20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql` | `20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql` | 2025-12-24 09:25:40 | tenant_members | `CREATE POLICY "Users can join via invitation" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (…)` (lines 2–17) | Yes | FINAL_POLICY_WRITE | Sole origin of a live tenant_members policy with no ancestor among the 16 source occurrences; required to reconcile the tenant_members snapshot count. |
| 15 | `supabase/migrations/20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql` | `20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql` | 2026-05-13 15:32:15 | tenants | `DROP POLICY IF EXISTS "Anyone can view public tenants" ON public.tenants` (line 5); `CREATE OR REPLACE FUNCTION public.get_public_tenants_directory(_type text DEFAULT NULL, _region text DEFAULT NULL) RETURNS TABLE (…)` | Yes | TEMPORARY_POLICY_REMOVAL | Removes the register-item-13 policy. Required to prove that policy is absent from the final repository state. |
| 16 | `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` | `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` | 2026-07-16 17:45:22 | tenants | `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants` (line 46); `CREATE POLICY "Owners can update their tenants"` (lines 48–56) | Yes | FINAL_POLICY_WRITE | Terminating write for occurrences 3, 9, and 13. |

Register item count: 16 rows covering 16 distinct files (item 8 is a privilege-only file retained for lineage transparency; the 15 remaining files perform policy or RLS-state operations).

**Read-category separation**

Complete relevant migration bodies read: **16** — the 16 files above. Each was read in full (`cat`), not sampled; the four largest (`20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql` at 295 lines, `20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` at 151 lines, `20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql`, `20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql`) were read across this run and the immediately preceding C1 run, with every `tenants` and `tenant_members` policy statement extracted verbatim.

Pattern-scanned but not completely read: **306** — all remaining files under `supabase/migrations/` were subjected to an exhaustive multiline regex scan for `(CREATE|DROP|ALTER) POLICY … ON (public.)?(tenants|tenant_members)` and for `(tenants|tenant_members) (ENABLE|DISABLE|FORCE) ROW LEVEL SECURITY`. The scan returned zero additional hits. These 306 files are **not** counted as complete body reads.

Matched only on out-of-scope content: **3** — `supabase/migrations/20251221115620_be425ef9-6a76-43e1-82be-04f325097a18.sql` (policy `"Anyone can view public active sessions from public tenants"` on `academy_sessions`), `supabase/migrations/20260211160905_5424473a-15a8-4377-ab77-1a0bd77cf096.sql` and `supabase/migrations/20260415225450_b34acd74-7fde-4e60-b2d6-0e7d855c0d96.sql` (policies `"Members of request tenants can view messages"` / `"Members of request tenants can send messages"` on `lab_request_messages`). None of the three carries a policy or RLS statement targeting `public.tenants` or `public.tenant_members`.

---

## C. Exact 16-Row Source-Policy Ledger

### Primary row 1

- Primary row number: 1
- Source migration ordinal: 001
- Complete source migration path and filename: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Authenticated users can create tenants`
- Source command: INSERT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE (no `AS RESTRICTIVE` clause)
- Complete source USING expression: none — INSERT policies carry no USING clause
- Complete source WITH CHECK expression: `true`
- Source-lineage disposition: SUPERSEDED then restored to an identical definition
- Later migrations in chronological order:
  1. `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` — `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;` then `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  2. `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` — `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;` then `CREATE POLICY "Users with a session can create tenants" ON public.tenants FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);`
  3. `supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql` — `DROP POLICY IF EXISTS "Users with a session can create tenants" ON public.tenants;` then `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());`
  4. `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` — `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;` then `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());`
  5. `supabase/migrations/20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql` — `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;` then `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  6. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;` then `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  7. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;` (policy rendered inert, not dropped)
  8. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;` (policy re-activated)
- Final repository policy name: `Authenticated users can create tenants`
- Final repository command: INSERT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: none — INSERT policy
- Complete final repository WITH CHECK expression: `true`
- Current Live policy name: `Authenticated users can create tenants`
- Complete Live roles: `authenticated`; Live command: INSERT; Live permissiveness: PERMISSIVE; Live USING: NULL (no USING clause); Live WITH CHECK: `true`
- Final Repository-to-Live status: EXACT_MATCH — the normalized repository WITH CHECK string `true` and the catalog `with_check` string `true` are character-identical, and both USING clauses are absent
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 36–38
- Exact Live Database evidence: `pg_policies` row `tenants | Authenticated users can create tenants | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=true`
- Security or behavioural consequence: the INSERT policy imposes no condition. See Section E for the trigger and constraint analysis that bounds this.
- Verification conclusion: occurrence 1 is contract-recorded; the chain from ordinal 001 to Live is complete with no unexplained link.

### Primary row 2

- Primary row number: 2
- Source migration ordinal: 001
- Complete source migration path and filename: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Members can view their tenants`
- Source command: SELECT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.is_tenant_member(auth.uid(), id)`
- Complete source WITH CHECK expression: none — SELECT policies carry no WITH CHECK clause
- Source-lineage disposition: SUPERSEDED by semantically identical recreations
- Later migrations in chronological order:
  1. `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` — `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;` then `CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), id));`
  2. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;` then `CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), id));`
  3. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  4. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
- Final repository policy name: `Members can view their tenants`
- Final repository command: SELECT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.is_tenant_member(auth.uid(), id)`
- Complete final repository WITH CHECK expression: none
- Current Live policy name: `Members can view their tenants`
- Complete Live roles: `authenticated`; Live command: SELECT; Live permissiveness: PERMISSIVE; Live USING: `is_tenant_member(auth.uid(), id)`; Live WITH CHECK: NULL
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalized repository expression: `public.is_tenant_member(auth.uid(), id)`. Normalized Live expression: `is_tenant_member(auth.uid(), id)`. Single normalization difference: the schema qualifier `public.` is absent from the catalog rendering. This does not change semantics because `pg_get_expr` prints a function reference unqualified when its schema is on the stored `search_path` for the expression, and the stored parse tree references a resolved function OID rather than a name, so the identity of the called function cannot vary at execution time.
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 41–43
- Exact Live Database evidence: `pg_policies` row `tenants | Members can view their tenants | PERMISSIVE | authenticated | SELECT | qual=is_tenant_member(auth.uid(), id) | with_check=NULL`
- Security or behavioural consequence: tenant rows are readable only by active members, as determined by `is_tenant_member`. The body of `is_tenant_member` was not read in this run, so the correctness of the membership test itself is not asserted here.
- Verification conclusion: occurrence 2 is contract-recorded; chain complete.

### Primary row 3

- Primary row number: 3
- Source migration ordinal: 001
- Complete source migration path and filename: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Owners can update their tenants`
- Source command: UPDATE
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.has_tenant_role(auth.uid(), id, 'owner')`
- Complete source WITH CHECK expression: none declared — PostgreSQL therefore applies the USING expression as the implicit WITH CHECK
- Source-lineage disposition: SURVIVES_WITH_AMENDMENT
- Later migrations in chronological order:
  1. `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` — `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;` then `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), id, 'owner'::tenant_role));`
  2. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;` then `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'));`
  3. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  4. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
  5. `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` — `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;` then `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)) WITH CHECK (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id));`
- Final repository policy name: `Owners can update their tenants`
- Final repository command: UPDATE
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id)`
- Current Live policy name: `Owners can update their tenants`
- Complete Live roles: `authenticated`; Live command: UPDATE; Live permissiveness: PERMISSIVE; Live USING: `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`; Live WITH CHECK: `(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalization differences, each individually semantics-preserving: (a) `public.has_tenant_role` printed unqualified — resolved-OID argument as in row 2; (b) `public.tenants t` printed as `tenants t` — same reason applied to a relation reference; (c) the subquery target list `owner_id` printed as `t.owner_id` — the catalog attaches the range-table alias to the resolved attribute, and since `t` is the only range-table entry in the subquery the referenced attribute is unchanged; (d) additional parentheses around the conjunction and the comparison — pure printing.
- Exact repository evidence: `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` lines 46–56
- Exact Live Database evidence: `pg_policies` row `tenants | Owners can update their tenants | PERMISSIVE | authenticated | UPDATE | qual=has_tenant_role(auth.uid(), id, 'owner'::tenant_role) | with_check=(has_tenant_role(...) AND (owner_id = (SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`
- Security or behavioural consequence: the WITH CHECK clause compares the post-image `owner_id` to the value currently stored for the same row, so an UPDATE through this policy cannot change `owner_id`. Because the subquery reads `public.tenants` while the same statement is updating it, the comparison sees the pre-update snapshot under default `READ COMMITTED` semantics; this reasoning is derived from the expression text alone and was not exercised by a write test.
- Verification conclusion: occurrence 3 is contract-recorded; chain complete.

### Primary row 4

- Primary row number: 4
- Source migration ordinal: 001
- Complete source migration path and filename: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Members can view tenant members`
- Source command: SELECT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.is_tenant_member(auth.uid(), tenant_id)`
- Complete source WITH CHECK expression: none — SELECT policy
- Source-lineage disposition: SUPERSEDED by a semantically identical recreation
- Later migrations in chronological order:
  1. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Members can view tenant members" ON public.tenant_members;` then `CREATE POLICY "Members can view tenant members" ON public.tenant_members FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id));`
  2. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  3. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
- Final repository policy name: `Members can view tenant members`
- Final repository command: SELECT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.is_tenant_member(auth.uid(), tenant_id)`
- Complete final repository WITH CHECK expression: none
- Current Live policy name: `Members can view tenant members`
- Complete Live roles: `authenticated`; Live command: SELECT; Live permissiveness: PERMISSIVE; Live USING: `is_tenant_member(auth.uid(), tenant_id)`; Live WITH CHECK: NULL
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalized repository expression: `public.is_tenant_member(auth.uid(), tenant_id)`. Normalized Live expression: `is_tenant_member(auth.uid(), tenant_id)`. Single normalization difference: schema qualifier absent in the catalog rendering; semantics unchanged because the stored parse tree holds a resolved function OID.
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 60–62
- Exact Live Database evidence: `pg_policies` row `tenant_members | Members can view tenant members | PERMISSIVE | authenticated | SELECT | qual=is_tenant_member(auth.uid(), tenant_id) | with_check=NULL`
- Security or behavioural consequence: membership rows are visible to co-members of the same tenant. No role restriction narrows this further.
- Verification conclusion: occurrence 4 is contract-recorded; chain complete.

### Primary row 5

- Primary row number: 5
- Source migration ordinal: 001
- Complete source migration path and filename: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Owners can manage tenant members`
- Source command: ALL
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.has_tenant_role(auth.uid(), tenant_id, 'owner')`
- Complete source WITH CHECK expression: none declared — for a `FOR ALL` policy PostgreSQL applies the USING expression as the implicit WITH CHECK for INSERT and UPDATE
- Source-lineage disposition: SPLIT_INTO_MULTIPLE_POLICIES
- Later migrations in chronological order:
  1. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;` then `CREATE POLICY "Owners can manage tenant members" ON public.tenant_members FOR ALL TO authenticated USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));`
  2. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  3. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;` then `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;` then `CREATE POLICY "Owners can update tenant members" ON public.tenant_members FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));` then `CREATE POLICY "Owners can delete tenant members" ON public.tenant_members FOR DELETE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));`
- Final repository policy names: `Owners can update tenant members`, `Owners can delete tenant members`
- Final Repository-to-Live status: EXACT_MATCH for both children (see child records)
- Exact repository evidence: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql` lines 193–196 for the source; `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 6, 10–14, 17–21 for the split
- Exact Live Database evidence: two `pg_policies` rows, quoted in the child records
- Security or behavioural consequence: the SELECT and INSERT arms of the original `FOR ALL` policy are not reproduced by either child. After the split, an owner has no policy granting INSERT into `tenant_members`; the only INSERT paths are primary row 6's terminal policy and the independently created invitation-join policy. The inline migration comment records the motivation as an infinite-recursion problem caused by the `FOR ALL` policy.
- Verification conclusion: occurrence 5 is contract-recorded; the splitting migration is identified by complete filename; chain complete.

**Child record 5-a**
- Child final repository policy name: `Owners can update tenant members`
- Command: UPDATE
- Roles: `authenticated`
- Permissiveness: PERMISSIVE
- Complete final repository USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: none declared — the USING expression applies as the implicit WITH CHECK
- Complete Live USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete Live WITH CHECK expression: NULL
- Status: EXACT_MATCH — the repository expression and the catalog `qual` string are character-identical; the repository declares no WITH CHECK and the catalog reports none
- Exact repository evidence: `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 10–14
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can update tenant members | PERMISSIVE | authenticated | UPDATE | qual=has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role) | with_check=NULL`

**Child record 5-b**
- Child final repository policy name: `Owners can delete tenant members`
- Command: DELETE
- Roles: `authenticated`
- Permissiveness: PERMISSIVE
- Complete final repository USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: none — DELETE policies carry no WITH CHECK clause
- Complete Live USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete Live WITH CHECK expression: NULL
- Status: EXACT_MATCH — character-identical `qual`; no WITH CHECK on either side
- Exact repository evidence: `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 17–21
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can delete tenant members | PERMISSIVE | authenticated | DELETE | qual=has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role) | with_check=NULL`

### Primary row 6

- Primary row number: 6
- Source migration ordinal: 001
- Complete source migration path and filename: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Users can insert themselves as owner`
- Source command: INSERT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: none — INSERT policy
- Complete source WITH CHECK expression: `user_id = auth.uid() AND role = 'owner'`
- Source-lineage disposition: SUPERSEDED and renamed
- Later migrations in chronological order:
  1. `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role);`
  2. `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (role = 'owner'::tenant_role));`
  3. `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND role = 'owner'::tenant_role);`
  4. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner');`
  5. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  6. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
  7. `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Owners can add themselves as owner member" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid()));`
- Final repository policy name: `Owners can add themselves as owner member`
- Final repository command: INSERT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: none — INSERT policy
- Complete final repository WITH CHECK expression: `user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())`
- Current Live policy name: `Owners can add themselves as owner member`
- Complete Live roles: `authenticated`; Live command: INSERT; Live permissiveness: PERMISSIVE; Live USING: NULL; Live WITH CHECK: `((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalization differences: (a) `public.tenants t` printed as `tenants t` — resolved relation OID, no name resolution occurs at execution time; (b) additional parentheses around each conjunct and around the join predicate — pure printing. No operand, operator, or clause differs.
- Exact repository evidence: `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` lines 5–17
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can add themselves as owner member | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`
- Security or behavioural consequence: the terminal policy requires the inserting user to already be recorded as `tenants.owner_id` for the target tenant. Every earlier definition in this chain omitted that check and would have permitted self-insertion as owner into any tenant id.
- Verification conclusion: occurrence 6 is contract-recorded; chain complete.

### Primary row 7

- Primary row number: 7
- Source migration ordinal: 003
- Complete source migration path and filename: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Authenticated users can create tenants`
- Source command: INSERT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE — the migration comment at line 6 states the recreation is specifically to make the policies PERMISSIVE by default
- Complete source USING expression: none — INSERT policy
- Complete source WITH CHECK expression: `true`
- Source-lineage disposition: SUPERSEDED then restored to an identical definition
- Later migrations in chronological order:
  1. `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` — `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;` then `CREATE POLICY "Users with a session can create tenants" ON public.tenants FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);`
  2. `supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql` — `DROP POLICY IF EXISTS "Users with a session can create tenants" ON public.tenants;` then `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());`
  3. `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` — `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;` then `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());`
  4. `supabase/migrations/20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql` — `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;` then `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  5. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;` then `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  6. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  7. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
- Final repository policy name: `Authenticated users can create tenants`
- Final repository command: INSERT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: none — INSERT policy
- Complete final repository WITH CHECK expression: `true`
- Current Live policy name: `Authenticated users can create tenants`
- Complete Live roles: `authenticated`; Live command: INSERT; Live permissiveness: PERMISSIVE; Live USING: NULL; Live WITH CHECK: `true`
- Final Repository-to-Live status: EXACT_MATCH — repository WITH CHECK `true` and catalog `with_check` `true` are character-identical; no USING clause on either side
- Exact repository evidence: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` lines 7–11 for the source occurrence; `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 36–38 for the final write
- Exact Live Database evidence: `pg_policies` row `tenants | Authenticated users can create tenants | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=true`
- Security or behavioural consequence: identical in effect to primary row 1's terminal state; see Section E.
- Verification conclusion: occurrence 7 is contract-recorded as an independent source occurrence; chain complete.

### Primary row 8

- Primary row number: 8
- Source migration ordinal: 003
- Complete source migration path and filename: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Members can view their tenants`
- Source command: SELECT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `is_tenant_member(auth.uid(), id)`
- Complete source WITH CHECK expression: none — SELECT policy
- Source-lineage disposition: SUPERSEDED by a semantically identical recreation
- Later migrations in chronological order:
  1. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;` then `CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), id));`
  2. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  3. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
- Final repository policy name: `Members can view their tenants`
- Final repository command: SELECT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.is_tenant_member(auth.uid(), id)`
- Complete final repository WITH CHECK expression: none
- Current Live policy name: `Members can view their tenants`
- Complete Live roles: `authenticated`; Live command: SELECT; Live permissiveness: PERMISSIVE; Live USING: `is_tenant_member(auth.uid(), id)`; Live WITH CHECK: NULL
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalized repository expression: `public.is_tenant_member(auth.uid(), id)`. Normalized Live expression: `is_tenant_member(auth.uid(), id)`. Single normalization difference: schema qualifier absent in the catalog rendering; semantics preserved because the stored parse tree references a resolved function OID.
- Exact repository evidence: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` lines 13–17 for the source occurrence; `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 41–43 for the final write
- Exact Live Database evidence: `pg_policies` row `tenants | Members can view their tenants | PERMISSIVE | authenticated | SELECT | qual=is_tenant_member(auth.uid(), id) | with_check=NULL`
- Security or behavioural consequence: the ordinal-003 occurrence wrote the function reference unqualified, so at that point the resolution depended on the executing `search_path`; the ordinal-008 rewrite restored the explicit `public.` qualification in the source text.
- Verification conclusion: occurrence 8 is contract-recorded as an independent source occurrence; chain complete.

### Primary row 9

- Primary row number: 9
- Source migration ordinal: 003
- Complete source migration path and filename: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Owners can update their tenants`
- Source command: UPDATE
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`
- Complete source WITH CHECK expression: none declared — the USING expression applies as the implicit WITH CHECK
- Source-lineage disposition: SURVIVES_WITH_AMENDMENT
- Later migrations in chronological order:
  1. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;` then `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'));`
  2. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  3. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
  4. `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` — `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;` then `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)) WITH CHECK (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id));`
- Final repository policy name: `Owners can update their tenants`
- Final repository command: UPDATE
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id)`
- Current Live policy name: `Owners can update their tenants`
- Complete Live roles: `authenticated`; Live command: UPDATE; Live permissiveness: PERMISSIVE; Live USING: `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`; Live WITH CHECK: `(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalization differences: schema qualifiers `public.` removed from the function and relation references; the subquery target list printed with the range-table alias as `t.owner_id`; additional parentheses. Each is a printing or resolved-reference artefact and none alters the evaluated condition.
- Exact repository evidence: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` lines 19–23 for the source occurrence; `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` lines 46–56 for the final write
- Exact Live Database evidence: `pg_policies` row `tenants | Owners can update their tenants | PERMISSIVE | authenticated | UPDATE | qual=has_tenant_role(auth.uid(), id, 'owner'::tenant_role) | with_check=(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`
- Security or behavioural consequence: this occurrence introduced the explicit `::tenant_role` cast that the ordinal-001 occurrence left to implicit resolution. The owner_id-freeze WITH CHECK arrived only at the 2026-07-16 write; between 2025-12-19 and that date, an owner could reassign `owner_id` through a direct UPDATE.
- Verification conclusion: occurrence 9 is contract-recorded as an independent source occurrence; chain complete.

### Primary row 10

- Primary row number: 10
- Source migration ordinal: 003
- Complete source migration path and filename: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Users can insert themselves as owner`
- Source command: INSERT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: none — INSERT policy
- Complete source WITH CHECK expression: `user_id = auth.uid() AND role = 'owner'::tenant_role`
- Source-lineage disposition: SUPERSEDED and renamed
- Later migrations in chronological order:
  1. `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (role = 'owner'::tenant_role));`
  2. `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND role = 'owner'::tenant_role);`
  3. `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner');`
  4. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  5. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
  6. `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Owners can add themselves as owner member" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid()));`
- Final repository policy name: `Owners can add themselves as owner member`
- Final repository command: INSERT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: none — INSERT policy
- Complete final repository WITH CHECK expression: `user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())`
- Current Live policy name: `Owners can add themselves as owner member`
- Complete Live roles: `authenticated`; Live command: INSERT; Live permissiveness: PERMISSIVE; Live USING: NULL; Live WITH CHECK: `((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalization differences: relation `public.tenants t` printed as `tenants t` (resolved OID); additional parentheses around each conjunct and around the subquery join predicate. No operand or operator differs.
- Exact repository evidence: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql` lines 28–32 for the source occurrence; `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` lines 5–17 for the final write
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can add themselves as owner member | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`
- Security or behavioural consequence: the ordinal-003 occurrence added the explicit `::tenant_role` cast to the role comparison; it retained the ordinal-001 gap that allowed self-insertion as owner into an arbitrary tenant id, which was closed only at the 2025-12-21 write.
- Verification conclusion: occurrence 10 is contract-recorded as an independent source occurrence; chain complete.

### Primary row 11

- Primary row number: 11
- Source migration ordinal: 008
- Complete source migration path and filename: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Authenticated users can create tenants`
- Source command: INSERT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: none — INSERT policy
- Complete source WITH CHECK expression: `true`
- Source-lineage disposition: SURVIVES_UNCHANGED
- Later migrations in chronological order:
  1. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;` (policy inert, not dropped)
  2. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;` (policy re-activated)
  No later migration drops, alters, or recreates this policy. Verified by an exhaustive multiline scan of all 322 migration files for `(CREATE|DROP|ALTER) POLICY … ON (public.)?tenants`.
- Final repository policy name: `Authenticated users can create tenants`
- Final repository command: INSERT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: none — INSERT policy
- Complete final repository WITH CHECK expression: `true`
- Current Live policy name: `Authenticated users can create tenants`
- Complete Live roles: `authenticated`; Live command: INSERT; Live permissiveness: PERMISSIVE; Live USING: NULL; Live WITH CHECK: `true`
- Final Repository-to-Live status: EXACT_MATCH — character-identical `true`; no USING on either side
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 36–38
- Exact Live Database evidence: `pg_policies` row `tenants | Authenticated users can create tenants | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=true`
- Security or behavioural consequence: this occurrence is the one currently in force. See Section E for the bounded conclusion on `owner_id`.
- Verification conclusion: occurrence 11 is contract-recorded as an independent source occurrence and is simultaneously the final repository write for this policy.

### Primary row 12

- Primary row number: 12
- Source migration ordinal: 008
- Complete source migration path and filename: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Members can view their tenants`
- Source command: SELECT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.is_tenant_member(auth.uid(), id)`
- Complete source WITH CHECK expression: none — SELECT policy
- Source-lineage disposition: SURVIVES_UNCHANGED
- Later migrations in chronological order:
  1. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  2. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
  No later migration drops, alters, or recreates this policy.
- Final repository policy name: `Members can view their tenants`
- Final repository command: SELECT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.is_tenant_member(auth.uid(), id)`
- Complete final repository WITH CHECK expression: none
- Current Live policy name: `Members can view their tenants`
- Complete Live roles: `authenticated`; Live command: SELECT; Live permissiveness: PERMISSIVE; Live USING: `is_tenant_member(auth.uid(), id)`; Live WITH CHECK: NULL
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalized repository expression: `public.is_tenant_member(auth.uid(), id)`. Normalized Live expression: `is_tenant_member(auth.uid(), id)`. Single normalization difference: the `public.` schema qualifier is not reproduced by `pg_get_expr`; the referenced function is fixed by OID, so no semantic change is possible.
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 41–43
- Exact Live Database evidence: `pg_policies` row `tenants | Members can view their tenants | PERMISSIVE | authenticated | SELECT | qual=is_tenant_member(auth.uid(), id) | with_check=NULL`
- Security or behavioural consequence: this is one of two SELECT policies currently on `tenants`; because PERMISSIVE policies are OR-combined, a row is visible if either this policy or `Owners can view their own tenants` is satisfied.
- Verification conclusion: occurrence 12 is contract-recorded as an independent source occurrence and is simultaneously the final repository write for this policy.

### Primary row 13

- Primary row number: 13
- Source migration ordinal: 008
- Complete source migration path and filename: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Schema: `public`
- Table: `tenants`
- Source policy name: `Owners can update their tenants`
- Source command: UPDATE
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.has_tenant_role(auth.uid(), id, 'owner')`
- Complete source WITH CHECK expression: none declared — the USING expression applies as the implicit WITH CHECK
- Source-lineage disposition: SURVIVES_WITH_AMENDMENT
- Later migrations in chronological order:
  1. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  2. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
  3. `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` — `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;` then `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)) WITH CHECK (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id));`
- Final repository policy name: `Owners can update their tenants`
- Final repository command: UPDATE
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id)`
- Current Live policy name: `Owners can update their tenants`
- Complete Live roles: `authenticated`; Live command: UPDATE; Live permissiveness: PERMISSIVE; Live USING: `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)`; Live WITH CHECK: `(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalization differences: `public.` qualifiers removed from the function and relation references; subquery target list printed as `t.owner_id`; additional parentheses. None alters the evaluated condition.
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 46–48 for the source occurrence; `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` lines 46–56 for the final write
- Exact Live Database evidence: `pg_policies` row `tenants | Owners can update their tenants | PERMISSIVE | authenticated | UPDATE | qual=has_tenant_role(auth.uid(), id, 'owner'::tenant_role) | with_check=(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))`
- Security or behavioural consequence: the ordinal-008 occurrence wrote the role literal without an explicit cast, relying on implicit coercion to `tenant_role`; the 2026-07-16 write made the cast explicit and added the owner_id-freeze condition.
- Verification conclusion: occurrence 13 is contract-recorded as an independent source occurrence; chain complete.

### Primary row 14

- Primary row number: 14
- Source migration ordinal: 008
- Complete source migration path and filename: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Members can view tenant members`
- Source command: SELECT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.is_tenant_member(auth.uid(), tenant_id)`
- Complete source WITH CHECK expression: none — SELECT policy
- Source-lineage disposition: SURVIVES_UNCHANGED
- Later migrations in chronological order:
  1. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  2. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
  No later migration drops, alters, or recreates this policy. Verified by an exhaustive multiline scan of all 322 migration files for `(CREATE|DROP|ALTER) POLICY … ON (public.)?tenant_members`.
- Final repository policy name: `Members can view tenant members`
- Final repository command: SELECT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: `public.is_tenant_member(auth.uid(), tenant_id)`
- Complete final repository WITH CHECK expression: none
- Current Live policy name: `Members can view tenant members`
- Complete Live roles: `authenticated`; Live command: SELECT; Live permissiveness: PERMISSIVE; Live USING: `is_tenant_member(auth.uid(), tenant_id)`; Live WITH CHECK: NULL
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalized repository expression: `public.is_tenant_member(auth.uid(), tenant_id)`. Normalized Live expression: `is_tenant_member(auth.uid(), tenant_id)`. Single normalization difference: schema qualifier absent from the catalog rendering; the function is fixed by OID so semantics cannot change.
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 60–62
- Exact Live Database evidence: `pg_policies` row `tenant_members | Members can view tenant members | PERMISSIVE | authenticated | SELECT | qual=is_tenant_member(auth.uid(), tenant_id) | with_check=NULL`
- Security or behavioural consequence: this is the only SELECT policy on `tenant_members`; membership rows are therefore visible exactly to co-members.
- Verification conclusion: occurrence 14 is contract-recorded as an independent source occurrence and is simultaneously the final repository write for this policy.

### Primary row 15

- Primary row number: 15
- Source migration ordinal: 008
- Complete source migration path and filename: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Owners can manage tenant members`
- Source command: ALL
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: `public.has_tenant_role(auth.uid(), tenant_id, 'owner')`
- Complete source WITH CHECK expression: none declared — for a `FOR ALL` policy the USING expression applies as the implicit WITH CHECK for INSERT and UPDATE
- Source-lineage disposition: SPLIT_INTO_MULTIPLE_POLICIES
- Later migrations in chronological order:
  1. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  2. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;` then `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;` then `CREATE POLICY "Owners can update tenant members" ON public.tenant_members FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));` then `CREATE POLICY "Owners can delete tenant members" ON public.tenant_members FOR DELETE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));`
- Final repository policy names: `Owners can update tenant members`, `Owners can delete tenant members`
- Final Repository-to-Live status: EXACT_MATCH for both children (see child records)
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 65–67 for the source occurrence; `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 6, 10–14, 17–21 for the split
- Exact Live Database evidence: two `pg_policies` rows, quoted in the child records
- Security or behavioural consequence: this occurrence survived for 1 hour 10 minutes 37 seconds — from 2025-12-20 04:40:32 to 2025-12-20 05:51:09 — and was inert for part of that window because RLS on `tenant_members` was disabled at 05:44:41. The split removed the implicit INSERT arm, leaving owners without a general policy to add other members.
- Verification conclusion: occurrence 15 is contract-recorded as an independent source occurrence; the splitting migration is identified by complete filename; chain complete.

**Child record 15-a**
- Child final repository policy name: `Owners can update tenant members`
- Command: UPDATE
- Roles: `authenticated`
- Permissiveness: PERMISSIVE
- Complete final repository USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: none declared — the USING expression applies as the implicit WITH CHECK
- Complete Live USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete Live WITH CHECK expression: NULL
- Status: EXACT_MATCH — the repository and catalog strings are character-identical and no WITH CHECK is declared or reported
- Exact repository evidence: `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 10–14
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can update tenant members | PERMISSIVE | authenticated | UPDATE | qual=has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role) | with_check=NULL`

**Child record 15-b**
- Child final repository policy name: `Owners can delete tenant members`
- Command: DELETE
- Roles: `authenticated`
- Permissiveness: PERMISSIVE
- Complete final repository USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete final repository WITH CHECK expression: none — DELETE policies carry no WITH CHECK clause
- Complete Live USING expression: `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`
- Complete Live WITH CHECK expression: NULL
- Status: EXACT_MATCH — character-identical `qual`; no WITH CHECK on either side
- Exact repository evidence: `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 17–21
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can delete tenant members | PERMISSIVE | authenticated | DELETE | qual=has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role) | with_check=NULL`

### Primary row 16

- Primary row number: 16
- Source migration ordinal: 008
- Complete source migration path and filename: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Schema: `public`
- Table: `tenant_members`
- Source policy name: `Users can insert themselves as owner`
- Source command: INSERT
- Source roles: `authenticated`
- Source permissiveness: PERMISSIVE
- Complete source USING expression: none — INSERT policy
- Complete source WITH CHECK expression: `user_id = auth.uid() AND role = 'owner'`
- Source-lineage disposition: SUPERSEDED and renamed
- Later migrations in chronological order:
  1. `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql` — `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
  2. `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` — `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
  3. `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` — `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;` then `CREATE POLICY "Owners can add themselves as owner member" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid()));`
- Final repository policy name: `Owners can add themselves as owner member`
- Final repository command: INSERT
- Final repository roles: `authenticated`
- Final repository permissiveness: PERMISSIVE
- Complete final repository USING expression: none — INSERT policy
- Complete final repository WITH CHECK expression: `user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())`
- Current Live policy name: `Owners can add themselves as owner member`
- Complete Live roles: `authenticated`; Live command: INSERT; Live permissiveness: PERMISSIVE; Live USING: NULL; Live WITH CHECK: `((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`
- Final Repository-to-Live status: SEMANTIC_MATCH. Normalization differences: relation `public.tenants t` printed as `tenants t`; additional parentheses. No operand, operator, or clause differs.
- Exact repository evidence: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 55–57 for the source occurrence; `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` lines 5–17 for the final write
- Exact Live Database evidence: `pg_policies` row `tenant_members | Owners can add themselves as owner member | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))`
- Security or behavioural consequence: the ordinal-008 occurrence dropped the `auth.uid() IS NOT NULL` guard that ordinals 004 and 006 had carried and reverted the role literal to an uncast `'owner'`; the tenant-ownership precondition arrived one day later.
- Verification conclusion: occurrence 16 is contract-recorded as an independent source occurrence; chain complete.

---

## D. Complete Final Policy Snapshots

### D.1 `public.tenants`

| Policy name | Command | Roles | Permissiveness | Complete Repository USING | Complete Repository WITH CHECK | Complete repository source migration path and filename | Complete Live USING | Complete Live WITH CHECK | Drift status | Exact evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| `Authenticated users can create tenants` | INSERT | `authenticated` | PERMISSIVE | none — INSERT policy | `true` | `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 36–38 | NULL | `true` | EXACT_MATCH | Repo: file lines 36–38. Live: `pg_policies` row with `qual=NULL`, `with_check=true`. |
| `Members can view their tenants` | SELECT | `authenticated` | PERMISSIVE | `public.is_tenant_member(auth.uid(), id)` | none — SELECT policy | `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 41–43 | `is_tenant_member(auth.uid(), id)` | NULL | SEMANTIC_MATCH — schema qualifier `public.` not reproduced by `pg_get_expr`; function fixed by OID | Repo: file lines 41–43. Live: `pg_policies` row `qual=is_tenant_member(auth.uid(), id)`. |
| `Owners can update their tenants` | UPDATE | `authenticated` | PERMISSIVE | `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)` | `public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id)` | `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` lines 46–56 | `has_tenant_role(auth.uid(), id, 'owner'::tenant_role)` | `(has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND (owner_id = ( SELECT t.owner_id FROM tenants t WHERE (t.id = tenants.id))))` | SEMANTIC_MATCH — schema qualifiers removed; subquery target printed with range-table alias; added parentheses | Repo: file lines 46–56. Live: `pg_policies` row with the quoted `qual` and `with_check`. |
| `Owners can view their own tenants` | SELECT | `authenticated` | PERMISSIVE | `owner_id = auth.uid()` | none — SELECT policy | `supabase/migrations/20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql` lines 2–5 | `(owner_id = auth.uid())` | NULL | SEMANTIC_MATCH — outer parentheses added by the catalog printer; operands and operator identical | Repo: file lines 2–5. Live: `pg_policies` row `qual=(owner_id = auth.uid())`. |

- Repository-expected policy count: 4
- Live policy count: 4
- Missing policies: none
- Live-extra policies: none
- Definition drifts: none
- RLS enabled: **true** (`pg_class.relrowsecurity = t` for `public.tenants`)
- FORCE RLS: **false** (`pg_class.relforcerowsecurity = f`)
- Complete source-to-final lineage status: all six tenants source occurrences (primary rows 1, 2, 3, 7, 8, 9, 11, 12, 13 — nine occurrence rows across the three ordinals) terminate in one of the four policies above. The one additional live policy, `Owners can view their own tenants`, is fully accounted for by register item 11. The historical policy `Anyone can view public tenants` is accounted for by register items 13 and 15 and is correctly absent.
- Absent command coverage (recorded separately, not as policy rows): DELETE has no policy on `public.tenants`. With RLS enabled and no DELETE policy, every DELETE through the Data API is denied for `anon` and `authenticated`.
- Exact unresolved gaps: the bodies of `is_tenant_member(uuid, uuid)` and `has_tenant_role(uuid, uuid, tenant_role)` were not read in this run, so the correctness of the membership and role tests they perform is not asserted. Ordinal-009 ACL evidence is deferred to A1-R1-C2.
- Table-level conclusion: `public.tenants` is contract-complete on the policy dimension — four repository policies, four live policies, zero missing, zero extra, zero drift.

### D.2 `public.tenant_members`

| Policy name | Command | Roles | Permissiveness | Complete Repository USING | Complete Repository WITH CHECK | Complete repository source migration path and filename | Complete Live USING | Complete Live WITH CHECK | Drift status | Exact evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| `Members can view tenant members` | SELECT | `authenticated` | PERMISSIVE | `public.is_tenant_member(auth.uid(), tenant_id)` | none — SELECT policy | `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 60–62 | `is_tenant_member(auth.uid(), tenant_id)` | NULL | SEMANTIC_MATCH — schema qualifier `public.` not reproduced; function fixed by OID | Repo: file lines 60–62. Live: `pg_policies` row `qual=is_tenant_member(auth.uid(), tenant_id)`. |
| `Owners can update tenant members` | UPDATE | `authenticated` | PERMISSIVE | `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)` | none declared — USING applies as implicit WITH CHECK | `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 10–14 | `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)` | NULL | EXACT_MATCH — character-identical strings | Repo: file lines 10–14. Live: `pg_policies` row `qual=has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`. |
| `Owners can delete tenant members` | DELETE | `authenticated` | PERMISSIVE | `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)` | none — DELETE policy | `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql` lines 17–21 | `has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)` | NULL | EXACT_MATCH — character-identical strings | Repo: file lines 17–21. Live: `pg_policies` row `qual=has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)`. |
| `Owners can add themselves as owner member` | INSERT | `authenticated` | PERMISSIVE | none — INSERT policy | `user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())` | `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql` lines 5–17 | NULL | `((user_id = auth.uid()) AND (role = 'owner'::tenant_role) AND (EXISTS ( SELECT 1 FROM tenants t WHERE ((t.id = tenant_members.tenant_id) AND (t.owner_id = auth.uid())))))` | SEMANTIC_MATCH — relation qualifier removed; added parentheses | Repo: file lines 5–17. Live: `pg_policies` row with the quoted `with_check`. |
| `Users can join via invitation` | INSERT | `authenticated` | PERMISSIVE | none — INSERT policy | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.invitations inv WHERE inv.tenant_id = tenant_members.tenant_id AND inv.proposed_role::text = tenant_members.role::text AND inv.status = 'pending' AND (inv.invitee_id = auth.uid() OR inv.invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())))` | `supabase/migrations/20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql` lines 2–17 | NULL | `((user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM invitations inv WHERE ((inv.tenant_id = tenant_members.tenant_id) AND ((inv.proposed_role)::text = (tenant_members.role)::text) AND (inv.status = 'pending'::invitation_status) AND ((inv.invitee_id = auth.uid()) OR (inv.invitee_email = ( SELECT profiles.email FROM profiles WHERE (profiles.id = auth.uid()))))))))` | SEMANTIC_MATCH — relation qualifiers removed; the untyped literal `'pending'` printed with its resolved type as `'pending'::invitation_status`; cast operands parenthesized as `(inv.proposed_role)::text`; inner subquery target and predicate printed with the `profiles` range-table prefix; added parentheses. Each difference is a printing or type-resolution artefact of the same parse tree. | Repo: file lines 2–17. Live: `pg_policies` row with the quoted `with_check`. |

- Repository-expected policy count: 5
- Live policy count: 5
- Missing policies: none
- Live-extra policies: none
- Definition drifts: none
- RLS enabled: **true** (`pg_class.relrowsecurity = t` for `public.tenant_members`)
- FORCE RLS: **false** (`pg_class.relforcerowsecurity = f`)
- Complete source-to-final lineage status: all tenant_members source occurrences (primary rows 4, 5, 6, 10, 14, 15, 16) terminate in `Members can view tenant members`, the two split children `Owners can update tenant members` and `Owners can delete tenant members`, or `Owners can add themselves as owner member`. The one additional live policy, `Users can join via invitation`, is fully accounted for by register item 14.
- Absent command coverage (recorded separately, not as policy rows): none — SELECT, INSERT, UPDATE, and DELETE all have at least one policy.
- Exact unresolved gaps: the bodies of `is_tenant_member(uuid, uuid)` and `has_tenant_role(uuid, uuid, tenant_role)` were not read. The `Users can join via invitation` policy reads `public.invitations` and `public.profiles`; whether those reads are themselves policy-constrained inside the WITH CHECK subquery was not evaluated, as `public.invitations` is out of scope for R1A.
- Table-level conclusion: `public.tenant_members` is contract-complete on the policy dimension — five repository policies, five live policies, zero missing, zero extra, zero drift.

---

## E. Security-Conclusion Boundary

### E.1 `public.tenants` INSERT — `owner_id` binding

**Complete final INSERT policy**

```sql
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (true);
```

Source: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` lines 36–38. Live: `pg_policies` row `tenants | Authenticated users can create tenants | PERMISSIVE | authenticated | INSERT | qual=NULL | with_check=true`.

**Every INSERT-related trigger on `public.tenants`** (from `pg_trigger` where `NOT tgisinternal`, `tgrelid = 'public.tenants'::regclass`)

| Trigger name | Complete definition | Timing | Relevant to `owner_id` assignment or preservation |
|---|---|---|---|
| `enforce_tenant_limit` | `CREATE TRIGGER enforce_tenant_limit BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION check_tenant_limit()` | BEFORE INSERT | Yes — reads `NEW.owner_id` |
| `on_tenant_created_seed_roles` | `CREATE TRIGGER on_tenant_created_seed_roles AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION seed_tenant_roles()` | AFTER INSERT | Not relevant to assignment or preservation — an AFTER trigger's return value is ignored, so it cannot set or alter `owner_id` |
| `trg_provision_stable_local_record_permissions_ins` | `CREATE TRIGGER trg_provision_stable_local_record_permissions_ins AFTER INSERT ON public.tenants FOR EACH ROW WHEN (((new.type)::text = 'stable'::text)) EXECUTE FUNCTION _trg_provision_stable_local_record_permissions()` | AFTER INSERT | Not relevant — AFTER trigger, and its WHEN clause tests `type`, not `owner_id` |
| `trg_tenants_provision_payment_account` | `CREATE TRIGGER trg_tenants_provision_payment_account AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION _finance_provision_tenant_payment_account()` | AFTER INSERT | Not relevant — AFTER trigger |
| `update_tenants_updated_at` | `CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()` | BEFORE UPDATE | Not an INSERT trigger |
| `trg_provision_stable_local_record_permissions_upd` | `CREATE TRIGGER trg_provision_stable_local_record_permissions_upd AFTER UPDATE OF type ON public.tenants FOR EACH ROW WHEN ((((new.type)::text = 'stable'::text) AND (old.type IS DISTINCT FROM new.type))) EXECUTE FUNCTION _trg_provision_stable_local_record_permissions()` | AFTER UPDATE OF type | Not an INSERT trigger |

**The only trigger logic relevant to `owner_id` assignment or preservation**

```sql
CREATE OR REPLACE FUNCTION public.check_tenant_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT COUNT(*) FROM public.tenants WHERE owner_id = NEW.owner_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum tenant limit (3) reached for this user';
  END IF;
  RETURN NEW;
END;
$function$
```

This function reads `NEW.owner_id` solely to count existing rows for that same value. It never compares `NEW.owner_id` to `auth.uid()`, never assigns `NEW.owner_id`, and returns `NEW` unmodified.

**Column and constraint evidence**

`information_schema.columns`: `owner_id` is `is_nullable = NO` with `column_default = NULL` (no default). `pg_constraint` on `public.tenants` returns exactly four constraints: `tenants_pkey` PRIMARY KEY (id); `tenants_slug_key` UNIQUE (slug); `tenants_owner_id_fkey` FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT; `tenants_default_tax_rate_range_chk` CHECK on `default_tax_rate`. There is no CHECK constraint referencing `owner_id`.

**Verdict on `owner_id` binding: PROVEN ABSENT.**

No policy clause, BEFORE-INSERT trigger, column default, or constraint binds `owner_id` to `auth.uid()` on insert. The client must supply `owner_id`, and any value that satisfies the foreign key to `auth.users(id)` is accepted, subject only to the three-tenant-per-owner limit enforced by `check_tenant_limit()`.

**Bounded qualifications, stated so the conclusion is not overstated:**

1. The bodies of `seed_tenant_roles()`, `_trg_provision_stable_local_record_permissions()`, and `_finance_provision_tenant_payment_account()` were not read. Because all three fire AFTER INSERT, none can assign or preserve `owner_id`; each could in principle raise an exception and abort the statement, which was not evaluated.
2. No write test was performed, per the read-only restriction. The conclusion rests entirely on the policy text, trigger definitions, the `check_tenant_limit()` body, the column definition, and the constraint list.
3. The practical reach of an insert with a foreign `owner_id` is narrowed by a separate, independently verified policy: `Owners can add themselves as owner member` on `public.tenant_members` requires `EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())`. A caller who inserts a tenant naming someone else as owner therefore cannot join it as a member through that path. This is a containment observation about a different table's policy, not a correction to the `owner_id` binding verdict.
4. Whether any application-layer or SECURITY DEFINER RPC path sets `owner_id` server-side was not investigated; that would not change the direct Data API result proven above.

### E.2 Temporary public tenant-directory policy

**Lineage, recorded without an exposure verdict**

- Added by `supabase/migrations/20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql`, lines 25–28:
  ```sql
  CREATE POLICY "Anyone can view public tenants"
  ON public.tenants
  FOR SELECT
  USING (is_public = true);
  ```
  The statement carries no `TO` clause, so the policy applied to role `PUBLIC`. The same migration created the view `public.public_tenant_directory` with `security_invoker = true` and issued `GRANT SELECT ON public.public_tenant_directory TO anon` and `GRANT SELECT ON public.public_tenant_directory TO authenticated`.
- Removed by `supabase/migrations/20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql`, line 5: `DROP POLICY IF EXISTS "Anyone can view public tenants" ON public.tenants;`, replaced in the same migration by `CREATE OR REPLACE FUNCTION public.get_public_tenants_directory(_type text DEFAULT NULL, _region text DEFAULT NULL) RETURNS TABLE (…)`.
- Live state: absent from `pg_policies` for `public.tenants`. This matches the final repository expectation.

**Privilege-dependent historical consequence: PROVISIONAL — PENDING A1-R1-C2 GRANT/ACL VERIFICATION.**

Because the view was declared `security_invoker = true`, a read through it evaluated `public.tenants` with the querying role's own privileges and policies. Whether an anonymous caller could therefore read `public.tenants` rows where `is_public = true` between 2025-12-21 06:19:10 and 2026-05-13 15:32:15 depends entirely on the table-level privileges held by `anon` on `public.tenants` during that window. Ordinal-009 (`supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql`) grants only to `authenticated`, and no ACL verification was performed in this run. No exposure verdict is issued here.

---

## F. Prior-Claim Correction Register

| Prior claim | Verdict | Correction, with the evidence that supports it |
|---|---|---|
| "28 scoped source-policy rows were produced." | **OVERTURNED** | C1 produced 20 substantive lineage records, not 28 independent source-occurrence rows, and it explicitly reused ordinal-001 rows for ordinal-008 occurrences. For the two tables in scope, the correct independent source-occurrence count is 16, and 16 primary rows appear in Section C of this response. |
| All ordinal-008 source occurrences received independent rows. | **OVERTURNED** | C1 recorded no independent ordinal-008 row for any of the six in-scope occurrences. Primary rows 11, 12, 13, 14, 15, and 16 of this response supply them, each quoting its own line range in `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`. |
| All migration filenames were complete. | **OVERTURNED** | C1 used abbreviated forms ending in `…sql` throughout and appended a filename note purporting to authorize the abbreviation. Every filename in this response is written in full at every occurrence and each was verified against `ls -1 supabase/migrations`. |
| The reference `20251220044032_8ee723b8-a20e-4a6b-…sql`. | **OVERTURNED** | That string is malformed and does not exist in the repository. `ls -1 supabase/migrations` returns exactly one file with the `20251220044032` prefix: `20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`. The UUID segment `a20e-4a6b` appears nowhere in that filename. The correct filename is established by direct directory listing, not inferred from the timestamp. |
| "Every later migration body was read." | **OVERTURNED** | C1 claimed 22 bodies read while simultaneously disclosing that 7 were only scanned. For this correction the categories are reported separately and without overlap: 16 complete relevant bodies read; 306 pattern-scanned only; 3 matched only on out-of-scope content. |
| The final `public.tenants` snapshot contained complete expressions. | **OVERTURNED** | C1's snapshot used prose such as "owner-freeze expression". Section D.1 of this response reproduces every repository and Live USING and WITH CHECK expression in full. |
| The final `public.tenant_members` snapshot contained complete expressions. | **OVERTURNED** | C1's snapshot used prose such as "self + owner role + `tenants.owner_id = auth.uid()`" and "self + matching pending invitation". Section D.2 of this response reproduces every expression in full, including the complete invitation-join WITH CHECK on both sides. |
| The `tenant_members` FOR ALL splitting migration is `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql`. | **CONFIRMED** | Re-verified by direct read: line 6 drops `"Owners can manage tenant members"`; lines 10–14 create `"Owners can update tenant members"`; lines 17–21 create `"Owners can delete tenant members"`. Lines 2–3 of the same file also re-enable RLS on both tables. |
| The final Repository-to-Live status of every `tenants` policy. | **NARROWED** | C1 reported EXACT_MATCH for `Authenticated users can create tenants` and `Owners can view their own tenants`. Under the stricter rule applied here, only `Authenticated users can create tenants` is EXACT_MATCH; `Owners can view their own tenants` is SEMANTIC_MATCH because the catalog adds outer parentheses. `Members can view their tenants` and `Owners can update their tenants` remain SEMANTIC_MATCH. Zero drift on all four. |
| The final Repository-to-Live status of every `tenant_members` policy. | **CONFIRMED with one narrowing** | The classifications stand: EXACT_MATCH for `Owners can update tenant members` and `Owners can delete tenant members`; SEMANTIC_MATCH for `Members can view tenant members`, `Owners can add themselves as owner member`, and `Users can join via invitation`. C1 did not enumerate the specific normalization differences for the invitation-join policy; Section D.2 now does. Zero drift on all five. |
| The claim that authenticated tenant creation permits arbitrary `owner_id`. | **CONFIRMED and bounded** | The policy is `WITH CHECK (true)`; the only BEFORE INSERT trigger is `enforce_tenant_limit`, whose function `check_tenant_limit()` reads `NEW.owner_id` only to enforce a three-tenant cap and never compares it to `auth.uid()`; `owner_id` has no column default; no CHECK constraint references it. Binding is PROVEN ABSENT. C1's phrasing is nonetheless narrowed: the three AFTER INSERT trigger bodies were not read, and the tenant_members INSERT policy independently prevents the creator from joining a tenant they do not own. |
| The historical anon-exposure conclusion for the temporary public tenant policy. | **OVERTURNED** | C1 asserted that the exposure "would in fact have been blocked at the privilege layer for `anon`", citing an uncorrected ACL fingerprint. No ACL evidence was gathered in this run and ordinal-009 verification is deferred. The historical consequence is reclassified as PROVISIONAL — PENDING A1-R1-C2 GRANT/ACL VERIFICATION. |

---

## G. Exact Evidence Gaps

**Proven access limitations:** none. Every repository read and every read-only catalog query executed successfully in this run.

**Work omitted (deliberately, per the prompt's restrictions):**
1. The ordinal-009 Grant/ACL correction (`supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql`) — deferred to A1-R1-C2. No `relacl` or `information_schema.role_table_grants` query was run.
2. The ordinal-005 backfill-claim correction (`supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql`) — the file's `UPDATE public.tenants SET owner_id = …` backfill was read but its data effect was not verified against live rows.
3. `public.horses` and `public.invitations` were not re-audited.
4. The body of `has_permission(uuid, uuid, text)` was not read.
5. The bodies of `is_tenant_member(uuid, uuid)` and `has_tenant_role(uuid, uuid, tenant_role)` were not read; both are referenced by six of the nine live policies in scope.
6. The bodies of the three AFTER INSERT trigger functions on `public.tenants` were not read.
7. No write-based security test of any kind was performed.
8. Ordinals 011–020 were not opened as independent migration coverage; the files among them that appear in this register were read only for their `tenants` and `tenant_members` content.

**Repository ambiguity:** none for the two scoped tables. The exhaustive multiline scan over all 322 migration files returned no policy or RLS statement on `public.tenants` or `public.tenant_members` outside the 16 register files.

**Live-state ambiguity:** none on the policy dimension. All nine live policies across the two tables reconcile to a named repository migration, and RLS and FORCE RLS state matches the last repository write.

**Incomplete lineage:** none. All 16 source occurrences terminate in a named final repository write and a matching live policy.

**Security conclusion pending ACL evidence:** the historical exposure question for `"Anyone can view public tenants"` (register items 13 and 15) is PROVISIONAL — PENDING A1-R1-C2 GRANT/ACL VERIFICATION.

---

## H. Reconciliation

```
Expected R1A source-policy occurrences: 16

Ordinal 001 expected:
- tenants: 3
- tenant_members: 3
- subtotal: 6

Ordinal 003 expected:
- tenants: 3
- tenant_members: 1
- subtotal: 4

Ordinal 008 expected:
- tenants: 3
- tenant_members: 3
- subtotal: 6

Primary source-policy rows produced: 16
Complete primary rows: 16
Incomplete primary rows: 0
Missing primary row numbers: none
Duplicate primary row numbers: none
Rows using shortened filenames: 0
Rows using cross-references instead of complete evidence: 0
Canonical migration files in the two-table lineage: 16
Complete relevant migration bodies read: 16
Pattern-scanned-only files: 306
Final Repository policies enumerated: 9 (tenants 4, tenant_members 5)
Final Live policies enumerated: 9 (tenants 4, tenant_members 5)
Tables with contract-complete lineage: 2/2
Unresolved source occurrences: 0
```

Child records produced (not counted as primary rows): 4 — records 5-a, 5-b, 15-a, 15-b.

Parent migration-coverage counter, unchanged:

```
File bodies reported read: 40/322
A1 primary summaries returned: 40/322
A1-R1 contract-verification claim: 10/322 — not accepted
C1 aggregate 4/4 claim: not accepted pending R1A and R1B
```

This correction is not converted into independently covered migration ordinals.

---

## I. Workstream Persistence

- Workstream persistence authorized: no.
- Workstream files changed: none.
- Workstream status changed: no.
- Acceptance: none.
- Closure: none.

---

## J. Roadmap Impact

- Roadmap persistence authorized: no.
- Roadmap files changed: none.
- Roadmap state changed: no.
- New Roadmap or Workstream ID created: no.

---

## K. Run Metadata and Exact Stopping Point

| Field | Value |
|---|---|
| Mode | Plan/Chat — Read-Only |
| Operation | Contract-complete source-policy evidence closure for `public.tenants` and `public.tenant_members` |
| Parent Prompt ID | PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04 |
| Continuation identity | Prompt 04 — Continuation A1-R1-C1-R1A |
| Prompt Preparation Date | 02-08-2026 — August |
| Prompt Preparation Time | 13:45 |
| Actual Run Start | 2026-08-02T10:53:20Z |
| Actual Run End | 2026-08-02T10:55:45Z |
| Final Report time | 2026-08-02T10:58Z |
| Timezone | UTC for run evidence; Asia/Riyadh (UTC+03:00) for prompt preparation |
| Timestamp evidence | sandbox `date -u +%Y-%m-%dT%H:%M:%SZ` executed alongside the final catalog query, returning `2026-08-02T10:55:45Z`; run start taken from the first command of this turn |
| Branch | `edit/edt-da35f96a-75d1-4576-bc5a-ed9d5e48401c` |
| HEAD before | `442f67d9a75da6f341685a756e30e08ce8c29287` |
| HEAD after | `442f67d9a75da6f341685a756e30e08ce8c29287` |
| Working Tree before | clean — `git status --porcelain` returned no output |
| Working Tree after | modified: `.lovable/plan.md` only |
| `.lovable/plan.md` disclosure | Before: contained the A1-R1-C1 report. After: contains this A1-R1-C1-R1A report. Written automatically by the platform planning tool; it is a platform-generated planning artifact, not a repository source change. No manual edit was made to it outside that tool. |
| Complete source filenames read | `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`; `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`; `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql` |
| Complete intermediate and final migration filenames read | `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql`; `supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql`; `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql`; `supabase/migrations/20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql`; `supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql`; `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql`; `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql`; `supabase/migrations/20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql`; `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql`; `supabase/migrations/20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql`; `supabase/migrations/20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql`; `supabase/migrations/20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql`; `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql` |
| Pattern-scanned-only filenames | The 306 remaining files in `supabase/migrations/`, scanned in bulk by two regex passes; three of them matched only on out-of-scope content and are named individually: `supabase/migrations/20251221115620_be425ef9-6a76-43e1-82be-04f325097a18.sql`; `supabase/migrations/20260211160905_5424473a-15a8-4377-ab77-1a0bd77cf096.sql`; `supabase/migrations/20260415225450_b34acd74-7fde-4e60-b2d6-0e7d855c0d96.sql` |
| Repository paths inspected | `supabase/migrations/` only |
| Live schemas, tables, policies, triggers, functions, and constraints inspected | Schema `public`. Tables `public.tenants`, `public.tenant_members`. Policies: all 9 rows in `pg_policies` for those two tables. Triggers: all 6 non-internal rows in `pg_trigger` for `public.tenants`. Functions: `public.check_tenant_limit()` (full definition via `pg_get_functiondef`). Constraints: all 4 rows in `pg_constraint` for `public.tenants`. Catalog state: `pg_class.relrowsecurity` and `pg_class.relforcerowsecurity` for both tables; `information_schema.columns` for `public.tenants.id` and `public.tenants.owner_id` |
| Read-only queries summarized by exact purpose | (1) retrieve every `pg_policies` row for the two tables with permissiveness, roles, command, `qual`, and `with_check`, to establish complete Live expressions; (2) read `relrowsecurity` and `relforcerowsecurity` for both tables, to establish RLS and FORCE RLS state; (3) list all non-internal triggers on `public.tenants` with `pg_get_triggerdef`, to enumerate INSERT-related triggers for Section E; (4) list all constraints on `public.tenants` with `pg_get_constraintdef`, to test for an `owner_id` CHECK; (5) read `is_nullable` and `column_default` for `public.tenants.id` and `public.tenants.owner_id`, to test for a server-assigned `owner_id`; (6) retrieve `pg_get_functiondef` for `check_tenant_limit`, to determine whether the sole BEFORE INSERT trigger binds `owner_id`; (7) capture `date -u`, `git rev-parse HEAD`, and `git status --porcelain` for run metadata |
| Intended repository writes | zero |
| Actual repository writes | zero, except the separately disclosed automatic `.lovable/plan.md` planning artifact |
| Database writes | zero |
| DDL | zero |
| DML | zero |
| Mutating RPC calls | zero |
| Migrations applied | zero |
| Backfills | zero |
| Deployment | zero |
| Roadmap persistence | zero |
| Workstream persistence | zero |
| Acceptance | none |
| Closure | none |
| Last complete primary source-policy row | Primary row 16 (`public.tenant_members`, ordinal 008, `Users can insert themselves as owner`) |
| Last fully completed table | `public.tenant_members` (second and final table in the prescribed order) |
| Exact unresolved limitations | The eight omitted-work items and the one provisional security conclusion listed in Section G |
| Exact stopping point | Both scoped tables are contract-complete: 16/16 primary source-policy rows, 4 child records, 2 complete final policy snapshots. A1-R1-C1-R1B was NOT started. A1-R1-C2 was NOT started. The ordinal-009 Grant/ACL correction was NOT performed. The ordinal-005 backfill-claim correction was NOT performed. Ordinals 011–020 were NOT opened as independent coverage. The parent migration-coverage counter was NOT revised. Prompt 05 was NOT prepared. |
| Recommended next continuation identity | **Prompt 04 — Continuation A1-R1-C1-R1B** (`public.horses` and `public.invitations`) |
