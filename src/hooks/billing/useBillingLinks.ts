import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type BillingLinkKind = "deposit" | "final" | "refund" | "credit_note";

export interface BillingLink {
  id: string;
  tenant_id: string;
  source_type: string;
  source_id: string;
  invoice_id: string;
  link_kind: BillingLinkKind;
  amount: number | null;
  created_at: string;
  created_by: string | null;
}

export interface CreateBillingLinkInput {
  source_type: string;
  source_id: string;
  invoice_id: string;
  link_kind: BillingLinkKind;
  amount?: number | null;
}

export function useBillingLinks(sourceType?: string, sourceId?: string) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  // Fetch links for a specific source
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["billing-links", tenantId, sourceType, sourceId],
    queryFn: async (): Promise<BillingLink[]> => {
      if (!tenantId || !sourceType || !sourceId) return [];

      const { data, error } = await supabase
        .from("billing_links")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching billing links:", error);
        return [];
      }

      return data as BillingLink[];
    },
    enabled: !!tenantId && !!sourceType && !!sourceId,
  });

  // Create billing link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (input: CreateBillingLinkInput): Promise<BillingLink | null> => {
      if (!tenantId || !user?.id) {
        throw new Error("No tenant or user");
      }

      const { data, error } = await supabase
        .from("billing_links")
        .insert({
          tenant_id: tenantId,
          source_type: input.source_type,
          source_id: input.source_id,
          invoice_id: input.invoice_id,
          link_kind: input.link_kind,
          amount: input.amount ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BillingLink;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["billing-links", tenantId, variables.source_type, variables.source_id] 
      });
      queryClient.invalidateQueries({ queryKey: ["billing-links", tenantId] });
    },
    onError: (error: Error) => {
      console.error("Error creating billing link:", error);
      toast.error("Failed to create billing link");
    },
  });

  // Get links for an invoice
  const getLinksForInvoice = async (invoiceId: string): Promise<BillingLink[]> => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from("billing_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching billing links for invoice:", error);
      return [];
    }

    return data as BillingLink[];
  };

  // Check if a source has any billing links
  const hasDeposit = links.some((link) => link.link_kind === "deposit");
  const hasFinal = links.some((link) => link.link_kind === "final");
  const depositTotal = links
    .filter((link) => link.link_kind === "deposit")
    .reduce((sum, link) => sum + (link.amount || 0), 0);

  return {
    links,
    isLoading,
    createLink: createLinkMutation.mutate,
    createLinkAsync: createLinkMutation.mutateAsync,
    isCreating: createLinkMutation.isPending,
    getLinksForInvoice,
    hasDeposit,
    hasFinal,
    depositTotal,
  };
}
