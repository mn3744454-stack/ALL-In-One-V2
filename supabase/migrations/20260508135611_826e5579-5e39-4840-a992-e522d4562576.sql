
-- =========================================================================
-- AD-1 Pass 1 — Arrivals & Departures State Contract Foundation
-- =========================================================================

-- 1. movement_status hardening (CHECK, status values already used in app)
ALTER TABLE public.horse_movements
  ADD CONSTRAINT horse_movements_movement_status_check
  CHECK (movement_status IN ('scheduled','dispatched','completed','cancelled'));

-- 2. movement_subtype column + backfill
ALTER TABLE public.horse_movements
  ADD COLUMN movement_subtype text,
  ADD COLUMN cancellation_reason text,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancelled_by uuid,
  ADD COLUMN completed_by uuid,
  ADD COLUMN dispatched_by uuid;

UPDATE public.horse_movements
SET movement_subtype = CASE
  WHEN movement_type = 'in'       THEN 'arrival'
  WHEN movement_type = 'transfer' THEN 'internal_transfer'
  WHEN movement_type = 'out'      THEN 'unspecified'  -- historical out: cannot infer checkout vs temporary
  ELSE 'unspecified'
END
WHERE movement_subtype IS NULL;

ALTER TABLE public.horse_movements
  ALTER COLUMN movement_subtype SET NOT NULL,
  ADD CONSTRAINT horse_movements_movement_subtype_check
  CHECK (movement_subtype IN (
    'arrival','checkout_departure','temporary_out',
    'return_from_temporary_out','internal_transfer','unspecified'
  ));

-- BEFORE INSERT trigger: default subtype from movement_type when caller omits it.
-- Keeps record_horse_movement_with_housing signature stable.
CREATE OR REPLACE FUNCTION public.default_horse_movement_subtype()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_subtype IS NULL THEN
    NEW.movement_subtype := CASE
      WHEN NEW.movement_type = 'in'       THEN 'arrival'
      WHEN NEW.movement_type = 'transfer' THEN 'internal_transfer'
      WHEN NEW.movement_type = 'out'      THEN 'checkout_departure'
      ELSE 'unspecified'
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_default_movement_subtype
BEFORE INSERT ON public.horse_movements
FOR EACH ROW EXECUTE FUNCTION public.default_horse_movement_subtype();

-- 3. Partial unique index on open boarding admissions
CREATE UNIQUE INDEX boarding_admissions_open_per_horse_uidx
ON public.boarding_admissions (tenant_id, horse_id)
WHERE status IN ('draft','active','checkout_pending');

-- 4. Status-aware triggers (replace AFTER INSERT triggers).
-- Drop and recreate gated ON INSERT WHEN movement_status = 'completed'
DROP TRIGGER IF EXISTS trigger_update_horse_location ON public.horse_movements;
DROP TRIGGER IF EXISTS trg_sync_admission_on_transfer ON public.horse_movements;

CREATE TRIGGER trigger_update_horse_location
AFTER INSERT ON public.horse_movements
FOR EACH ROW
WHEN (NEW.movement_status = 'completed')
EXECUTE FUNCTION public.update_horse_current_location();

CREATE TRIGGER trg_sync_admission_on_transfer
AFTER INSERT ON public.horse_movements
FOR EACH ROW
WHEN (NEW.movement_status = 'completed' AND NEW.movement_type = 'transfer')
EXECUTE FUNCTION public.sync_admission_on_transfer();

-- 5. dispatch_horse_movement: reduce to status-flip + origin-clear only.
--    Remove destination writes for transfer; keep connected-incoming creation.
CREATE OR REPLACE FUNCTION public.dispatch_horse_movement(
  p_movement_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_movement record;
  v_horse record;
  v_incoming_id uuid;
  v_sender_name text;
BEGIN
  SELECT * INTO v_movement FROM horse_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF v_movement.movement_status != 'scheduled' THEN
    RAISE EXCEPTION 'Movement is not in scheduled status (got %)', v_movement.movement_status;
  END IF;
  IF NOT can_manage_movement(auth.uid(), v_movement.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_horse FROM horses
    WHERE id = v_movement.horse_id AND tenant_id = v_movement.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Horse not found'; END IF;

  -- ORIGIN-SIDE clear only (out / transfer). Never write destination here.
  IF v_movement.movement_type IN ('out','transfer') THEN
    -- Close current open occupancy row(s)
    UPDATE housing_unit_occupants
       SET until = now()
     WHERE horse_id = v_horse.id
       AND tenant_id = v_movement.tenant_id
       AND until IS NULL;

    -- Clear horse.current_* origin pointers (transit state)
    UPDATE horses
       SET current_location_id = NULL,
           current_area_id     = NULL,
           housing_unit_id     = NULL,
           updated_at          = now()
     WHERE id = v_horse.id AND tenant_id = v_movement.tenant_id;
  END IF;

  -- Connected outgoing: create receiver pending incoming at dispatch time
  IF v_movement.destination_type = 'connected' AND v_movement.connected_tenant_id IS NOT NULL THEN
    SELECT display_name INTO v_sender_name FROM tenants WHERE id = v_movement.tenant_id;
    INSERT INTO incoming_horse_movements (
      tenant_id, sender_tenant_id, sender_movement_id,
      horse_id, horse_name, horse_name_ar, horse_avatar_url,
      sender_tenant_name, movement_type, status, reason, notes, scheduled_at
    ) VALUES (
      v_movement.connected_tenant_id, v_movement.tenant_id, v_movement.id,
      v_horse.id, v_horse.name, v_horse.name_ar, v_horse.avatar_url,
      v_sender_name, 'in', 'pending', v_movement.reason,
      COALESCE(p_notes, v_movement.notes), now()
    ) RETURNING id INTO v_incoming_id;
    UPDATE horse_movements SET connected_movement_id = v_incoming_id WHERE id = p_movement_id;
  END IF;

  UPDATE horse_movements SET
    movement_status = 'dispatched',
    dispatched_at   = now(),
    dispatched_by   = auth.uid(),
    notes           = COALESCE(p_notes, notes),
    updated_at      = now()
  WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'movement_id', p_movement_id,
    'status', 'dispatched',
    'incoming_id', v_incoming_id,
    'horse_name', v_horse.name
  );
END;
$$;

-- 6. validate_boarding_checkout_gate
CREATE OR REPLACE FUNCTION public.validate_boarding_checkout_gate(
  p_admission_id uuid,
  p_actor_user_id uuid DEFAULT NULL,
  p_override_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_admission record;
  v_admission_billed numeric := 0;
  v_admission_paid   numeric := 0;
  v_admission_balance numeric := 0;
  v_client_balance   numeric := 0;
  v_unbilled         numeric := 0;
  v_has_override     boolean := false;
  v_status           text;
  v_override_recorded boolean := false;
  v_existing_checks  jsonb;
BEGIN
  SELECT * INTO v_admission FROM boarding_admissions WHERE id = p_admission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admission not found'; END IF;

  -- Mirror useAdmissionFinancials math: billed via billing_links → invoices (financially active)
  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_admission_billed
  FROM billing_links bl
  JOIN invoices i ON i.id = bl.invoice_id
  WHERE bl.tenant_id = v_admission.tenant_id
    AND bl.source_type = 'boarding'
    AND bl.source_id = p_admission_id
    AND i.status IN ('approved','shared','paid','overdue','partial','issued');

  SELECT COALESCE(SUM(ABS(le.amount)), 0) INTO v_admission_paid
  FROM ledger_entries le
  WHERE le.tenant_id = v_admission.tenant_id
    AND le.entry_type = 'payment'
    AND le.reference_id IN (
      SELECT bl.invoice_id FROM billing_links bl
      WHERE bl.tenant_id = v_admission.tenant_id
        AND bl.source_type = 'boarding' AND bl.source_id = p_admission_id
        AND bl.invoice_id IS NOT NULL
    );

  v_admission_balance := GREATEST(v_admission_billed - v_admission_paid, 0);

  -- Client-level ledger balance
  IF v_admission.client_id IS NOT NULL THEN
    SELECT COALESCE(balance, 0) INTO v_client_balance
    FROM v_customer_ledger_balances
    WHERE client_id = v_admission.client_id AND tenant_id = v_admission.tenant_id;
    v_client_balance := GREATEST(COALESCE(v_client_balance, 0), 0);
  END IF;

  -- Override permission check (server-side)
  v_has_override := has_permission(v_actor, v_admission.tenant_id, 'boarding.checkout.override_balance');

  -- Determine status (consistent with useFinancialGate: outstanding blocks; unbilled is warning only)
  IF GREATEST(v_admission_balance, v_client_balance) > 0 THEN
    IF p_override_reason IS NOT NULL AND v_has_override THEN
      v_status := 'pass';   -- override accepted
      v_override_recorded := true;
      v_existing_checks := COALESCE(v_admission.admission_checks, '{}'::jsonb);
      UPDATE boarding_admissions
         SET admission_checks = v_existing_checks || jsonb_build_object(
               'checkout_balance_override', jsonb_build_object(
                 'status','overridden',
                 'overridden_by', v_actor,
                 'overridden_at', now(),
                 'reason', p_override_reason,
                 'admission_balance', v_admission_balance,
                 'client_balance', v_client_balance,
                 'unbilled_value', v_unbilled,
                 'context', 'checkout'
               )
             ),
             balance_cleared = true,
             updated_at = now()
       WHERE id = p_admission_id;
    ELSIF v_has_override THEN
      v_status := 'needs_override';
    ELSE
      v_status := 'blocked';
    END IF;
  ELSE
    v_status := 'pass';
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'admission_balance', v_admission_balance,
    'client_balance', v_client_balance,
    'unbilled_value', v_unbilled,
    'has_override_permission', v_has_override,
    'override_recorded', v_override_recorded
  );
END;
$$;

-- 7. complete_horse_movement (dispatched → completed)
CREATE OR REPLACE FUNCTION public.complete_horse_movement(
  p_movement_id uuid,
  p_override_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_movement record;
  v_horse record;
  v_admission record;
  v_gate jsonb;
  v_inserted_occupant uuid;
  v_dest_area_id uuid;
BEGIN
  SELECT * INTO v_movement FROM horse_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF v_movement.movement_status != 'dispatched' THEN
    RAISE EXCEPTION 'Movement is not dispatched (got %)', v_movement.movement_status;
  END IF;
  IF NOT can_manage_movement(auth.uid(), v_movement.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_horse FROM horses
    WHERE id = v_movement.horse_id AND tenant_id = v_movement.tenant_id;

  -- Locate open admission (used by checkout/transfer paths)
  SELECT * INTO v_admission FROM boarding_admissions
    WHERE horse_id = v_movement.horse_id
      AND tenant_id = v_movement.tenant_id
      AND status IN ('active','checkout_pending')
    ORDER BY admitted_at DESC NULLS LAST LIMIT 1;

  -- Financial gate for checkout_departure only
  IF v_movement.movement_subtype = 'checkout_departure' AND v_admission.id IS NOT NULL THEN
    v_gate := validate_boarding_checkout_gate(v_admission.id, auth.uid(), p_override_reason);
    IF (v_gate->>'status') = 'blocked' THEN
      RAISE EXCEPTION 'Checkout blocked: outstanding balance (admission=% client=%)',
        v_gate->>'admission_balance', v_gate->>'client_balance'
        USING ERRCODE = 'check_violation';
    ELSIF (v_gate->>'status') = 'needs_override' THEN
      RAISE EXCEPTION 'Checkout requires override reason'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Destination-side writes for arrival / return / completed transfer
  IF v_movement.movement_subtype IN ('arrival','return_from_temporary_out')
     OR (v_movement.movement_type = 'transfer') THEN
    v_dest_area_id := COALESCE(
      v_movement.to_area_id,
      (SELECT area_id FROM housing_units WHERE id = v_movement.to_unit_id)
    );
    UPDATE horses SET
      current_location_id = COALESCE(v_movement.to_location_id, current_location_id),
      current_area_id     = v_dest_area_id,
      housing_unit_id     = v_movement.to_unit_id,
      updated_at          = now()
    WHERE id = v_horse.id AND tenant_id = v_movement.tenant_id;

    IF v_movement.to_unit_id IS NOT NULL THEN
      INSERT INTO housing_unit_occupants (tenant_id, unit_id, horse_id, since, is_demo)
      VALUES (v_movement.tenant_id, v_movement.to_unit_id, v_horse.id, now(), v_movement.is_demo)
      RETURNING id INTO v_inserted_occupant;
    END IF;

    -- Sync admission destination on transfer
    IF v_movement.movement_type = 'transfer' AND v_admission.id IS NOT NULL
       AND v_movement.to_unit_id IS NOT NULL THEN
      UPDATE boarding_admissions
         SET unit_id = v_movement.to_unit_id,
             area_id = v_dest_area_id,
             updated_at = now()
       WHERE id = v_admission.id;
    END IF;
  END IF;

  -- Close admission only on checkout_departure
  IF v_movement.movement_subtype = 'checkout_departure' AND v_admission.id IS NOT NULL THEN
    UPDATE boarding_admissions
       SET status = 'checked_out',
           checked_out_at = now(),
           checked_out_by = auth.uid(),
           checkout_movement_id = v_movement.id,
           updated_at = now()
     WHERE id = v_admission.id;
  END IF;

  -- temporary_out: leave admission active, no destination write

  UPDATE horse_movements SET
    movement_status = 'completed',
    completed_at    = now(),
    completed_by    = auth.uid(),
    notes           = COALESCE(p_notes, notes),
    updated_at      = now()
  WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'movement_id', p_movement_id,
    'status', 'completed',
    'subtype', v_movement.movement_subtype,
    'gate_result', v_gate,
    'admission_closed', (v_movement.movement_subtype = 'checkout_departure' AND v_admission.id IS NOT NULL)
  );
END;
$$;

-- 8. cancel_horse_movement
CREATE OR REPLACE FUNCTION public.cancel_horse_movement(
  p_movement_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_movement record;
  v_unit_capacity int;
  v_occupancy text;
  v_current int;
  v_restored boolean := false;
BEGIN
  SELECT * INTO v_movement FROM horse_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF NOT can_manage_movement(auth.uid(), v_movement.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_movement.movement_status = 'completed' THEN
    RAISE EXCEPTION 'Completed movements cannot be cancelled in this version';
  END IF;
  IF v_movement.movement_status = 'cancelled' THEN
    RAISE EXCEPTION 'Movement already cancelled';
  END IF;

  -- For dispatched movements, attempt safe origin restoration
  IF v_movement.movement_status = 'dispatched'
     AND v_movement.movement_type IN ('out','transfer')
     AND v_movement.from_unit_id IS NOT NULL THEN

    SELECT occupancy::text, capacity INTO v_occupancy, v_unit_capacity
    FROM housing_units WHERE id = v_movement.from_unit_id;

    SELECT COUNT(*) INTO v_current
    FROM housing_unit_occupants
    WHERE unit_id = v_movement.from_unit_id AND until IS NULL;

    IF v_occupancy = 'single' AND v_current >= 1 THEN
      RAISE EXCEPTION 'Cannot restore: origin unit no longer available (single-occupancy in use)';
    ELSIF v_current >= v_unit_capacity THEN
      RAISE EXCEPTION 'Cannot restore: origin unit is now at capacity';
    END IF;

    -- Restore occupancy
    INSERT INTO housing_unit_occupants (tenant_id, unit_id, horse_id, since, is_demo)
    VALUES (v_movement.tenant_id, v_movement.from_unit_id, v_movement.horse_id, now(), v_movement.is_demo);

    -- Restore horse pointers
    UPDATE horses SET
      current_location_id = COALESCE(v_movement.from_location_id, current_location_id),
      current_area_id     = COALESCE(v_movement.from_area_id, current_area_id),
      housing_unit_id     = v_movement.from_unit_id,
      updated_at          = now()
    WHERE id = v_movement.horse_id AND tenant_id = v_movement.tenant_id;

    v_restored := true;
  END IF;

  UPDATE horse_movements SET
    movement_status = 'cancelled',
    cancelled_at    = now(),
    cancelled_by    = auth.uid(),
    cancellation_reason = p_reason,
    updated_at      = now()
  WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'movement_id', p_movement_id,
    'status', 'cancelled',
    'origin_restored', v_restored
  );
END;
$$;

-- 9. Lifecycle view (read-only)
CREATE OR REPLACE VIEW public.vw_horse_lifecycle_state AS
WITH latest_mv AS (
  SELECT DISTINCT ON (horse_id)
    horse_id, tenant_id, movement_status, movement_subtype, movement_type,
    movement_at, id AS movement_id
  FROM public.horse_movements
  ORDER BY horse_id, movement_at DESC, created_at DESC
),
open_adm AS (
  SELECT horse_id, tenant_id, id AS admission_id, status, unit_id
  FROM public.boarding_admissions
  WHERE status IN ('draft','active','checkout_pending')
)
SELECT
  h.id AS horse_id,
  h.tenant_id,
  oa.admission_id AS open_admission_id,
  oa.status      AS open_admission_status,
  (oa.admission_id IS NULL) AS needs_admission,
  (oa.admission_id IS NOT NULL AND oa.unit_id IS NULL) AS needs_placement,
  (lm.movement_subtype = 'temporary_out' AND lm.movement_status IN ('dispatched','completed')) AS is_temporarily_out,
  lm.movement_status   AS latest_movement_status,
  lm.movement_subtype  AS latest_movement_subtype,
  lm.movement_id       AS latest_movement_id
FROM public.horses h
LEFT JOIN open_adm oa ON oa.horse_id = h.id AND oa.tenant_id = h.tenant_id
LEFT JOIN latest_mv lm ON lm.horse_id = h.id AND lm.tenant_id = h.tenant_id;

GRANT SELECT ON public.vw_horse_lifecycle_state TO authenticated;
