
-- Phase 5.2.2 Hotfix — Atomic template-less service decidability
-- 1) Allow NULL template_id for atomic-service fallback rows
ALTER TABLE public.lab_request_service_templates
  ALTER COLUMN template_id DROP NOT NULL;

-- 2) Replace the unique constraint with two partial unique indexes that handle NULLs cleanly
ALTER TABLE public.lab_request_service_templates
  DROP CONSTRAINT IF EXISTS ux_lrst_request_service_template;

CREATE UNIQUE INDEX IF NOT EXISTS ux_lrst_request_service_template
  ON public.lab_request_service_templates (lab_request_id, service_id, template_id)
  WHERE template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_lrst_request_service_null_template
  ON public.lab_request_service_templates (lab_request_id, service_id)
  WHERE template_id IS NULL;

-- 3) Fix expansion function: when both snapshot and catalog are empty,
--    insert exactly one fallback child row with template_id IS NULL,
--    snapshotting the service name so the row label remains meaningful.
CREATE OR REPLACE FUNCTION public.fn_expand_service_templates(p_lab_request_id uuid, p_service_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_template_ids uuid[];
  v_service_name text;
  v_service_name_ar text;
  v_service_decision public.lab_service_decision;
BEGIN
  IF p_lab_request_id IS NULL OR p_service_id IS NULL THEN RETURN; END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.lab_requests WHERE id = p_lab_request_id;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  -- Load service snapshot + current decision for fallback path
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
    END,
    lrs.service_name_snapshot,
    lrs.service_name_ar_snapshot,
    lrs.service_decision
  INTO v_template_ids, v_service_name, v_service_name_ar, v_service_decision
  FROM public.lab_request_services lrs
  WHERE lrs.lab_request_id = p_lab_request_id AND lrs.service_id = p_service_id;

  IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
    -- Atomic template-less service: insert one fallback child row
    INSERT INTO public.lab_request_service_templates (
      tenant_id, lab_request_id, service_id, template_id,
      template_name_snapshot, template_name_ar_snapshot, template_category_snapshot,
      is_required_snapshot, sort_order_snapshot, template_decision
    )
    VALUES (
      v_tenant_id,
      p_lab_request_id,
      p_service_id,
      NULL,
      v_service_name,
      v_service_name_ar,
      NULL,
      true,
      0,
      CASE
        WHEN v_service_decision = 'accepted' THEN 'accepted'::public.lab_template_decision
        WHEN v_service_decision = 'rejected' THEN 'rejected'::public.lab_template_decision
        ELSE 'pending'::public.lab_template_decision
      END
    )
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  -- Composite path: insert one row per template, idempotent
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
$function$;

-- 4) Backfill: any lab_request_services row with zero child rows gets one fallback child,
--    propagating its current service_decision down to template_decision.
INSERT INTO public.lab_request_service_templates (
  tenant_id, lab_request_id, service_id, template_id,
  template_name_snapshot, template_name_ar_snapshot, template_category_snapshot,
  is_required_snapshot, sort_order_snapshot, template_decision
)
SELECT
  r.tenant_id,
  lrs.lab_request_id,
  lrs.service_id,
  NULL,
  lrs.service_name_snapshot,
  lrs.service_name_ar_snapshot,
  NULL,
  true,
  0,
  CASE
    WHEN lrs.service_decision = 'accepted' THEN 'accepted'::public.lab_template_decision
    WHEN lrs.service_decision = 'rejected' THEN 'rejected'::public.lab_template_decision
    ELSE 'pending'::public.lab_template_decision
  END
FROM public.lab_request_services lrs
JOIN public.lab_requests r ON r.id = lrs.lab_request_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.lab_request_service_templates c
  WHERE c.lab_request_id = lrs.lab_request_id
    AND c.service_id = lrs.service_id
);
