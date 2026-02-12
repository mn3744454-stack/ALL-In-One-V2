DROP FUNCTION IF EXISTS public.get_lab_request_threads();

CREATE FUNCTION public.get_lab_request_threads()
RETURNS TABLE (
  request_id uuid,
  horse_name text,
  horse_name_ar text,
  test_description text,
  last_message_body text,
  last_message_at timestamptz,
  last_sender_tenant_id uuid,
  message_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lr.id AS request_id,
    h.name AS horse_name,
    h.name_ar AS horse_name_ar,
    lr.test_description,
    lm.body AS last_message_body,
    lm.created_at AS last_message_at,
    lm.sender_tenant_id AS last_sender_tenant_id,
    (SELECT count(*) FROM lab_request_messages WHERE request_id = lr.id) AS message_count
  FROM lab_requests lr
  JOIN horses h ON h.id = lr.horse_id
  JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_tenant_id
    FROM lab_request_messages m
    WHERE m.request_id = lr.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND (tm.tenant_id = lr.tenant_id OR tm.tenant_id = lr.lab_tenant_id)
  )
  ORDER BY lm.created_at DESC
  LIMIT 50;
$$;