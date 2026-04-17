-- Phase 5.2.2 — Migration 2: Functions and triggers

-- ============================================================
-- A) Expand a request-service into per-template child decision rows
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_expand_service_templates(
  p_lab_request_id uuid,
  p_service_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_ids uuid[];
BEGIN
  IF p_lab_request_id IS NULL OR p_service_id IS NULL THEN RETURN; END IF;

  -- Tenant from parent request
  SELECT tenant_id INTO v_tenant_id
  FROM public.lab_requests WHERE id = p_lab_request_id;

  IF v_tenant_id IS NULL THEN RETURN; END IF;

  -- Resolve template ids: prefer the request-service snapshot, fallback to catalog
  SELECT
    CASE
      WHEN lrs.template_ids_snapshot IS NOT NULL
        AND jsonb_typeof(lrs.template_ids_snapshot) = 'array'
        AND jsonb_array_length(lrs.template_ids_snapshot) > 0
      THEN ARRAY(SELECT jsonb_array_elements_text(lrs.template_ids_snapshot)::uuid)
      ELSE ARRAY(
        SELECT lst.template_id
        FROM public.lab_service_templates lst
        WHERE lst.service_id = p_service_id
          AND lst.tenant_id = v_tenant_id
        ORDER BY lst.sort_order, lst.created_at
      )
    END
  INTO v_template_ids
  FROM public.lab_request_services lrs
  WHERE lrs.lab_request_id = p_lab_request_id AND lrs.service_id = p_service_id;

  IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Insert one child row per template, idempotent
  INSERT INTO public.lab_request_service_templates (
    tenant_id, lab_request_id, service_id, template_id,
    template_name_snapshot, template_name_ar_snapshot, template_category_snapshot,
    is_required_snapshot, sort_order_snapshot, template_decision
  )
  SELECT
    v_tenant_id,
    p_lab_request_id,
    p_service_id,
    t.id,
    t.name,
    t.name_ar,
    t.category,
    COALESCE(lst.is_required, true),
    COALESCE(lst.sort_order, 0),
    'pending'::public.lab_template_decision
  FROM unnest(v_template_ids) WITH ORDINALITY AS u(template_id, ord)
  JOIN public.lab_templates t ON t.id = u.template_id
  LEFT JOIN public.lab_service_templates lst
    ON lst.service_id = p_service_id
    AND lst.template_id = t.id
    AND lst.tenant_id = v_tenant_id
  ON CONFLICT (lab_request_id, service_id, template_id) DO NOTHING;
END;
$$;

-- ============================================================
-- B) Recompute service decision from child templates
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_recompute_service_decision(
  p_lab_request_id uuid,
  p_service_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_accepted int;
  v_rejected int;
  v_pending int;
  v_new public.lab_service_decision;
BEGIN
  IF p_lab_request_id IS NULL OR p_service_id IS NULL THEN RETURN; END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE template_decision = 'accepted'),
    count(*) FILTER (WHERE template_decision = 'rejected'),
    count(*) FILTER (WHERE template_decision = 'pending')
  INTO v_total, v_accepted, v_rejected, v_pending
  FROM public.lab_request_service_templates
  WHERE lab_request_id = p_lab_request_id AND service_id = p_service_id;

  -- No template children: leave service_decision as-is (atomic / legacy fallback)
  IF v_total = 0 THEN RETURN; END IF;

  IF v_pending > 0 THEN
    v_new := 'pending';
  ELSIF v_accepted = v_total THEN
    v_new := 'accepted';
  ELSIF v_rejected = v_total THEN
    v_new := 'rejected';
  ELSE
    v_new := 'partial';
  END IF;

  UPDATE public.lab_request_services
  SET service_decision = v_new
  WHERE lab_request_id = p_lab_request_id
    AND service_id = p_service_id
    AND service_decision IS DISTINCT FROM v_new;

  -- Cascade: existing request-decision recompute (which itself cascades to submission)
  PERFORM public.fn_recompute_request_decision(p_lab_request_id);
END;
$$;

-- ============================================================
-- C) AFTER INSERT trigger on lab_request_services → expand templates
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_lrs_after_insert_expand_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_expand_service_templates(NEW.lab_request_id, NEW.service_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lrs_after_insert_expand_templates ON public.lab_request_services;
CREATE TRIGGER trg_lrs_after_insert_expand_templates
  AFTER INSERT ON public.lab_request_services
  FOR EACH ROW EXECUTE FUNCTION public.fn_lrs_after_insert_expand_templates();

-- ============================================================
-- D) AFTER trigger on lab_request_service_templates → recompute service
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_lrst_after_change_recompute_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_recompute_service_decision(OLD.lab_request_id, OLD.service_id);
    RETURN OLD;
  ELSE
    PERFORM public.fn_recompute_service_decision(NEW.lab_request_id, NEW.service_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_lrst_after_change_recompute_service ON public.lab_request_service_templates;
CREATE TRIGGER trg_lrst_after_change_recompute_service
  AFTER INSERT OR UPDATE OF template_decision OR DELETE
  ON public.lab_request_service_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_lrst_after_change_recompute_service();