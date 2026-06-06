
REVOKE EXECUTE ON FUNCTION public.create_contract_template(uuid,public.contract_type,text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_contract_template_draft(uuid,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publish_contract_template_version(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_contract_template(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clone_contract_template(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_contract_document_from_template(uuid,uuid,text,text,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_contract_document_blank(uuid,public.contract_type,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_contract_document_draft(uuid,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_contract_document_for_review(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_contract_document(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_contract_document(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_contract_document(uuid) FROM PUBLIC, anon;
