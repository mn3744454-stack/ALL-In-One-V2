
-- ============================================================
-- Phase 5: Connected Platform Destinations (complete)
-- ============================================================

-- 1. Add connected destination columns to horse_movements
ALTER TABLE public.horse_movements
  ADD COLUMN IF NOT EXISTS connected_tenant_id uuid REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS connected_movement_id uuid;

CREATE INDEX IF NOT EXISTS idx_horse_movements_connected_tenant
  ON public.horse_movements(connected_tenant_id)
  WHERE connected_tenant_id IS NOT NULL;

-- 2. Create incoming_horse_movements table
CREATE TABLE public.incoming_horse_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  sender_movement_id uuid NOT NULL REFERENCES public.horse_movements(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id),
  horse_name text NOT NULL,
  horse_name_ar text,
  horse_avatar_url text,
  sender_tenant_name text,
  movement_type text NOT NULL DEFAULT 'in',
  status text NOT NULL DEFAULT 'pending',
  reason text,
  notes text,
  scheduled_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  local_movement_id uuid REFERENCES public.horse_movements(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sender_movement_id)
);

ALTER TABLE public.incoming_horse_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view incoming movements"
  ON public.incoming_horse_movements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = incoming_horse_movements.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active = true
  ));

CREATE POLICY "Sender tenant can view own outbound records"
  ON public.incoming_horse_movements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = incoming_horse_movements.sender_tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active = true
  ));

CREATE POLICY "Managers can update incoming movements"
  ON public.incoming_horse_movements FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = incoming_horse_movements.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active = true
      AND tm.role IN ('owner', 'manager')
  ));

CREATE POLICY "Sender members can insert incoming movements"
  ON public.incoming_horse_movements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = incoming_horse_movements.sender_tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active = true
      AND tm.role IN ('owner', 'manager')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_horse_movements;

-- 3. RPC: record_connected_movement
CREATE OR REPLACE FUNCTION public.record_connected_movement(
  p_sender_tenant_id uuid,
  p_horse_id uuid,
  p_connected_tenant_id uuid,
  p_from_location_id uuid DEFAULT NULL,
  p_movement_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_demo boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_movement_id uuid;
  v_incoming_id uuid;
  v_horse record;
  v_sender_name text;
  v_connection_exists boolean;
  v_movement_record record;
BEGIN
  IF NOT can_manage_movement(auth.uid(), p_sender_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to record movements';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'accepted'
      AND c.connection_type = 'b2b'
      AND (
        (c.initiator_tenant_id = p_sender_tenant_id AND c.recipient_tenant_id = p_connected_tenant_id)
        OR (c.initiator_tenant_id = p_connected_tenant_id AND c.recipient_tenant_id = p_sender_tenant_id)
      )
  ) INTO v_connection_exists;

  IF NOT v_connection_exists THEN
    RAISE EXCEPTION 'No accepted connection exists with the destination entity';
  END IF;

  SELECT * INTO v_horse FROM horses WHERE id = p_horse_id AND tenant_id = p_sender_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Horse not found or does not belong to sender tenant';
  END IF;

  SELECT display_name INTO v_sender_name FROM tenants WHERE id = p_sender_tenant_id;

  -- Clear housing
  IF v_horse.housing_unit_id IS NOT NULL THEN
    UPDATE housing_unit_occupants SET until = COALESCE(p_movement_at, now())
    WHERE horse_id = p_horse_id AND tenant_id = p_sender_tenant_id AND until IS NULL;
  END IF;

  -- Sender movement
  INSERT INTO horse_movements (
    tenant_id, horse_id, movement_type,
    from_location_id, destination_type, connected_tenant_id,
    movement_at, recorded_by, reason, notes, is_demo,
    from_area_id, from_unit_id
  ) VALUES (
    p_sender_tenant_id, p_horse_id, 'out'::movement_type,
    p_from_location_id, 'connected', p_connected_tenant_id,
    COALESCE(p_movement_at, now()), auth.uid(), p_reason, p_notes, p_is_demo,
    v_horse.current_area_id, v_horse.housing_unit_id
  ) RETURNING * INTO v_movement_record;
  v_movement_id := v_movement_record.id;

  -- Clear horse location
  UPDATE horses SET
    current_location_id = NULL, current_area_id = NULL, housing_unit_id = NULL, updated_at = now()
  WHERE id = p_horse_id AND tenant_id = p_sender_tenant_id;

  -- Receiver incoming record
  INSERT INTO incoming_horse_movements (
    tenant_id, sender_tenant_id, sender_movement_id,
    horse_id, horse_name, horse_name_ar, horse_avatar_url,
    sender_tenant_name, movement_type, status, reason, notes, scheduled_at
  ) VALUES (
    p_connected_tenant_id, p_sender_tenant_id, v_movement_id,
    p_horse_id, v_horse.name, v_horse.name_ar, v_horse.avatar_url,
    v_sender_name, 'in', 'pending', p_reason, p_notes,
    COALESCE(p_movement_at, now())
  ) RETURNING id INTO v_incoming_id;

  UPDATE horse_movements SET connected_movement_id = v_incoming_id WHERE id = v_movement_id;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'incoming_id', v_incoming_id,
    'horse_name', v_horse.name,
    'destination_tenant', p_connected_tenant_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_connected_movement TO authenticated;

-- 4. RPC: confirm_incoming_movement
CREATE OR REPLACE FUNCTION public.confirm_incoming_movement(
  p_incoming_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_incoming record;
BEGIN
  SELECT * INTO v_incoming FROM incoming_horse_movements WHERE id = p_incoming_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incoming movement not found'; END IF;
  IF v_incoming.status != 'pending' THEN RAISE EXCEPTION 'Incoming movement is not pending'; END IF;
  IF NOT can_manage_movement(auth.uid(), v_incoming.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE incoming_horse_movements SET
    status = 'completed', completed_at = now(), completed_by = auth.uid(),
    notes = COALESCE(p_notes, notes), updated_at = now()
  WHERE id = p_incoming_id;

  RETURN jsonb_build_object('incoming_id', v_incoming.id, 'status', 'completed', 'horse_name', v_incoming.horse_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_incoming_movement TO authenticated;

-- 5. RPC: cancel_incoming_movement
CREATE OR REPLACE FUNCTION public.cancel_incoming_movement(
  p_incoming_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_incoming record;
BEGIN
  SELECT * INTO v_incoming FROM incoming_horse_movements WHERE id = p_incoming_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incoming movement not found'; END IF;
  IF v_incoming.status != 'pending' THEN RAISE EXCEPTION 'Can only cancel pending movements'; END IF;
  IF NOT can_manage_movement(auth.uid(), v_incoming.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE incoming_horse_movements SET
    status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
    notes = COALESCE(p_reason, notes), updated_at = now()
  WHERE id = p_incoming_id;

  RETURN jsonb_build_object('incoming_id', v_incoming.id, 'status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_incoming_movement TO authenticated;

-- 6. Permission definitions
INSERT INTO public.permission_definitions (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('movement.connected.create', 'movement', 'connected', 'create', 'Send Horse to Connected Entity', 'إرسال حصان إلى جهة متصلة', 'Can send horses to connected platform entities', 'يمكنه إرسال الخيول إلى جهات متصلة على المنصة', true),
  ('movement.incoming.view', 'movement', 'incoming', 'view', 'View Incoming Arrivals', 'عرض الوصول المتوقع', 'Can view incoming horse arrival notifications', 'يمكنه عرض إشعارات وصول الخيول المتوقعة', true),
  ('movement.incoming.confirm', 'movement', 'incoming', 'confirm', 'Confirm Incoming Arrival', 'تأكيد وصول الحصان', 'Can confirm incoming horse arrivals', 'يمكنه تأكيد وصول الخيول', true)
ON CONFLICT (key) DO NOTHING;

-- 7. Wire to roles
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, pd.key, true
FROM public.tenant_roles tr
CROSS JOIN (
  SELECT key FROM public.permission_definitions
  WHERE key IN ('movement.connected.create', 'movement.incoming.view', 'movement.incoming.confirm')
) pd
WHERE tr.name IN ('owner', 'manager')
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, 'movement.incoming.view', true
FROM public.tenant_roles tr
WHERE tr.name = 'staff'
ON CONFLICT DO NOTHING;
