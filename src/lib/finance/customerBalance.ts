/**
 * Slice 2A — Customer balance normalization.
 * Single source of truth for translating a customer's ledger balance into
 * Outstanding / Credit Balance / Available Credit for UI presentation.
 *
 * Rules (per contract):
 *   ledgerBalance    = Number(v_customer_ledger_balances.balance ?? 0)
 *   outstanding      = max(0, ledgerBalance)                  // never negative
 *   creditBalance    = |min(0, ledgerBalance)|                // absolute value of credit
 *   availableCredit  = max(0, creditLimit - outstanding)      // unused approved limit only
 *
 * Credit Balance is a separate concept and MUST NOT be added into
 * Credit Limit or Available Credit.
 */

export interface CustomerBalanceView {
  ledgerBalance: number;
  outstanding: number;
  creditBalance: number;
  availableCredit: number;
  hasCreditBalance: boolean;
  hasCreditLimit: boolean;
}

export function normalizeCustomerBalance(
  balance: number | string | null | undefined,
  creditLimit: number | string | null | undefined
): CustomerBalanceView {
  const ledgerBalance = Number(balance ?? 0) || 0;
  const outstanding = Math.max(0, ledgerBalance);
  const creditBalance = Math.abs(Math.min(0, ledgerBalance));
  const cl = Number(creditLimit ?? 0) || 0;
  const availableCredit = Math.max(0, cl - outstanding);
  return {
    ledgerBalance,
    outstanding,
    creditBalance,
    availableCredit,
    hasCreditBalance: creditBalance > 0,
    hasCreditLimit: cl > 0,
  };
}
