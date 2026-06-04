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

  -- B2.3 narrow correction: enforce operational phase gate at the backend.
  -- These request types are only meaningful after the horse has physically arrived.
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