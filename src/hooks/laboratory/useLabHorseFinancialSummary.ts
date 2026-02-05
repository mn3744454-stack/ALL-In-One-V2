import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface LabHorseInvoiceItem {
  itemId: string;
  description: string;
  sampleId: string;
  sampleDailyNumber: number | null;
  physicalSampleId: string | null;
  templateNames: string[];
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface LabHorseInvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  issueDate: string;
  clientName: string | null;
  items: LabHorseInvoiceItem[];
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
 * Uses ledger_entries as source of truth for paid/outstanding calculations.
 * Enhanced to include sample details for human-readable invoice item labels.
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

      // Step 1: Get all samples for this lab horse
      const { data: samples, error: samplesError } = await supabase
        .from("lab_samples")
        .select(`
          id,
          daily_number,
          physical_sample_id
        `)
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

      // Build sample lookup for quick access
      const sampleMap = new Map(samples!.map(s => [s.id, s]));

      // Step 2: Get invoice_items where entity_type='lab_sample' and entity_id in sampleIds
      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          id,
          description,
          unit_price,
          quantity,
          total_price,
          entity_id,
          invoice_id,
          invoice:invoices!invoice_items_invoice_id_fkey(
            id,
            invoice_number,
            status,
            total_amount,
            issue_date,
            client_name,
            client_id
          )
        `)
        .eq("entity_type", "lab_sample")
        .in("entity_id", sampleIds);

      if (itemsError) {
        console.error("Error fetching invoice items:", itemsError);
        return { totalSamples, totalBilled: 0, totalPaid: 0, outstanding: 0, invoices: [] };
      }

      // Step 3: Get unique invoice IDs and fetch payment ledger entries
      const invoiceIds = [...new Set((invoiceItems || []).map(i => (i.invoice as any)?.id).filter(Boolean))];
      
      // Fetch payment entries from ledger for all relevant invoices
      let paymentsByInvoice: Record<string, number> = {};
      if (invoiceIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from("ledger_entries")
          .select("reference_id, amount")
          .eq("tenant_id", tenantId)
          .eq("reference_type", "invoice")
          .eq("entry_type", "payment")
          .in("reference_id", invoiceIds);

        if (!paymentsError && payments) {
          for (const p of payments) {
            const refId = p.reference_id;
            if (refId) {
              paymentsByInvoice[refId] = (paymentsByInvoice[refId] || 0) + Math.abs(Number(p.amount));
            }
          }
        }
      }

      // Step 4: Aggregate financial data using ledger-derived payments
      let totalBilled = 0;
      let totalPaid = 0;
      const invoiceDataMap = new Map<string, LabHorseInvoiceSummary>();

      for (const item of invoiceItems || []) {
        const lineTotal = item.total_price || 0;
        totalBilled += lineTotal;

        const invoice = item.invoice as any;
        if (invoice) {
          // Get sample info for this item
          const sample = sampleMap.get(item.entity_id);

          // Create invoice item with sample details
          const invoiceItem: LabHorseInvoiceItem = {
            itemId: item.id,
            description: item.description || '',
            sampleId: item.entity_id,
            sampleDailyNumber: sample?.daily_number || null,
            physicalSampleId: sample?.physical_sample_id || null,
            templateNames: [],
            unitPrice: item.unit_price || 0,
            quantity: item.quantity || 1,
            totalPrice: lineTotal,
          };

          // Track unique invoices with ledger-derived payment data
          if (!invoiceDataMap.has(invoice.id)) {
            const invoiceTotalAmount = invoice.total_amount || 0;
            const invoicePaidAmount = paymentsByInvoice[invoice.id] || 0;
            const invoiceOutstandingAmount = Math.max(0, invoiceTotalAmount - invoicePaidAmount);
            
            // Compute status from ledger
            let computedStatus = invoice.status;
            if (invoiceOutstandingAmount <= 0.01) {
              computedStatus = 'paid';
            } else if (invoicePaidAmount > 0) {
              computedStatus = 'partial';
            }

            invoiceDataMap.set(invoice.id, {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoice_number || '',
              status: computedStatus,
              totalAmount: invoiceTotalAmount,
              paidAmount: invoicePaidAmount,
              outstandingAmount: invoiceOutstandingAmount,
              issueDate: invoice.issue_date || '',
              clientName: invoice.client_name || null,
              items: [invoiceItem],
            });
          } else {
            invoiceDataMap.get(invoice.id)!.items.push(invoiceItem);
          }
        }
      }

      // Calculate total paid from ledger data
      for (const inv of invoiceDataMap.values()) {
        totalPaid += inv.paidAmount;
      }

      const outstanding = totalBilled - totalPaid;
      const invoices = Array.from(invoiceDataMap.values());

      return {
        totalSamples,
        totalBilled,
        totalPaid,
        outstanding,
        invoices,
      };
    },
    enabled: !!tenantId && !!labHorseId,
    staleTime: 30000,
  });
}
