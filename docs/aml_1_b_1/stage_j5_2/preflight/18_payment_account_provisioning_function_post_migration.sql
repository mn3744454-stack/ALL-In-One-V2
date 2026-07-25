CREATE OR REPLACE FUNCTION public._finance_provision_tenant_payment_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
  VALUES ('tenant'::public.payment_owner_type, NEW.id, true)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END
$function$
