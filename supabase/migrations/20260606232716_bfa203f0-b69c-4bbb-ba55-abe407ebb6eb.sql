-- B2.5e.1 narrow correction: extend create_contract_document_blank to accept
-- optional _boarding_contract_id, with tenant-scoped validation matching the
-- from-template RPC. Drop old 4-arg signature (it referenced the previous
-- parameter list) so REVOKEs and grants stay clean.

DROP FUNCTION IF EXISTS public.create_contract_document_blank(uuid, public.contract_type, text, text);

CREATE OR REPLACE FUNCTION public.create_contract_document_blank(
  _tenant_id UUID,
  _contract_type public.contract_type,
  _title TEXT,
  _title_ar TEXT DEFAULT NULL,
  _boarding_contract_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doc UUID;
  _stable UUID;
  _owner UUID;
  _recipient UUID;
BEGIN
  IF NOT public.has_permission(auth.uid(), _tenant_id, 'contracts.documents.create') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF _boarding_contract_id IS NOT NULL THEN
    SELECT bc.stable_tenant_id, bc.owner_tenant_id
      INTO _stable, _owner
      FROM public.boarding_contracts bc
      WHERE bc.id = _boarding_contract_id;

    IF _stable IS NULL THEN
      RAISE EXCEPTION 'boarding_contract_not_found';
    END IF;

    -- Caller's tenant must be a participant of the boarding contract.
    IF _tenant_id <> _stable AND _tenant_id <> _owner THEN
      RAISE EXCEPTION 'boarding_contract_tenant_mismatch';
    END IF;

    _recipient := CASE WHEN _stable = _tenant_id THEN _owner ELSE _stable END;
  END IF;

  INSERT INTO public.contract_documents(
    tenant_id, contract_type, title, title_ar,
    boarding_contract_id, recipient_tenant_id, created_by
  ) VALUES (
    _tenant_id, _contract_type, _title, _title_ar,
    _boarding_contract_id, _recipient, auth.uid()
  ) RETURNING id INTO _doc;

  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id, metadata)
  VALUES (
    _doc, 'created', _tenant_id, auth.uid(),
    CASE WHEN _boarding_contract_id IS NOT NULL
         THEN jsonb_build_object('boarding_contract_id', _boarding_contract_id)
         ELSE '{}'::jsonb END
  );

  RETURN _doc;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_contract_document_blank(uuid, public.contract_type, text, text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_contract_document_blank(uuid, public.contract_type, text, text, uuid) TO authenticated;