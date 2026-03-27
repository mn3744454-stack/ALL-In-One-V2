import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate ALL finance-related query keys in one call.
 * Use this after any mutation that changes finance state.
 */
export function invalidateFinanceQueries(queryClient: QueryClient, tenantId?: string) {
  queryClient.invalidateQueries({ queryKey: ["invoices", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
  queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
  queryClient.invalidateQueries({ queryKey: ["invoice-payments-batch"] });
  queryClient.invalidateQueries({ queryKey: ["ledger-entries", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["customer-balances", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["client-statement", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["lab-horse-financial", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["lab-horses-with-metrics"] });
  queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
  queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
  // Also refresh clients (balance-derived metrics may change)
  queryClient.invalidateQueries({ queryKey: ["clients", tenantId] });
  queryClient.invalidateQueries({ queryKey: ["ledger-balance"] });
  queryClient.invalidateQueries({ queryKey: ["ledger-balances"] });
  queryClient.invalidateQueries({ queryKey: ["billing-links"] });
}
