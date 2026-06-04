
-- B3: Service Requests + Events foundation

-- 1) Permissions
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('boarding.requests.view',    'boarding', 'requests', 'view',    'View Service Requests',    'عرض طلبات الخدمات',     'View boarding service requests',                  'عرض طلبات الخدمات المتعلقة بالإيواء',          true),
  ('boarding.requests.create',  'boarding', 'requests', 'create',  'Create Service Requests',  'إنشاء طلبات خدمات',     'Create boarding service requests',                'إنشاء طلبات خدمات متعلقة بالإيواء',            true),
  ('boarding.requests.respond', 'boarding', 'requests', 'respond', 'Respond to Service Requests','الرد على طلبات الخدمات','Approve or reject service requests as stable side','الرد بالموافقة أو الرفض من جهة الإسطبل',       true),
  ('boarding.requests.cancel',  'boarding', 'requests', 'cancel',  'Cancel Service Requests',  'إلغاء طلبات الخدمات',   'Cancel pending service requests',                 'إلغاء طلبات الخدمات قيد الانتظار',              true)
ON CONFLICT (key) DO NOTHING;

-- 2) service_requests
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boarding_contract_id uuid NOT NULL REFERENCES public.boarding_contracts(id) ON DELETE RESTRICT,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE RESTRICT,
  initiator_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  target_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  direction text NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  external_provider_name text,
  owner_supplied_item boolean NOT NULL DEFAULT false,
  cost_estimate numeric,
  approved_cost numeric,
  currency text NOT NULL DEFAULT 'SAR',
  billing_responsibility text,
  included_in_package boolean NOT NULL DEFAULT false,
  fulfillment_status text NOT NULL DEFAULT 'not_required',
  fulfilled_by_lab_request_id uuid,
  fulfilled_by_horse_order_id uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  version int NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_requests_direction_check
    CHECK (direction IN ('owner_to_stable','stable_to_owner')),
  CONSTRAINT service_requests_type_check
    CHECK (request_type IN ('extra_lab','extra_vet_visit','extra_supplement','feeding_change','package_change','movement','provider_preference','other')),
  CONSTRAINT service_requests_status_check
    CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  CONSTRAINT service_requests_fulfillment_check
    CHECK (fulfillment_status IN ('not_required','pending_fulfillment','fulfilled')),
  CONSTRAINT service_requests_billing_check
    CHECK (billing_responsibility IS NULL OR billing_responsibility IN ('owner_pays','included_in_package','stable_absorbs','deduct_from_prepaid')),
  CONSTRAINT service_requests_tenants_distinct
    CHECK (initiator_tenant_id <> target_tenant_id)
);

GRANT SELECT ON public.service_requests TO authenticated;
GRANT ALL    ON public.service_requests TO service_role;

CREATE INDEX IF NOT EXISTS idx_service_requests_contract   ON public.service_requests(boarding_contract_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_horse      ON public.service_requests(horse_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_initiator  ON public.service_requests(initiator_tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_target     ON public.service_requests(target_tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status     ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_contract_status ON public.service_requests(boarding_contract_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_target_status   ON public.service_requests(target_tenant_id, status);

CREATE OR REPLACE FUNCTION public.fn_service_requests_before_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.boarding_contract_id IS DISTINCT FROM OLD.boarding_contract_id
     OR NEW.horse_id IS DISTINCT FROM OLD.horse_id
     OR NEW.initiator_tenant_id IS DISTINCT FROM OLD.initiator_tenant_id
     OR NEW.target_tenant_id IS DISTINCT FROM OLD.target_tenant_id
     OR NEW.direction IS DISTINCT FROM OLD.direction
     OR NEW.request_type IS DISTINCT FROM OLD.request_type THEN
    RAISE EXCEPTION 'Immutable fields on service_requests cannot be changed';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_requests_before_update ON public.service_requests;
CREATE TRIGGER trg_service_requests_before_update
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_service_requests_before_update();

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_requests_select ON public.service_requests;
CREATE POLICY service_requests_select ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(auth.uid(), initiator_tenant_id)
    OR public.is_tenant_member(auth.uid(), target_tenant_id)
  );

DROP POLICY IF EXISTS service_requests_no_direct_write ON public.service_requests;
CREATE POLICY service_requests_no_direct_write ON public.service_requests
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 3) service_request_events
CREATE TABLE IF NOT EXISTS public.service_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_tenant_id uuid REFERENCES public.tenants(id),
  from_status text,
  to_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_events_type_check
    CHECK (event_type IN ('created','approved','rejected','cancelled','completed','fulfillment_updated'))
);

GRANT SELECT ON public.service_request_events TO authenticated;
GRANT ALL    ON public.service_request_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_service_request_events_req ON public.service_request_events(service_request_id);

ALTER TABLE public.service_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_request_events_select ON public.service_request_events;
CREATE POLICY service_request_events_select ON public.service_request_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND (public.is_tenant_member(auth.uid(), sr.initiator_tenant_id)
        OR public.is_tenant_member(auth.uid(), sr.target_tenant_id))
  ));

DROP POLICY IF EXISTS service_request_events_no_direct_write ON public.service_request_events;
CREATE POLICY service_request_events_no_direct_write ON public.service_request_events
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 4) RPCs

-- helper: determine which request types require post-approval fulfillment tracking
CREATE OR REPLACE FUNCTION public._service_request_initial_fulfillment(_request_type text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _request_type IN ('extra_lab','extra_vet_visit','movement') THEN 'pending_fulfillment' ELSE 'not_required' END;
$$;

CREATE OR REPLACE FUNCTION public.create_service_request(
  _boarding_contract_id uuid,
  _request_type text,
  _details jsonb DEFAULT '{}'::jsonb,
  _provider_tenant_id uuid DEFAULT NULL,
  _external_provider_name text DEFAULT NULL,
  _owner_supplied_item boolean DEFAULT false,
  _cost_estimate numeric DEFAULT NULL,
  _currency text DEFAULT NULL,
  _billing_responsibility text DEFAULT NULL,
  _included_in_package boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
  v_init uuid; v_target uuid; v_direction text;
  v_id uuid;
  v_fulfillment text;
  v_currency text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = _boarding_contract_id;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Boarding contract not found'; END IF;
  IF v_c.status <> 'active' THEN
    RAISE EXCEPTION 'Service requests require an active boarding contract (current: %)', v_c.status;
  END IF;

  IF public.is_tenant_member(v_user, v_c.owner_tenant_id) THEN
    v_init := v_c.owner_tenant_id; v_target := v_c.stable_tenant_id; v_direction := 'owner_to_stable';
  ELSIF public.is_tenant_member(v_user, v_c.stable_tenant_id) THEN
    v_init := v_c.stable_tenant_id; v_target := v_c.owner_tenant_id; v_direction := 'stable_to_owner';
    IF NOT public.has_permission(v_user, v_init, 'boarding.requests.create') THEN
      RAISE EXCEPTION 'Missing permission boarding.requests.create';
    END IF;
  ELSE
    RAISE EXCEPTION 'Caller is not a member of either side of the boarding contract';
  END IF;

  v_fulfillment := public._service_request_initial_fulfillment(_request_type);
  v_currency := COALESCE(_currency, (v_c.plan_snapshot->>'currency'), 'SAR');

  INSERT INTO public.service_requests (
    boarding_contract_id, horse_id, initiator_tenant_id, target_tenant_id, direction,
    request_type, details, provider_tenant_id, external_provider_name, owner_supplied_item,
    cost_estimate, currency, billing_responsibility, included_in_package,
    fulfillment_status, created_by
  ) VALUES (
    v_c.id, v_c.horse_id, v_init, v_target, v_direction,
    _request_type, COALESCE(_details,'{}'::jsonb), _provider_tenant_id, _external_provider_name, COALESCE(_owner_supplied_item,false),
    _cost_estimate, v_currency, _billing_responsibility, COALESCE(_included_in_package,false),
    v_fulfillment, v_user
  ) RETURNING id INTO v_id;

  INSERT INTO public.service_request_events (service_request_id, event_type, actor_user_id, actor_tenant_id, to_status)
  VALUES (v_id, 'created', v_user, v_init, 'pending');

  PERFORM public._notify_tenant_members(
    v_target,
    'service_request.created',
    'New service request',
    _request_type,
    'service_request',
    v_id,
    jsonb_build_object('direction', v_direction, 'request_type', _request_type, 'boarding_contract_id', v_c.id),
    v_user
  );

  RETURN jsonb_build_object('service_request_id', v_id, 'status', 'pending', 'direction', v_direction);
END;
$$;
REVOKE ALL ON FUNCTION public.create_service_request(uuid,text,jsonb,uuid,text,boolean,numeric,text,text,boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.create_service_request(uuid,text,jsonb,uuid,text,boolean,numeric,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_service_request(
  _service_request_id uuid,
  _decision text,
  _rejection_reason text DEFAULT NULL,
  _approved_cost numeric DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_r public.service_requests;
  v_c public.boarding_contracts;
  v_target_type text;
  v_new_status text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO v_r FROM public.service_requests WHERE id = _service_request_id FOR UPDATE;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'Service request not found'; END IF;
  IF v_r.status <> 'pending' THEN RAISE EXCEPTION 'Service request is not pending (current: %)', v_r.status; END IF;
  IF NOT public.is_tenant_member(v_user, v_r.target_tenant_id) THEN
    RAISE EXCEPTION 'Only the target tenant can respond';
  END IF;

  SELECT type INTO v_target_type FROM public.tenants WHERE id = v_r.target_tenant_id;
  IF v_target_type = 'stable' THEN
    IF NOT public.has_permission(v_user, v_r.target_tenant_id, 'boarding.requests.respond') THEN
      RAISE EXCEPTION 'Missing permission boarding.requests.respond';
    END IF;
  END IF;

  IF _decision = 'rejected' AND (COALESCE(trim(_rejection_reason),'') = '') THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  v_new_status := _decision;
  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = v_r.boarding_contract_id;

  UPDATE public.service_requests
     SET status = v_new_status,
         approved_cost = CASE WHEN _decision='approved' THEN COALESCE(_approved_cost, approved_cost) ELSE approved_cost END,
         rejection_reason = CASE WHEN _decision='rejected' THEN _rejection_reason ELSE rejection_reason END,
         responded_at = now(),
         responded_by = v_user,
         metadata = COALESCE(metadata,'{}'::jsonb) || COALESCE(_metadata,'{}'::jsonb)
   WHERE id = _service_request_id;

  INSERT INTO public.service_request_events (service_request_id, event_type, actor_user_id, actor_tenant_id, from_status, to_status, metadata)
  VALUES (_service_request_id, _decision, v_user, v_r.target_tenant_id, 'pending', v_new_status,
          jsonb_build_object('rejection_reason', _rejection_reason, 'approved_cost', _approved_cost));

  PERFORM public._notify_tenant_members(
    v_r.initiator_tenant_id,
    'service_request.' || _decision,
    'Service request ' || _decision,
    v_r.request_type,
    'service_request',
    _service_request_id,
    jsonb_build_object('request_type', v_r.request_type, 'boarding_contract_id', v_r.boarding_contract_id),
    v_user
  );

  RETURN jsonb_build_object('service_request_id', _service_request_id, 'status', v_new_status);
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_service_request(uuid,text,text,numeric,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.respond_to_service_request(uuid,text,text,numeric,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_service_request(
  _service_request_id uuid,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_r public.service_requests;
  v_is_initiator_member boolean;
  v_init_type text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_r FROM public.service_requests WHERE id = _service_request_id FOR UPDATE;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'Service request not found'; END IF;
  IF v_r.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be cancelled (current: %)', v_r.status; END IF;

  v_is_initiator_member := public.is_tenant_member(v_user, v_r.initiator_tenant_id);
  SELECT type INTO v_init_type FROM public.tenants WHERE id = v_r.initiator_tenant_id;

  IF v_is_initiator_member THEN
    IF v_init_type = 'stable'
       AND NOT public.has_permission(v_user, v_r.initiator_tenant_id, 'boarding.requests.cancel') THEN
      RAISE EXCEPTION 'Missing permission boarding.requests.cancel';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only the initiator tenant can cancel';
  END IF;

  UPDATE public.service_requests
     SET status = 'cancelled',
         rejection_reason = COALESCE(_reason, rejection_reason),
         responded_at = now(),
         responded_by = v_user
   WHERE id = _service_request_id;

  INSERT INTO public.service_request_events (service_request_id, event_type, actor_user_id, actor_tenant_id, from_status, to_status, metadata)
  VALUES (_service_request_id, 'cancelled', v_user, v_r.initiator_tenant_id, 'pending', 'cancelled',
          jsonb_build_object('reason', _reason));

  PERFORM public._notify_tenant_members(
    v_r.target_tenant_id,
    'service_request.cancelled',
    'Service request cancelled',
    v_r.request_type,
    'service_request',
    _service_request_id,
    jsonb_build_object('request_type', v_r.request_type, 'boarding_contract_id', v_r.boarding_contract_id),
    v_user
  );

  RETURN jsonb_build_object('service_request_id', _service_request_id, 'status', 'cancelled');
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_service_request(uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_service_request(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_service_request_fulfillment(
  _service_request_id uuid,
  _fulfillment_status text,
  _fulfilled_by_lab_request_id uuid DEFAULT NULL,
  _fulfilled_by_horse_order_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_r public.service_requests;
  v_complete boolean := false;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _fulfillment_status NOT IN ('not_required','pending_fulfillment','fulfilled') THEN
    RAISE EXCEPTION 'Invalid fulfillment_status';
  END IF;
  SELECT * INTO v_r FROM public.service_requests WHERE id = _service_request_id FOR UPDATE;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'Service request not found'; END IF;
  IF v_r.status <> 'approved' AND v_r.status <> 'completed' THEN
    RAISE EXCEPTION 'Fulfillment can only be updated on approved requests';
  END IF;
  IF NOT public.is_tenant_member(v_user, v_r.target_tenant_id) THEN
    RAISE EXCEPTION 'Only the responding tenant can update fulfillment';
  END IF;

  v_complete := (_fulfillment_status = 'fulfilled');

  UPDATE public.service_requests
     SET fulfillment_status = _fulfillment_status,
         fulfilled_by_lab_request_id = COALESCE(_fulfilled_by_lab_request_id, fulfilled_by_lab_request_id),
         fulfilled_by_horse_order_id = COALESCE(_fulfilled_by_horse_order_id, fulfilled_by_horse_order_id),
         status = CASE WHEN v_complete THEN 'completed' ELSE status END,
         metadata = COALESCE(metadata,'{}'::jsonb) || COALESCE(_metadata,'{}'::jsonb)
   WHERE id = _service_request_id;

  INSERT INTO public.service_request_events (service_request_id, event_type, actor_user_id, actor_tenant_id, from_status, to_status, metadata)
  VALUES (_service_request_id,
          CASE WHEN v_complete THEN 'completed' ELSE 'fulfillment_updated' END,
          v_user, v_r.target_tenant_id, v_r.status,
          CASE WHEN v_complete THEN 'completed' ELSE v_r.status END,
          jsonb_build_object('fulfillment_status', _fulfillment_status,
                             'fulfilled_by_lab_request_id', _fulfilled_by_lab_request_id,
                             'fulfilled_by_horse_order_id', _fulfilled_by_horse_order_id));

  IF v_complete THEN
    PERFORM public._notify_tenant_members(
      v_r.initiator_tenant_id,
      'service_request.completed',
      'Service request completed',
      v_r.request_type,
      'service_request',
      _service_request_id,
      jsonb_build_object('request_type', v_r.request_type, 'boarding_contract_id', v_r.boarding_contract_id),
      v_user
    );
  END IF;

  RETURN jsonb_build_object('service_request_id', _service_request_id,
                            'fulfillment_status', _fulfillment_status,
                            'status', CASE WHEN v_complete THEN 'completed' ELSE v_r.status END);
END;
$$;
REVOKE ALL ON FUNCTION public.update_service_request_fulfillment(uuid,text,uuid,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.update_service_request_fulfillment(uuid,text,uuid,uuid,jsonb) TO authenticated;
