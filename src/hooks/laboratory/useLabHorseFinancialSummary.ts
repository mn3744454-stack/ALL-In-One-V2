import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface LabHorseInvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  issueDate: string;
  clientName: string | null;
}

export interface LabHorseFinancialSummary {
  totalSamples: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  invoices: LabHorseInvoiceSummary[];
}

/**
 * Hook to fetch financial summary for a lab horse.
 * Uses the authoritative linkage: lab_samples → invoice_items (entity_type='lab_sample') → invoices
 */
export function useLabHorseFinancialSummary(labHorseId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ['lab-horse-financial', tenantId, labHorseId],
    queryFn: async (): Promise<LabHorseFinancialSummary> => {
      if (!tenantId || !labHorseId) {
        return { totalSamples: 0, totalBilled: 0, totalPaid: 0, outstanding: 0, invoices: [] };
      }

      // Step 1: Get all samples for this lab horse (tenant-scoped)
      const { data: samples, error: samplesError } = await supabase
        .from("lab_samples")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("lab_horse_id", labHorseId);

      if (samplesError) {
        console.error("Error fetching samples for financial summary:", samplesError);
        return { totalSamples: 0, totalBilled: 0, totalPaid: 0, outstanding: 0, invoices: [] };
      }

      const sampleIds = (samples || []).map(s => s.id);
      const totalSamples = sampleIds.length;

      if (sampleIds.length === 0) {
        return { totalSamples: 0, totalBilled: 0, totalPaid: 0, outstanding: 0, invoices: [] };
      }

      // Step 2: Get invoice_items where entity_type='lab_sample' and entity_id in sampleIds
      // Also join to invoices to get status and details
      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          id,
          total_price,
          entity_id,
          invoice_id,
          invoice:invoices!invoice_items_invoice_id_fkey(
            id,
            invoice_number,
            status,
            total_amount,
            issue_date,
            client_name
          )
        `)
        .eq("entity_type", "lab_sample")
        .in("entity_id", sampleIds);

      if (itemsError) {
        console.error("Error fetching invoice items:", itemsError);
        return { totalSamples, totalBilled: 0, totalPaid: 0, outstanding: 0, invoices: [] };
      }

      // Step 3: Aggregate financial data
      let totalBilled = 0;
      let totalPaid = 0;
      const invoiceMap = new Map<string, LabHorseInvoiceSummary>();

      for (const item of invoiceItems || []) {
        const lineTotal = item.total_price || 0;
        totalBilled += lineTotal;

        // Access the joined invoice data
        const invoice = item.invoice as any;
        if (invoice) {
          // Track unique invoices
          if (!invoiceMap.has(invoice.id)) {
            invoiceMap.set(invoice.id, {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoice_number || '',
              status: invoice.status || 'draft',
              totalAmount: invoice.total_amount || 0,
              issueDate: invoice.issue_date || '',
              clientName: invoice.client_name || null,
            });
          }

          // If invoice is paid, count this line as paid
          if (invoice.status === 'paid') {
            totalPaid += lineTotal;
          }
        }
      }

      const outstanding = totalBilled - totalPaid;
      const invoices = Array.from(invoiceMap.values());

      return {
        totalSamples,
        totalBilled,
        totalPaid,
        outstanding,
        invoices,
      };
    },
    enabled: !!tenantId && !!labHorseId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
