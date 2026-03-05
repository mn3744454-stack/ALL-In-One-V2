import { supabase } from "@/integrations/supabase/client";

/**
 * Posts a ledger entry for an approved expense.
 * Idempotent: checks if entry already exists before inserting.
 * Expense entries have no client_id (internal cost).
 */
export async function postLedgerForExpense(
  expenseId: string,
  tenantId: string
): Promise<boolean> {
  try {
    // Fetch expense details
    const { data: expense, error: expError } = await supabase
      .from("expenses")
      .select("id, amount, description, category, vendor_name, expense_date")
      .eq("id", expenseId)
      .single();

    if (expError || !expense) {
      console.error("postLedgerForExpense: Expense not found", expError);
      return false;
    }

    // Idempotency: check if ledger entry already exists
    const { data: existing } = await supabase
      .from("ledger_entries")
      .select("id")
      .eq("reference_type", "expense")
      .eq("reference_id", expenseId)
      .maybeSingle();

    if (existing) {
      console.log("postLedgerForExpense: Entry already exists, skipping");
      return true;
    }

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Build enriched description
    const parts: string[] = [];
    if (expense.category) parts.push(expense.category);
    if (expense.vendor_name) parts.push(expense.vendor_name);
    if (expense.description) parts.push(expense.description);
    const description = parts.join(" | ") || "Expense";

    // Post ledger entry — expense as debit (cash outflow)
    // client_id is null for internal expenses (requires nullable column)
    const { error: ledgerError } = await supabase
      .from("ledger_entries")
      .insert({
        tenant_id: tenantId,
        entry_type: "expense",
        reference_type: "expense",
        reference_id: expenseId,
        amount: expense.amount,
        balance_after: 0,
        description,
        created_by: userId,
      } as any);

    if (ledgerError) {
      console.error("postLedgerForExpense: Error creating entry", ledgerError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("postLedgerForExpense: Unexpected error", error);
    return false;
  }
}
