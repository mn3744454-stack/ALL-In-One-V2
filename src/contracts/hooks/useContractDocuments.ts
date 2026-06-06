import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type {
  ContractDocumentRow, ContractDocumentEventRow, ContractType,
  BodyDoc, VariableDef,
} from "@/contracts/docModel/types";

const sb = supabase as any;

export function useContractDocuments(opts: {
  contractType?: ContractType; boardingContractId?: string;
} = {}) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["contract-documents", tenantId, opts.contractType ?? "all", opts.boardingContractId ?? null],
    enabled: !!tenantId,
    queryFn: async (): Promise<ContractDocumentRow[]> => {
      // RLS lets the user see both own-tenant docs and recipient docs.
      let q = sb.from("contract_documents").select("*").order("created_at", { ascending: false });
      if (opts.contractType) q = q.eq("contract_type", opts.contractType);
      if (opts.boardingContractId) q = q.eq("boarding_contract_id", opts.boardingContractId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContractDocumentRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contract-documents"] });

  const createBlank = useMutation({
    mutationFn: async (p: { contract_type: ContractType; title: string; title_ar?: string }) => {
      const { data, error } = await sb.rpc("create_contract_document_blank", {
        _tenant_id: tenantId,
        _contract_type: p.contract_type,
        _title: p.title,
        _title_ar: p.title_ar ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success("Document created"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const createFromTemplate = useMutation({
    mutationFn: async (p: { template_id: string; title: string; title_ar?: string; boarding_contract_id?: string }) => {
      const { data, error } = await sb.rpc("create_contract_document_from_template", {
        _tenant_id: tenantId,
        _template_id: p.template_id,
        _title: p.title,
        _title_ar: p.title_ar ?? null,
        _boarding_contract_id: p.boarding_contract_id ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success("Document created from template"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return { documents: query.data ?? [], isLoading: query.isLoading, createBlank, createFromTemplate };
}

export function useContractDocument(documentId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["contract-document", documentId],
    enabled: !!documentId,
    queryFn: async (): Promise<{ document: ContractDocumentRow; events: ContractDocumentEventRow[] }> => {
      const [dRes, eRes] = await Promise.all([
        sb.from("contract_documents").select("*").eq("id", documentId).maybeSingle(),
        sb.from("contract_document_events").select("*").eq("document_id", documentId).order("created_at", { ascending: false }),
      ]);
      if (dRes.error) throw dRes.error;
      if (eRes.error) throw eRes.error;
      return { document: dRes.data, events: (eRes.data ?? []) as ContractDocumentEventRow[] };
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contract-document", documentId] });
    qc.invalidateQueries({ queryKey: ["contract-documents"] });
  };

  const saveDraft = useMutation({
    mutationFn: async (p: { document_json: BodyDoc; variables_json: VariableDef[]; variable_values: Record<string, any> }) => {
      const { error } = await sb.rpc("save_contract_document_draft", {
        _document_id: documentId,
        _document_json: p.document_json,
        _variables_json: p.variables_json,
        _variable_values: p.variable_values,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Draft saved"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const send = useMutation({
    mutationFn: async (recipient_tenant_id?: string) => {
      const { error } = await sb.rpc("send_contract_document_for_review", {
        _document_id: documentId,
        _recipient_tenant_id: recipient_tenant_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Sent for review"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await sb.rpc("approve_contract_document", { _document_id: documentId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Document approved"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const reject = useMutation({
    mutationFn: async (reason?: string) => {
      const { error } = await sb.rpc("reject_contract_document", {
        _document_id: documentId, _reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Document rejected"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await sb.rpc("archive_contract_document", { _document_id: documentId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Document archived"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return { ...query, saveDraft, send, approve, reject, archive };
}
