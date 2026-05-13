-- 1) Tighten horse_care_notes UPDATE policy: only the original author can update,
--    and they still need boarding.admission.update permission.
DROP POLICY IF EXISTS "Members can update care notes respecting authorship" ON public.horse_care_notes;

CREATE POLICY "Authors can update their own care notes"
ON public.horse_care_notes
FOR UPDATE
USING (
  created_by = auth.uid()
  AND has_permission(auth.uid(), tenant_id, 'boarding.admission.update'::text)
)
WITH CHECK (
  created_by = auth.uid()
  AND has_permission(auth.uid(), tenant_id, 'boarding.admission.update'::text)
);

-- 2) Realtime channel-level authorization: require authenticated session
--    to receive Broadcast/Presence messages. postgres_changes still flow
--    through table-level RLS independently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'realtime' AND c.relname = 'messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated users can receive realtime messages"
             ON realtime.messages FOR SELECT TO authenticated USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated users can send realtime messages"
             ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;