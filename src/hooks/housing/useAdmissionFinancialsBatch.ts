import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

/**
 * B2-F1-DISPLAY-TRUTH — Batched read-side financial truth for boarding admissions.
 *
 * For each admission id, computes:
 *   - hasBoardingLink: any billing_links(source_type='boarding')
 *   - billed:          sum of total_amount across linked, financially-active invoices
 *   - paid:            sum of |amount| across ledger_entries(entry_type='payment')
 *   - balance:         billed - paid (clamped at 0 if negative for display safety)
 *
 * This is the same model used by useAdmissionFinancials, batched to avoid N+1.
 * Read-only. Does not mutate invoices, billing_links, ledger_entries, or
 * boarding_admissions.balance_cleared.
 */
export interface AdmissionFinancialsBatchEntry {
  hasBoardingLink: boolean;
  billed: number;
  paid: number;
  balance: number;
}

const FINANCIALLY_ACTIVE = ['approved', 'shared', 'paid', 'overdue', 'partial', 'issued'];

export function useAdmissionFinancialsBatch(admissionIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const sortedKey = [...admissionIds].sort().join(',');

  const { data: map = new Map<string, AdmissionFinancialsBatchEntry>(), isLoading } = useQuery({
    queryKey: ['admission-financials-batch', tenantId, sortedKey],
    queryFn: async () => {
      const result = new Map<string, AdmissionFinancialsBatchEntry>();
      if (!tenantId || admissionIds.length === 0) return result;

      // 1. Boarding billing links for these admissions
      const { data: links } = await supabase
        .from('billing_links')
        .select('source_id, invoice_id')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'boarding')
        .in('source_id', admissionIds);

      const linksBySource = new Map<string, string[]>(); // admissionId -> invoiceIds
      const allInvoiceIds = new Set<string>();
      (links || []).forEach((l: { source_id: string; invoice_id: string }) => {
        if (!l.invoice_id) return;
        const arr = linksBySource.get(l.source_id) ?? [];
        arr.push(l.invoice_id);
        linksBySource.set(l.source_id, arr);
        allInvoiceIds.add(l.invoice_id);
      });

      // Initialize: any admission with a link gets hasBoardingLink even if invoice missing
      for (const id of admissionIds) {
        result.set(id, {
          hasBoardingLink: linksBySource.has(id),
          billed: 0,
          paid: 0,
          balance: 0,
        });
      }

      if (allInvoiceIds.size === 0) return result;

      const invoiceIdList = Array.from(allInvoiceIds);

      // 2. Invoice totals (financially active only)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, status')
        .in('id', invoiceIdList)
        .in('status', FINANCIALLY_ACTIVE);

      const invoiceTotal = new Map<string, number>();
      (invoices || []).forEach((inv: { id: string; total_amount: number }) => {
        invoiceTotal.set(inv.id, Number(inv.total_amount) || 0);
      });

      // 3. Payment entries against those invoices
      const { data: payments } = await supabase
        .from('ledger_entries')
        .select('reference_id, amount')
        .eq('tenant_id', tenantId)
        .eq('reference_type', 'invoice')
        .eq('entry_type', 'payment')
        .in('reference_id', invoiceIdList);

      const invoicePaid = new Map<string, number>();
      (payments || []).forEach((p: { reference_id: string; amount: number }) => {
        const v = Math.abs(Number(p.amount) || 0);
        invoicePaid.set(p.reference_id, (invoicePaid.get(p.reference_id) || 0) + v);
      });

      // 4. Roll up per admission
      for (const [admissionId, invoiceIds] of linksBySource.entries()) {
        let billed = 0;
        let paid = 0;
        for (const invId of invoiceIds) {
          billed += invoiceTotal.get(invId) || 0;
          paid += invoicePaid.get(invId) || 0;
        }
        const balance = Math.max(billed - paid, 0);
        result.set(admissionId, {
          hasBoardingLink: true,
          billed,
          paid,
          balance,
        });
      }

      return result;
    },
    enabled: !!tenantId && admissionIds.length > 0,
  });

  const get = (admissionId: string): AdmissionFinancialsBatchEntry =>
    (map as Map<string, AdmissionFinancialsBatchEntry>).get(admissionId) ?? {
      hasBoardingLink: false,
      billed: 0,
      paid: 0,
      balance: 0,
    };

  return { map: map as Map<string, AdmissionFinancialsBatchEntry>, get, isLoading };
}
