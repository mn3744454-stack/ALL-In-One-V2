-- Fix security definer view issue by dropping and recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.academy_booking_consumption;

CREATE OR REPLACE VIEW public.academy_booking_consumption
WITH (security_invoker = true)
AS
SELECT 
  tenant_id,
  date_trunc('month', created_at) as month,
  COUNT(*)::INTEGER as total_bookings,
  COUNT(*) FILTER (WHERE status = 'confirmed')::INTEGER as confirmed_bookings
FROM public.academy_bookings
GROUP BY tenant_id, date_trunc('month', created_at);