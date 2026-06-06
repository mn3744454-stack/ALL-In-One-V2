import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type {
  ContractTemplateRow, ContractTemplateVersionRow, ContractType,
  BodyDoc, VariableDef,
} from "@/contracts/docModel/types";

const sb = supabase as any;

export function useContractTemplates(opts: { contractType?: ContractType } = {}) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["contract-templates", tenantId, opts.contractType ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<ContractTemplateRow[]> => {
      let q = sb.from("contract_templates").select("*")
        .eq("tenant_id", tenantId)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (opts.contractType) q = q.eq("contract_type", opts.contractType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContractTemplateRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contract-templates"] });

  const create = useMutation({
    mutationFn: async (p: { contract_type: ContractType; name: string; name_ar?: string }) => {
      const { data, error } = await sb.rpc("create_contract_template", {
        _tenant_id: tenantId,
        _contract_type: p.contract_type,
        _name: p.name,
        _name_ar: p.name_ar ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success("Template created"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const archive = useMutation({
    mutationFn: async (template_id: string) => {
      const { error } = await sb.rpc("archive_contract_template", { _template_id: template_id });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Template archived"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const clone = useMutation({
    mutationFn: async (p: { template_id: string; new_name: string }) => {
      const { data, error } = await sb.rpc("clone_contract_template", {
        _template_id: p.template_id, _new_name: p.new_name,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success("Template cloned"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return { templates: query.data ?? [], isLoading: query.isLoading, create, archive, clone };
}

export function useContractTemplate(templateId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["contract-template", templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<{ template: ContractTemplateRow; versions: ContractTemplateVersionRow[] }> => {
      const [tRes, vRes] = await Promise.all([
        sb.from("contract_templates").select("*").eq("id", templateId).maybeSingle(),
        sb.from("contract_template_versions").select("*").eq("template_id", templateId).order("version_no", { ascending: false }),
      ]);
      if (tRes.error) throw tRes.error;
      if (vRes.error) throw vRes.error;
      return { template: tRes.data, versions: (vRes.data ?? []) as ContractTemplateVersionRow[] };
    },
  });

  const saveDraft = useMutation({
    mutationFn: async (p: { body_json: BodyDoc; variables_json: VariableDef[] }) => {
      const { data, error } = await sb.rpc("save_contract_template_draft", {
        _template_id: templateId,
        _body_json: p.body_json,
        _variables_json: p.variables_json,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contract-template", templateId] }); toast.success("Draft saved"); },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  const publish = useMutation({
    mutationFn: async (version_id: string) => {
      const { error } = await sb.rpc("publish_contract_template_version", { _version_id: version_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-template", templateId] });
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Published");
    },
    onError: (e: any) => toast.error(e?.message || "Error"),
  });

  return { ...query, saveDraft, publish };
}
