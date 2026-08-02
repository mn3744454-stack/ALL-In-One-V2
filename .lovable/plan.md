# A1-R1-C1-R1A-R1 — Final Consistency and owner_id Security-Boundary Correction

Parent Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04
Continuation identity: Prompt 04 — Continuation A1-R1-C1-R1A-R1
Mode: Plan/Chat — Read-Only

---

## A. R1A-R1 Verdict

**A1-R1-C1-R1A-R1 COMPLETE — R1A CONSISTENCY AND OWNER_ID SECURITY BOUNDARY CORRECTED**

Supportability of the earlier aggregate verdict:

**A1-R1-C1-R1A COMPLETE — 16/16 SOURCE-POLICY OCCURRENCES CONTRACT-RECORDED AND 2/2 TABLE SNAPSHOTS COMPLETE** is now supportable, subject to the corrections recorded in Sections E, F, G of this record.

No declaration is made for C1, A1-R1, Batch 01, Prompt 04, the Workstream, or the Roadmap.

---

## B. Corrected Canonical Migration-Filename Register

Classification verified independently this run by two regular-expression scans across all 322 repository migration files:

1. Scan 1 — `(CREATE|DROP|ALTER)\s+POLICY[^;]*ON\s+(public\.)?(tenants|tenant_members)\b` → 14 files.
2. Scan 2 — `ALTER TABLE\s+(public\.)?(tenants|tenant_members)[^;]*ROW LEVEL SECURITY` → 3 files, of which 2 are already in Scan 1.
3. Union → **15 policy/RLS lineage files**. The prompt-supplied 15-file list is confirmed by independent evidence, not accepted on assertion.

### B.1 Policy/RLS lineage files (15)

**L01**
- Complete repository path: `supabase/migrations/20251217045741_3c096c3e-fb65-4eb3-ac8c-bf0ef95977ee.sql`
- Timestamp: 20251217045741
- Scoped tables: `public.tenants`, `public.tenant_members`
- Exact scoped operations:
  - `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), id));`
  - `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'));`
  - `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  - `CREATE POLICY "Members can view tenant members" ON public.tenant_members FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id));`
  - `CREATE POLICY "Owners can manage tenant members" ON public.tenant_members FOR ALL TO authenticated USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));`
  - `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner');`
- Relevant object names: `public.tenants`, `public.tenant_members`, `public.is_tenant_member(uuid, uuid)`, `public.has_tenant_role(uuid, uuid, tenant_role)`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — origin
- Reason: creates both tables, enables RLS on both, and creates all six original scoped policies.

**L02**
- Path: `supabase/migrations/20251219010235_a98f269c-7bcf-4f66-b9a9-998bce3a3dff.sql`
- Timestamp: 20251219010235
- Scoped tables: `public.tenants`, `public.tenant_members`
- Operations:
  - `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;`
  - `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;`
  - `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;`
  - `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  - `CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (is_tenant_member(auth.uid(), id));`
  - `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), id, 'owner'::tenant_role));`
  - `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;`
  - `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role);`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — permissive recreation
- Reason: drops and recreates three tenants policies and one tenant_members policy.

**L03**
- Path: `supabase/migrations/20251219012001_41618063-8587-4e32-8b47-8f1ca31375d3.sql`
- Timestamp: 20251219012001
- Scoped tables: `public.tenants`, `public.tenant_members`
- Operations:
  - `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;`
  - `CREATE POLICY "Users with a session can create tenants" ON public.tenants FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);`
  - `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;`
  - `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (role = 'owner'::tenant_role));`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — role widening to `public`
- Reason: replaces the INSERT policies on both tables and widens their grantee role.

**L04**
- Path: `supabase/migrations/20251219235806_751634a9-a440-4068-a28d-79c91316e3ef.sql`
- Timestamp: 20251219235806
- Scoped table: `public.tenants`
- Operations:
  - `ALTER TABLE public.tenants ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;`
  - `UPDATE public.tenants t SET owner_id = (SELECT tm.user_id FROM public.tenant_members tm WHERE tm.tenant_id = t.id AND tm.role = 'owner' LIMIT 1);`
  - `ALTER TABLE public.tenants ALTER COLUMN owner_id SET NOT NULL;`
  - `DROP POLICY IF EXISTS "Users with a session can create tenants" ON public.tenants;`
  - `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — owner_id introduction and transient identity binding
- Reason: introduces `owner_id` and, for the first time, binds the INSERT policy to `auth.uid()`.

**L05**
- Path: `supabase/migrations/20251220002555_310f4d0c-eea7-4677-8f62-9ad4585d55e9.sql`
- Timestamp: 20251220002555
- Scoped tables: `public.tenant_members`, `public.tenants`
- Operations:
  - `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;`
  - `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND role = 'owner'::tenant_role);`
  - `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;`
  - `CREATE POLICY "Users can create tenants as owner" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — narrowing back to `authenticated`
- Reason: recreates both INSERT policies scoped to the `authenticated` role.

**L06**
- Path: `supabase/migrations/20251220022433_a78c85a1-e442-4cba-8e01-961073fc710f.sql`
- Timestamp: 20251220022433
- Scoped table: `public.tenants`
- Operations:
  - `DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;`
  - `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — removal of owner identity binding
- Reason: this is the exact migration that removes `owner_id = auth.uid()` from the INSERT path and is decisive for the Section 7 conclusion.

**L07**
- Path: `supabase/migrations/20251220044032_8ee723b8-bcf8-41a8-81c7-f5f3d3252917.sql`
- Timestamp: 20251220044032
- Scoped tables: `public.tenants`, `public.tenant_members`
- Operations:
  - `DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;`
  - `DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;`
  - `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;`
  - `DROP POLICY IF EXISTS "Members can view tenant members" ON public.tenant_members;`
  - `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;`
  - `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;`
  - `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`
  - `CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), id));`
  - `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'));`
  - `CREATE POLICY "Users can insert themselves as owner" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner');`
  - `CREATE POLICY "Members can view tenant members" ON public.tenant_members FOR SELECT TO authenticated USING (public.is_tenant_member(auth.uid(), tenant_id));`
  - `CREATE POLICY "Owners can manage tenant members" ON public.tenant_members FOR ALL TO authenticated USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));`
- Complete-body read this run: YES (the previously malformed ordinal-008 filename is superseded by the complete filename recorded above)
- Classification: POLICY_RLS_LINEAGE_FILE — full policy rebuild
- Reason: the ordinal-008 rebuild that supplies primary source rows 11 through 16.

**L08**
- Path: `supabase/migrations/20251220054441_784dd1e3-dfb1-4f43-a3fa-4dc1a3a9eb08.sql`
- Timestamp: 20251220054441
- Scoped tables: `public.tenants`, `public.tenant_members`
- Operations:
  - `ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — RLS-state operation (no policy operation)
- Reason: temporarily disables RLS on both tables; this is an RLS-state change in the lineage, which is why the lineage-file set is 15 and not 14.

**L09**
- Path: `supabase/migrations/20251220055109_8cb34a67-a9ad-442c-ad88-2efba8a621ad.sql`
- Timestamp: 20251220055109
- Scoped tables: `public.tenants`, `public.tenant_members`
- Operations:
  - `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;`
  - `DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;`
  - `CREATE POLICY "Owners can update tenant members" ON public.tenant_members FOR UPDATE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));`
  - `CREATE POLICY "Owners can delete tenant members" ON public.tenant_members FOR DELETE TO authenticated USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — RLS re-enable plus FOR ALL split
- Reason: the exact migration that splits the FOR ALL occurrence into the two child UPDATE and DELETE records.

**L10**
- Path: `supabase/migrations/20251220060115_e914bcd0-7780-48c5-979f-5c5c4b83f706.sql`
- Timestamp: 20251220060115
- Scoped table: `public.tenants`
- Operation:
  - `CREATE POLICY "Owners can view their own tenants" ON public.tenants FOR SELECT TO authenticated USING (owner_id = auth.uid());`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — additive SELECT
- Reason: adds the second surviving SELECT policy on `public.tenants`.

**L11**
- Path: `supabase/migrations/20251221015154_8e77334b-4325-423c-81dd-1f325c9d0416.sql`
- Timestamp: 20251221015154
- Scoped table: `public.tenant_members`
- Operations:
  - `DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;`
  - `CREATE POLICY "Owners can add themselves as owner member" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid()));`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — self-insert hardening
- Reason: final surviving INSERT policy for owner self-membership.

**L12**
- Path: `supabase/migrations/20251221061910_6c9457c8-c748-4ce6-a4d2-0c77afcb392a.sql`
- Timestamp: 20251221061910
- Scoped table: `public.tenants`
- Operations:
  - `DROP VIEW IF EXISTS public.public_tenant_directory;`
  - Complete view definition created:
    ```sql
    CREATE VIEW public.public_tenant_directory
    WITH (security_invoker = true)
    AS
    SELECT
      id,
      slug,
      type,
      COALESCE(public_name, name) as display_name,
      public_description,
      public_location_text,
      region,
      logo_url,
      cover_url,
      tags,
      is_listed,
      created_at
    FROM public.tenants
    WHERE is_public = true;
    ```
  - `CREATE POLICY "Anyone can view public tenants" ON public.tenants FOR SELECT USING (is_public = true);`
  - `GRANT SELECT ON public.public_tenant_directory TO anon;`
  - `GRANT SELECT ON public.public_tenant_directory TO authenticated;`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — temporary public SELECT exposure
- Reason: creates the only policy on `public.tenants` that omits a `TO` clause, therefore applying to every role including `anon`.

**L13**
- Path: `supabase/migrations/20251224092540_1621a5d3-95c1-40b2-973f-f321d8022596.sql`
- Timestamp: 20251224092540
- Scoped table: `public.tenant_members`
- Operation:
  - `CREATE POLICY "Users can join via invitation" ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.invitations inv WHERE inv.tenant_id = tenant_members.tenant_id AND inv.proposed_role::text = tenant_members.role::text AND inv.status = 'pending' AND (inv.invitee_id = auth.uid() OR inv.invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))));`
- Complete-body read this run: YES
- Classification: POLICY_RLS_LINEAGE_FILE — additive INSERT
- Reason: second surviving INSERT policy on `public.tenant_members`.

**L14**
- Path: `supabase/migrations/20260513153215_379d0973-f5d9-4f02-92a6-79328772ff8b.sql`
- Timestamp: 20260513153215
- Scoped table: `public.tenants` (plus out-of-scope tables not part of this lineage)
- Scoped operations:
  - `DROP POLICY IF EXISTS "Anyone can view public tenants" ON public.tenants;`
  - Complete replacement object definition:
    ```sql
    CREATE OR REPLACE FUNCTION public.get_public_tenants_directory(
      _type text DEFAULT NULL,
      _region text DEFAULT NULL
    )
    RETURNS TABLE (
      id uuid,
      slug text,
      type text,
      name text,
      public_name text,
      public_description text,
      public_location_text text,
      region text,
      logo_url text,
      cover_url text,
      tags text[],
      is_listed boolean,
      created_at timestamptz
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT t.id, t.slug, t.type::text, t.name, t.public_name, t.public_description,
             t.public_location_text, t.region, t.logo_url, t.cover_url, t.tags,
             t.is_listed, t.created_at
      FROM public.tenants t
      WHERE t.is_public = true
        AND t.is_listed = true
        AND (_type IS NULL OR t.type::text = _type)
        AND (_region IS NULL OR t.region = _region)
      ORDER BY t.created_at DESC;
    $$;
    ```
  - `GRANT EXECUTE ON FUNCTION public.get_public_tenants_directory(text, text) TO anon, authenticated;`
- Complete-body read this run: YES. The remaining statements in this file operate on `public.clients`, `public.hr_employees`, `public.breeders`, `public.horse_owners`, `public.horse_shares`, `public.lab_result_shares`, `public.invitations`, `public.connections`, and `public.client_claim_tokens`; they are outside the two-table lineage and are recorded here as out-of-scope rather than abbreviated.
- Classification: POLICY_RLS_LINEAGE_FILE — termination of public exposure
- Reason: removes the anon-reachable SELECT policy and replaces the directory read path with a SECURITY DEFINER function.

**L15**
- Path: `supabase/migrations/20260716174522_00b02fa6-1eef-4468-b34b-3b73e29c7368.sql`
- Timestamp: 20260716174522
- Scoped table: `public.tenants`
- Scoped operations:
  - `DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;`
  - `CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)) WITH CHECK (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role) AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id));`
- Complete-body read this run: YES. The remaining statements in this file operate on `public.post_likes`, `public.public_profile_fields`, and `realtime.messages`; they are outside the two-table lineage and are recorded here as out-of-scope rather than abbreviated.
- Classification: POLICY_RLS_LINEAGE_FILE — owner_id UPDATE freeze
- Reason: final surviving UPDATE policy on `public.tenants`; adds the WITH CHECK that freezes `owner_id` across updates.

### B.2 Context-only privilege file (1)

- Path: `supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql`
- Timestamp: 20251220052339
- Classification: CONTEXT_ONLY_PRIVILEGE_FILE
- Complete-body read this run: YES
- Operations relevant to the two tables:
  - `GRANT USAGE ON SCHEMA public TO authenticated;`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO authenticated;`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_members TO authenticated;`
  - The remaining grants target `public.horses`, `public.invitations`, `public.profiles`, and four functions; they are outside the two-table policy lineage.
- Statement: this file performs no policy operation and no RLS-state operation. It is therefore **not** included in the policy/RLS lineage-file count of 15.
- Live ACL verification for this file remains **deferred to A1-R1-C2**. No Live ACL query was executed in this run.

---

## C. Read-Provenance Reconciliation

Three disjoint reporting categories, with the third declared explicitly as a subset of the second:

1. **Complete bodies read during this run: 16** — the 15 lineage files in Section B.1 plus the 1 context-only file in Section B.2. Every one of these bodies was re-read in this run. No file in this set is classified as read on the basis of a prior continuation.
2. **Pattern-scanned-only files: 306** — 322 total repository migration files minus the 16 files completely read this run.
3. **Out-of-scope matches within the pattern-scanned-only set: 0 verified this run.** Both scoped regular expressions returned only files already in the complete-read set. The previously reported figure of 3 out-of-scope matches is not reproducible from this run's scans and is recorded as STILL UNVERIFIED. This category is a subset of category 2 and is not added to the reconciliation total.

Additional non-lineage reads performed only to resolve the trigger chain (Section F), which do **not** advance migration coverage and are not counted in categories 1–3:
- `supabase/migrations/20260110212740_c3ff2fe7-cb95-4501-9dae-f9618d727f95.sql` (partial, function region)
- `supabase/migrations/20260110223121_f36e98ef-36cd-499b-8359-3a82044df250.sql` (partial, revoke region)
- `supabase/migrations/20260110230254_f3d1065b-c920-411c-9632-19179a84f5f2.sql` (partial, revoke region)
- `supabase/migrations/20260717205437_7b2612c9-d9e3-491c-9c40-268d66d01f1f.sql` (partial, function and trigger region)
- `supabase/migrations/20260725071233_4dd54c91-4aa5-4b5a-aab0-e5f487a36c49.sql` (partial, function and trigger region)

---

## D. Primary Row 3 Exact-Evidence Replacement

Primary Row 3 = ordinal-001 source occurrence `CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);`

Complete replacement for its Exact Live Database evidence field:

- Live schema: `public`
- Live table: `tenants`
- Live policy name: `Authenticated users can create tenants`
- Live command (`pg_policy.polcmd`): `a` (INSERT)
- Live permissive flag: `true`
- Live grantee roles: `authenticated`
- Complete Live USING expression: **NULL — no USING expression exists.** A policy whose command is INSERT carries no USING expression in `pg_policy.polqual`; this is a structural property of INSERT policies, not an omission or an abbreviation.
- Complete Live WITH CHECK expression: `true`

Repository-to-Live status: **SEMANTIC_MATCH — CONFIRMED.** The final surviving repository definition of this policy name is L07 (ordinal 008), whose text is `WITH CHECK (true)` for role `authenticated`, and the Live expression is exactly `true` for role `authenticated`.

---

## E. Corrected `public.tenants` Occurrence Statement

The prior snapshot statement "all six tenants source occurrences" is **OVERTURNED**.

Correct count: **9 source-policy occurrences** on `public.tenants`.

Exact primary row numbers: **1, 2, 3, 7, 8, 9, 11, 12, 13**.

Complementary count: `public.tenant_members` = 7 source-policy occurrences. 9 + 7 = 16, which matches the preserved 16-row primary ledger.

---

## F. owner_id Trigger-Chain Verification

### F.1 Live trigger definitions and enabled state on `public.tenants`

| Trigger | Definition | Enabled state |
|---|---|---|
| `enforce_tenant_limit` | `CREATE TRIGGER enforce_tenant_limit BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION check_tenant_limit()` | `O` (enabled, origin) |
| `on_tenant_created_seed_roles` | `CREATE TRIGGER on_tenant_created_seed_roles AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION seed_tenant_roles()` | `O` |
| `trg_provision_stable_local_record_permissions_ins` | `CREATE TRIGGER trg_provision_stable_local_record_permissions_ins AFTER INSERT ON public.tenants FOR EACH ROW WHEN (((new.type)::text = 'stable'::text)) EXECUTE FUNCTION _trg_provision_stable_local_record_permissions()` | `O` |
| `trg_provision_stable_local_record_permissions_upd` | `CREATE TRIGGER trg_provision_stable_local_record_permissions_upd AFTER UPDATE OF type ON public.tenants FOR EACH ROW WHEN ((((new.type)::text = 'stable'::text) AND (old.type IS DISTINCT FROM new.type))) EXECUTE FUNCTION _trg_provision_stable_local_record_permissions()` | `O` |
| `trg_tenants_provision_payment_account` | `CREATE TRIGGER trg_tenants_provision_payment_account AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION _finance_provision_tenant_payment_account()` | `O` |
| `update_tenants_updated_at` | `CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()` | `O` |

### F.2 Function 1 — `public.seed_tenant_roles()`

- Full identity: `public.seed_tenant_roles()` — zero arguments, RETURNS trigger, LANGUAGE plpgsql, SECURITY DEFINER, `search_path = public`.
- Complete Live definition:
```sql
CREATE OR REPLACE FUNCTION public.seed_tenant_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system) VALUES
    (NEW.id, 'owner', 'Owner', 'مالك', 'Full access to all features', 'صلاحية كاملة لجميع المميزات', true),
    (NEW.id, 'manager', 'Manager', 'مدير', 'Managed access with most features', 'صلاحية إدارية مع معظم المميزات', true),
    (NEW.id, 'admin', 'Admin', 'مشرف', 'Administrative access', 'صلاحية إشرافية', true),
    (NEW.id, 'foreman', 'Foreman', 'رئيس عمال', 'Foreman access', 'صلاحية رئيس العمال', true),
    (NEW.id, 'vet', 'Vet', 'بيطري', 'Veterinary access', 'صلاحية بيطرية', true),
    (NEW.id, 'trainer', 'Trainer', 'مدرب', 'Trainer access', 'صلاحية المدرب', true),
    (NEW.id, 'employee', 'Employee', 'موظف', 'Standard employee access', 'صلاحية موظف عادي', true);
  RETURN NEW;
END;
$function$
```
- Final repository creating migration: `supabase/migrations/20260110212740_c3ff2fe7-cb95-4501-9dae-f9618d727f95.sql`. Repository body is textually identical to the Live body. Two later files (`20260110223121_f36e98ef-36cd-499b-8359-3a82044df250.sql`, `20260110230254_f3d1065b-c920-411c-9632-19179a84f5f2.sql`) only revoke EXECUTE privileges and do not alter the body.
- Direct writes: one INSERT into `public.tenant_roles`.
- Nested functions called: none.
- Search results within the body: no `UPDATE public.tenants`, no `INSERT INTO public.tenants`, no `DELETE FROM public.tenants`, no dynamic SQL, no assignment to `owner_id`, no `NEW.owner_id` mutation.
- Downstream trigger reachability: `public.tenant_roles` carries `trg_audit_tenant_roles AFTER INSERT OR DELETE OR UPDATE ... EXECUTE FUNCTION log_role_change()`. The complete Live body of `public.log_role_change()` was read; it performs a single INSERT into `public.role_audit_log` and returns `COALESCE(NEW, OLD)`. It contains no write to `public.tenants` and no `RAISE EXCEPTION`.
- Exception conditions: none raised explicitly. A unique-violation from the `tenant_roles` INSERT is theoretically possible but cannot rewrite `owner_id`; it could only abort the transaction.
- Classification: **DOES_NOT_BIND_OWNER_ID**. Also NOT CAN_REWRITE_OWNER_ID.

### F.3 Function 2 — `public._trg_provision_stable_local_record_permissions()` and nested `public._provision_stable_local_record_permissions(p_tenant_id uuid)`

- Trigger function identity: `public._trg_provision_stable_local_record_permissions()` — zero arguments, RETURNS trigger, LANGUAGE plpgsql, SECURITY DEFINER, `search_path = public, pg_temp`.
- Complete Live definition:
```sql
CREATE OR REPLACE FUNCTION public._trg_provision_stable_local_record_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public._provision_stable_local_record_permissions(NEW.id);
  RETURN NEW;
END;
$function$
```
- Nested function identity: `public._provision_stable_local_record_permissions(p_tenant_id uuid)` — RETURNS void, LANGUAGE plpgsql, SECURITY DEFINER, `search_path = public, pg_temp`.
- Complete Live definition:
```sql
CREATE OR REPLACE FUNCTION public._provision_stable_local_record_permissions(p_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_type text;
BEGIN
  IF p_tenant_id IS NULL THEN RETURN; END IF;
  SELECT type::text INTO v_type FROM public.tenants WHERE id = p_tenant_id;
  IF v_type IS DISTINCT FROM 'stable' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permission_definitions WHERE key = 'horses.local_record.complete') THEN
    RETURN;
  END IF;
  INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
  VALUES (p_tenant_id, 'manager', 'horses.local_record.complete', true)
  ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
END;
$function$
```
- Final repository creating migration for both: `supabase/migrations/20260717205437_7b2612c9-d9e3-491c-9c40-268d66d01f1f.sql`. Both repository bodies are textually identical to the Live bodies.
- Direct writes: one conditional INSERT into `public.tenant_role_permissions`.
- Reads against `public.tenants`: one SELECT of the `type` column only. This is a read, not a write.
- Search results: no `UPDATE public.tenants`, no `INSERT INTO public.tenants`, no `DELETE FROM public.tenants`, no dynamic SQL, no assignment to `owner_id`, no `NEW.owner_id` mutation.
- Downstream trigger reachability: `public.tenant_role_permissions` carries `trg_audit_tenant_role_permissions AFTER INSERT OR DELETE OR UPDATE ... EXECUTE FUNCTION log_role_change()`, whose complete body was read and writes only to `public.role_audit_log`.
- Exception conditions: none raised explicitly; the INSERT is guarded by `ON CONFLICT ... DO NOTHING`.
- Classification: **DOES_NOT_BIND_OWNER_ID** for both the trigger function and the nested function.

### F.4 Function 3 — `public._finance_provision_tenant_payment_account()`

- Full identity: `public._finance_provision_tenant_payment_account()` — zero arguments, RETURNS trigger, LANGUAGE plpgsql, SECURITY DEFINER, `search_path = ''`.
- Complete Live definition:
```sql
CREATE OR REPLACE FUNCTION public._finance_provision_tenant_payment_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
  VALUES ('tenant'::public.payment_owner_type, NEW.id, true)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END
$function$
```
- Final repository creating migration: `supabase/migrations/20260725071233_4dd54c91-4aa5-4b5a-aab0-e5f487a36c49.sql`. Repository body is textually identical to the Live body.
- Direct writes: one INSERT into `public.payment_accounts`.
- Nested functions called: none.
- Search results: no `UPDATE public.tenants`, no `INSERT INTO public.tenants`, no `DELETE FROM public.tenants`, no dynamic SQL, no assignment to `owner_id`, no `NEW.owner_id` mutation.
- Downstream trigger reachability: `public.payment_accounts` carries no non-internal triggers.
- Exception conditions: none raised explicitly; the INSERT is guarded by `ON CONFLICT ... DO NOTHING`.
- Classification: **DOES_NOT_BIND_OWNER_ID**.

### F.5 Corrected reasoning basis

The prior justification — "AFTER INSERT triggers cannot alter `owner_id` because they are AFTER triggers" — is **NARROWED**. The correct basis is evidentiary, not structural: each of the three AFTER INSERT functions, and every nested function reachable from them (`_provision_stable_local_record_permissions`, `log_role_change`), was read in full, and none contains any statement, dynamic SQL, or exception path that writes to `public.tenants` or to `owner_id`. The original conclusion survives, but on inspected-body evidence rather than on trigger-timing reasoning.

---

## G. Required owner_id Conclusion Boundary

**A. RLS policy binding.** The final Live INSERT policy on `public.tenants` is `Authenticated users can create tenants`, role `authenticated`, `WITH CHECK (true)`, `USING` NULL. It does **not** bind `owner_id` to `auth.uid()`. NOT BOUND.

**B. Column, default, generated-expression, and constraint binding.** Live column inspection: `owner_id uuid`, `attnotnull = true`, no column default, `attgenerated` empty. Live constraint inspection on `public.tenants` returns exactly four constraints: `tenants_pkey` PRIMARY KEY (id), `tenants_slug_key` UNIQUE (slug), `tenants_default_tax_rate_range_chk` CHECK on `default_tax_rate`, and `tenants_owner_id_fkey` FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT. The foreign key requires only that the value reference an existing auth user; it does not require that user to be the caller. NOT BOUND.

**C. BEFORE INSERT trigger binding.** The single BEFORE INSERT trigger is `enforce_tenant_limit`, executing `public.check_tenant_limit()`:
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
It reads `NEW.owner_id` for a count comparison only. It does not compare `NEW.owner_id` to `auth.uid()`, does not assign `NEW.owner_id`, and can reject an insert only on the count condition. NOT BOUND — CAN_REJECT_INSERT on a non-identity condition.

**D. AFTER INSERT trigger-chain effect.** Per Section F, none of `seed_tenant_roles`, `_trg_provision_stable_local_record_permissions` (and its nested `_provision_stable_local_record_permissions`), or `_finance_provision_tenant_payment_account`, nor the reachable `log_role_change`, can rewrite `owner_id`, and none contains an identity-based rejection path. NO IDENTITY EFFECT.

**E. Direct Data API reachability.** No claim is made that an authenticated Data API caller can successfully insert an arbitrary `owner_id`; effective Live INSERT privileges were not verified in this run because A1-R1-C2 ACL verification is excluded.

Bounded conclusions:

```text
OWNER_ID IDENTITY BINDING AT THE POLICY/TRIGGER/CONSTRAINT LAYER:
PROVEN ABSENT

DIRECT DATA API REACHABILITY:
PROVISIONAL — PENDING A1-R1-C2 LIVE GRANT/ACL VERIFICATION
```

These four items are held separate and are not conflated: absence of `owner_id` identity binding is proven at the policy, default, constraint, BEFORE-trigger, and AFTER-trigger-chain layers; availability of the INSERT privilege is unverified; application-layer creation behaviour was not investigated; SECURITY DEFINER RPC creation paths were not investigated.

---

## H. Current-R1A Claim Correction Register

| Claim under review | Status | Basis |
|---|---|---|
| Fifteen versus sixteen lineage files | OVERTURNED — corrected to 15 policy/RLS lineage files plus 1 separately classified context-only privilege file | Two independent scoped regular-expression scans over 322 files |
| "Every complete relevant body was read in full in this run" | CONFIRMED for this correction run — 16 complete bodies re-read here, none carried over from a prior continuation | Section C |
| "Categories without overlap" | OVERTURNED — the out-of-scope match category is a declared subset of the pattern-scanned-only category and is not added to the total | Section C |
| "All six tenants source occurrences" | OVERTURNED — the correct count is 9, at primary rows 1, 2, 3, 7, 8, 9, 11, 12, 13 | Section E |
| Zero remaining SQL abbreviation | CONFIRMED for this record — no ellipsis character, no three-dot abbreviation, no shortened expression, filename, or definition appears in Sections B, D, F, G | Self-inspection of this record |
| "AFTER INSERT triggers cannot alter owner_id because they are AFTER triggers" | NARROWED — conclusion survives, but on complete inspected function and nested-function bodies rather than on trigger timing | Section F.5 |
| "owner_id binding is PROVEN ABSENT" | CONFIRMED — and now extended to the AFTER-trigger chain and to the reachable nested and audit functions | Section G, items A through D |
| "Arbitrary owner_id is accepted through the Direct Data API" | STILL UNVERIFIED — returned to PROVISIONAL pending A1-R1-C2 Live grant and ACL verification | Section G, item E |
| Historical anon exposure through the temporary public SELECT policy | STILL UNVERIFIED — remains provisional pending A1-R1-C2 | L12, L14 |
| Previously reported "3 out-of-scope matches" | STILL UNVERIFIED — not reproducible from this run's scans | Section C |

---

## I. Corrected Reconciliation

```text
R1A primary source-policy rows preserved: 16
R1A child records preserved: 4
R1A table snapshots preserved: 2
public.tenants source-policy occurrences: 9
public.tenant_members source-policy occurrences: 7
Total source-policy occurrences: 16

Policy/RLS lineage files: 15
Context-only privilege files: 1
Complete bodies re-read during this correction: 16
Pattern-scanned-only files: 306
Out-of-scope matches within pattern-scanned-only files: 0 verified (subset of the 306; not added)
Total repository migration files reconciled: 15 + 1 + 306 = 322
Files relying only on an earlier run: 0
Files containing shortened filenames: 0
Corrected evidence fields containing SQL abbreviation: 0
Repository policies preserved: 4 for public.tenants, 5 for public.tenant_members
Live policies preserved: 4 for public.tenants, 5 for public.tenant_members
Tables with complete policy-text lineage: 2
Tables with complete required security-boundary evidence: 1 (public.tenants at the policy, column, constraint, BEFORE-trigger, and AFTER-trigger-chain layers; ACL layer excluded by scope)
Unresolved trigger-function chains: 0
Unresolved ACL conclusions: 2 (ordinal-009 effective privileges; historical anon exposure through the temporary public SELECT policy)
```

Parent migration-coverage counter, unchanged:

```text
File bodies reported read: 40/322
A1 primary summaries returned: 40/322
A1-R1 contract-verification claim: 10/322 — not accepted
C1 aggregate 4/4 claim: not accepted pending accepted R1A and completed R1B
```

The 16 complete reads and 5 partial function-source reads performed in this correction are not converted into independent migration-coverage advancement.

---

## J. Exact Evidence Gaps

- **Proven access limitations:** none encountered; every read attempted in this run succeeded.
- **Work omitted by instruction:** Live grant and ACL verification (A1-R1-C2); the ordinal-009 Live ACL correction; the ordinal-005 backfill-claim correction; `public.horses` and `public.invitations` re-audit (R1B); any write test.
- **Repository ambiguity:** the previously reported count of 3 out-of-scope pattern matches cannot be reproduced and its original derivation is unknown.
- **Live-state ambiguity:** effective INSERT privileges on `public.tenants` for `authenticated` and `anon` are unread in this run.
- **Trigger-chain ambiguity:** none remaining for `public.tenants` INSERT; all three AFTER INSERT functions, the one BEFORE INSERT function, the one nested provisioning function, and the one reachable audit function were read in full.
- **ACL-dependent conclusions:** Direct Data API reachability of an arbitrary `owner_id`; historical anon reachability of the temporary public SELECT policy.
- **Application-layer or RPC behaviour not investigated:** the frontend tenant-creation path and any SECURITY DEFINER RPC that creates tenants were not inspected in this run.

---

## K. Workstream Persistence

- Workstream persistence authorized: no.
- Workstream files changed: none.
- Workstream status changed: no.
- Acceptance: none.
- Closure: none.

## L. Roadmap Impact

- Roadmap persistence authorized: no.
- Roadmap files changed: none.
- Roadmap state changed: no.
- New Roadmap or Workstream ID created: no.

---

## M. Run Metadata and Exact Stopping Point

- Mode: Plan/Chat — Read-Only
- Operation: R1A consistency and owner_id security-boundary correction
- Parent Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04
- Continuation identity: A1-R1-C1-R1A-R1
- Prompt Preparation Date: 02-08-2026
- Prompt Preparation Time: 14:11
- Actual Run Start: 14:21 (Asia/Riyadh) — 11:21 UTC
- Actual Run End: 14:33 (Asia/Riyadh) — 11:33 UTC
- Final Report time: 14:33 (Asia/Riyadh)
- Timezone: Asia/Riyadh — UTC+03:00
- Timestamp evidence: sandbox `date -u` returned `2026-08-02T11:21:02Z` at run start
- Branch: `edit/edt-2ce2ebb6-970f-4587-9e4a-1765e1e15fe8`
- HEAD before: `6c355b68056ef2cb2ac7d15a5ee39b64d43a5fcb`
- HEAD after: `6c355b68056ef2cb2ac7d15a5ee39b64d43a5fcb`
- Working tree before: clean
- Working tree after: modified only by the platform-generated planning artifact `.lovable/plan.md`
- Complete policy/RLS lineage filenames re-read: the 15 files listed in Section B.1
- Complete context-only filenames re-read: `supabase/migrations/20251220052339_6ec9fe5e-6b5b-4905-a0d6-bf3576e8b7eb.sql`
- Pattern-scanned-only count: 306
- Repository paths inspected: `supabase/migrations/` (322 files scanned, 16 read in full, 5 read partially for trigger-chain resolution)
- Live schemas inspected: `public`
- Live tables inspected: `tenants`, `tenant_members`, `tenant_roles`, `tenant_role_permissions`, `payment_accounts`
- Live triggers inspected: `enforce_tenant_limit`, `on_tenant_created_seed_roles`, `trg_provision_stable_local_record_permissions_ins`, `trg_provision_stable_local_record_permissions_upd`, `trg_tenants_provision_payment_account`, `update_tenants_updated_at`, `trg_audit_tenant_roles`, `trg_audit_tenant_role_permissions`
- Complete function identities inspected: `public.seed_tenant_roles()`, `public._trg_provision_stable_local_record_permissions()`, `public._finance_provision_tenant_payment_account()`, `public.check_tenant_limit()`
- Nested function identities inspected: `public._provision_stable_local_record_permissions(p_tenant_id uuid)`, `public.log_role_change()`
- Live constraints inspected: all four constraints on `public.tenants`
- Read-only queries summarized by exact purpose: (1) enumerate Live policies with complete expressions and roles for the two tables; (2) enumerate Live non-internal triggers on `public.tenants`; (3) retrieve complete Live definitions of the four trigger functions and the nested provisioning function; (4) inspect `public.tenants.owner_id` type, nullability, default, and generated status; (5) enumerate all constraints on `public.tenants`; (6) enumerate non-internal triggers on the three write-target tables; (7) retrieve the complete Live definition of `public.log_role_change()`
- Intended repository writes: zero
- Actual repository writes: zero, except the separately disclosed automatic `.lovable/plan.md` planning artifact
- Database writes: zero
- DDL: zero
- DML: zero
- Mutating RPC calls: zero
- Migrations applied: zero
- Backfills: zero
- Deployment: zero
- Roadmap persistence: zero
- Workstream persistence: zero
- Acceptance: none
- Closure: none
- Exact unresolved limitations: the two ACL-dependent conclusions in Section J; the unreproducible 3 out-of-scope match count
- Exact stopping point: stopped immediately after returning the corrected R1A verdict, corrected register, corrected occurrence count, corrected read provenance, complete trigger-chain verification, and bounded owner_id conclusions. R1B not started. C2 not started. Ordinals 011 through 020 not started. Prompt 05 not prepared.
- Recommended next continuation identity only: `A1-R1-C1-R1B`
