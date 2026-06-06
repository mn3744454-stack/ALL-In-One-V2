
-- B3a: Fix _notify_tenant_members argument order in the four service-request RPCs
-- and wrap notify calls in a non-blocking exception block.
-- Canonical signature: (_tenant_id, _event_type, _title, _body, _entity_type, _entity_id, _exclude_user_id uuid, _metadata jsonb)

CREATE OR REPLACE FUNCTION public.create_service_request(_boarding_contract_id uuid, _request_type text, _details jsonb DEFAULT '{}'::jsonb, _provider_tenant_id uuid DEFAULT NULL::uuid, _external_provider_name text DEFAULT NULL::text, _owner_supplied_item boolean DEFAULT false, _cost_estimate numeric DEFAULT NULL::numeric, _currency text DEFAULT NULL::text, _billing_responsibility text DEFAULT NULL::text, _included_in_package boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _request_type IN ('extra_lab', 'extra_vet_visit', 'extra_supplement', 'movement')
     AND COALESCE(v_c.operational_phase, 'awaiting_arrival')
         NOT IN ('arrived_pending_placement', 'admitted') THEN
    RAISE EXCEPTION 'This request type is only available after the horse arrives';
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

  BEGIN
    PERFORM public._notify_tenant_members(
      v_target,
      'service_request.created',
      'New service request',
      _request_type,
      'service_request',
      v_id,
      v_user,
      jsonb_build_object('direction', v_direction, 'request_type', _request_type, 'boarding_contract_id', v_c.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'service_request notify failed (id=%, event=%): %', v_id, 'service_request.created', SQLERRM;
  END;

  RETURN jsonb_build_object('service_request_id', v_id, 'status', 'pending', 'direction', v_direction);
END;
$function$;


CREATE OR REPLACE FUNCTION public.respond_to_service_request(_service_request_id uuid, _decision text, _rejection_reason text DEFAULT NULL::text, _approved_cost numeric DEFAULT NULL::numeric, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  BEGIN
    PERFORM public._notify_tenant_members(
      v_r.initiator_tenant_id,
      'service_request.' || _decision,
      'Service request ' || _decision,
      v_r.request_type,
      'service_request',
      _service_request_id,
      v_user,
      jsonb_build_object('request_type', v_r.request_type, 'boarding_contract_id', v_r.boarding_contract_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'service_request notify failed (id=%, event=%): %', _service_request_id, 'service_request.' || _decision, SQLERRM;
  END;

  RETURN jsonb_build_object('service_request_id', _service_request_id, 'status', v_new_status);
END;
$function$;


CREATE OR REPLACE FUNCTION public.cancel_service_request(_service_request_id uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  BEGIN
    PERFORM public._notify_tenant_members(
      v_r.target_tenant_id,
      'service_request.cancelled',
      'Service request cancelled',
      v_r.request_type,
      'service_request',
      _service_request_id,
      v_user,
      jsonb_build_object('request_type', v_r.request_type, 'boarding_contract_id', v_r.boarding_contract_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'service_request notify failed (id=%, event=%): %', _service_request_id, 'service_request.cancelled', SQLERRM;
  END;

  RETURN jsonb_build_object('service_request_id', _service_request_id, 'status', 'cancelled');
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_service_request_fulfillment(_service_request_id uuid, _fulfillment_status text, _fulfilled_by_lab_request_id uuid DEFAULT NULL::uuid, _fulfilled_by_horse_order_id uuid DEFAULT NULL::uuid, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    BEGIN
      PERFORM public._notify_tenant_members(
        v_r.initiator_tenant_id,
        'service_request.completed',
        'Service request completed',
        v_r.request_type,
        'service_request',
        _service_request_id,
        v_user,
        jsonb_build_object('request_type', v_r.request_type, 'boarding_contract_id', v_r.boarding_contract_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'service_request notify failed (id=%, event=%): %', _service_request_id, 'service_request.completed', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('service_request_id', _service_request_id,
                            'fulfillment_status', _fulfillment_status,
                            'status', CASE WHEN v_complete THEN 'completed' ELSE v_r.status END);
END;
$function$;
