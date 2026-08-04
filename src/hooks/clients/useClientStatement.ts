import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  compareEconomicOrder,
  toEconomicDateString,
  toCents,
  fromCents,
} from "@/lib/finance/effectiveDate";

export interface StatementEntry {
  id: string;
  /**
   * Stage C · Slice A — Canonical ECONOMIC date (yyyy-MM-dd), sourced from
   * `ledger_entries.effective_date`. Date-only: never render a time for it.
   */
  date: string;
  /** Audit timestamp (`created_at`). Deterministic tie-breaker + audit only. */
  createdAt: string | null;
  entry_type: "invoice" | "payment" | "credit" | "adjustment";
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  debit: number; // Amount added to balance (invoice)
  credit: number; // Amount subtracted from balance (payment)
  /**
   * Stored `ledger_entries.balance_after` — HISTORICAL AUDIT METADATA ONLY.
   * It follows the accepted Stage-A `created_at` sequence and is NOT the
   * display authority. The statement derives the displayed running balance
   * from the opening balance plus cumulative ordered amounts.
   */
  balance: number;
  payment_method: string | null;
}

export interface ClientStatementSummary {
  clientId: string;
  clientName?: string;
  entries: StatementEntry[];
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  openingBalance: number;
}

/** Page size for the pre-range opening-balance aggregate read. */
const OPENING_BALANCE_PAGE_SIZE = 1000;

/**
 * Hook to fetch a client statement from `ledger_entries`.
 *
 * Stage C · Slice A contract:
 *   - economic chronology  = `effective_date` (date-only, inclusive bounds);
 *   - deterministic order  = effective_date ASC, created_at ASC, id ASC;
 *   - opening balance      = SUM(amount) WHERE effective_date < dateFrom;
 *   - running balance      = derived downstream from opening + ordered amounts;
 *   - stored `balance_after` is never the display authority.
 */
export function useClientStatement(
  clientId?: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client-statement", tenantId, clientId, dateFrom, dateTo],
    queryFn: async (): Promise<ClientStatementSummary | null> => {
      if (!tenantId || !clientId) return null;

      let query = supabase
        .from("ledger_entries")
        .select(
          "id, effective_date, created_at, entry_type, description, reference_type, reference_id, amount, balance_after, payment_method"
        )
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        // Canonical deterministic ordering — matches
        // ledger_entries_effective_composite_idx.
        .order("effective_date", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      // Date-only, inclusive on both bounds. No UTC conversion: `effective_date`
      // is a Postgres `date`, so a timestamp window would shift the day.
      if (dateFrom) {
        query = query.gte("effective_date", toEconomicDateString(dateFrom));
      }
      if (dateTo) {
        query = query.lte("effective_date", toEconomicDateString(dateTo));
      }

      const { data: entries, error } = await query;

      if (error) {
        console.error("Error fetching client statement:", error);
        return null;
      }

      // Opening balance — ALL ledger amounts economically before the range
      // start. Paginated so a client-library row cap can never truncate the
      // sum. Zero when no start date is selected.
      let openingCents = 0;
      if (dateFrom) {
        const cutoff = toEconomicDateString(dateFrom);
        let offset = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: priorPage, error: priorError } = await supabase
            .from("ledger_entries")
            .select("amount")
            .eq("tenant_id", tenantId)
            .eq("client_id", clientId)
            .lt("effective_date", cutoff)
            .range(offset, offset + OPENING_BALANCE_PAGE_SIZE - 1);

          if (priorError) {
            console.error("Error fetching opening balance:", priorError);
            return null;
          }
          const page = priorPage || [];
          for (const row of page) openingCents += toCents((row as any).amount);
          if (page.length < OPENING_BALANCE_PAGE_SIZE) break;
          offset += OPENING_BALANCE_PAGE_SIZE;
        }
      }

      // Fetch client name
      const { data: client } = await supabase
        .from("clients")
        .select("name, name_ar")
        .eq("id", clientId)
        .single();

      let debitCents = 0;
      let creditCents = 0;
      let runningCents = openingCents;

      const statementEntries: StatementEntry[] = (entries || []).map((e: any) => {
        const amountCents = toCents(e.amount);
        const isDebit = amountCents > 0;

        debitCents += isDebit ? amountCents : 0;
        creditCents += isDebit ? 0 : Math.abs(amountCents);
        runningCents += amountCents;

        return {
          id: e.id,
          date: toEconomicDateString(e.effective_date),
          createdAt: e.created_at ?? null,
          entry_type: e.entry_type as StatementEntry["entry_type"],
          description: e.description,
          reference_type: e.reference_type,
          reference_id: e.reference_id,
          debit: isDebit ? fromCents(amountCents) : 0,
          credit: isDebit ? 0 : fromCents(Math.abs(amountCents)),
          balance: Number(e.balance_after), // audit metadata only
          payment_method: e.payment_method,
        };
      });

      // Defensive client-side re-sort with the identical canonical keys, so
      // ordering stays deterministic regardless of transport nuances.
      statementEntries.sort((a, b) => compareEconomicOrder(a, b, "asc"));

      return {
        clientId,
        clientName: client?.name,
        entries: statementEntries,
        totalDebits: fromCents(debitCents),
        totalCredits: fromCents(creditCents),
        // closing balance = opening + sum(visible ordered amounts)
        currentBalance: fromCents(runningCents),
        openingBalance: fromCents(openingCents),
      };
    },
    enabled: !!tenantId && !!clientId,
  });

  return {
    statement: data,
    isLoading,
    refetch,
  };
}
