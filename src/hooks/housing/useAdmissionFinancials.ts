import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface AdmissionFinancialSummary {
  admissionBilled: number;
  admissionPaid: number;
  admissionBalance: number;
  /** Accrued boarding value (rate × days) */
  accruedValue: number;
  /** Unbilled = accrued - billed (clamped to 0) */
  unbilledValue: number;
  clientLedgerBalance: number;
  clientCreditLimit: number | null;
  clientAvailableCredit: number | null;
  depositTotal: number;
  hasDeposit: boolean;
}

/**
 * Fetches financial summary for an admission and its associated client.
 * Uses billing_links (source_type='boarding') + ledger balance view.
 */
export function useAdmissionFinancials(admissionId: string | null, clientId: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['admission-financials', tenantId, admissionId, clientId],
    queryFn: async (): Promise<AdmissionFinancialSummary> => {
      const result: AdmissionFinancialSummary = {
        admissionBilled: 0,
        admissionPaid: 0,
        admissionBalance: 0,
        clientLedgerBalance: 0,
        clientCreditLimit: null,
        clientAvailableCredit: null,
        depositTotal: 0,
        hasDeposit: false,
      };

      if (!tenantId) return result;

      // 1. Admission-scoped billing via billing_links
      if (admissionId) {
        const { data: links } = await supabase
          .from('billing_links')
          .select('link_kind, amount, invoice_id')
          .eq('tenant_id', tenantId)
          .eq('source_type', 'boarding')
          .eq('source_id', admissionId);

        if (links) {
          for (const link of links) {
            const amt = link.amount || 0;
            if (link.link_kind === 'deposit') {
              result.depositTotal += amt;
              result.hasDeposit = true;
            }
          }

          // Fetch invoice totals for linked invoices — only financially active statuses
          const FINANCIALLY_ACTIVE = ['approved', 'shared', 'paid', 'overdue', 'partial', 'issued'];
          const invoiceIds = links.map(l => l.invoice_id).filter(Boolean);
          if (invoiceIds.length > 0) {
            const { data: invoices } = await supabase
              .from('invoices')
              .select('id, total_amount, status')
              .in('id', invoiceIds)
              .in('status', FINANCIALLY_ACTIVE);

            if (invoices) {
              for (const inv of invoices) {
                result.admissionBilled += Number(inv.total_amount) || 0;
              }
            }

            // Get payments from ledger entries linked to these invoices
            const { data: payments } = await supabase
              .from('ledger_entries')
              .select('amount')
              .eq('tenant_id', tenantId)
              .eq('entry_type', 'payment')
              .in('reference_id', invoiceIds);

            if (payments) {
              for (const p of payments) {
                // Payments are negative in ledger
                result.admissionPaid += Math.abs(Number(p.amount) || 0);
              }
            }
          }
        }
        result.admissionBalance = result.admissionBilled - result.admissionPaid;
      }

      // 2. Client-level ledger balance + credit limit
      if (clientId) {
        const { data: balanceData } = await (supabase as any)
          .from('v_customer_ledger_balances')
          .select('balance')
          .eq('client_id', clientId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        result.clientLedgerBalance = balanceData?.balance || 0;

        const { data: clientData } = await supabase
          .from('clients')
          .select('credit_limit')
          .eq('id', clientId)
          .maybeSingle();

        if (clientData?.credit_limit) {
          result.clientCreditLimit = clientData.credit_limit;
          const used = Math.max(result.clientLedgerBalance, 0);
          result.clientAvailableCredit = clientData.credit_limit - used;
        }
      }

      return result;
    },
    enabled: !!tenantId && !!(admissionId || clientId),
  });
}
