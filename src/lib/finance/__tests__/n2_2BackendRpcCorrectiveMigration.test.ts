/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260722030000_aml_1_b_1_n2_2_backend_rpc_corrective.sql",
);
const sql = readFileSync(migrationPath, "utf8");

function functionDefinition(name: string): string {
  const pattern = new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$function\\$;`,
  );
  const match = sql.match(pattern);
  if (!match) throw new Error(`Function definition not found: ${name}`);
  return match[0];
}

const payment = functionDefinition("post_payment");
const expensePost = functionDefinition("post_expense_with_ledger");
const expenseReverse = functionDefinition("reverse_expense");
const adjustment = functionDefinition("post_manual_ledger_adjustment");
const salary = functionDefinition("record_salary_payment");
const ledgerHelper = functionDefinition("_finance_ledger_insert");
const sourcedExpenseHelper = functionDefinition("_finance_expense_create_sourced");

describe("AML.1.b.1 N+2.2 corrective migration — scope and safety", () => {
  it("uses a forward migration after N+2", () => {
    expect(migrationPath).toContain("20260722030000");
  });

  it("contains deterministic preflight and post-apply gates", () => {
    expect(sql).toContain("DO $preflight$");
    expect(sql).toContain("DO $post$");
  });

  it("asserts source_reference is physically uuid", () => {
    expect(sql).toContain("N2_2_PREFLIGHT_SOURCE_REFERENCE_TYPE_DRIFT");
    expect(sql).toContain("v_type IS DISTINCT FROM 'uuid'");
  });

  it("does not invent payment_accounts.currency", () => {
    expect(sql).toContain("N2_2_PREFLIGHT_UNEXPECTED_PAYMENT_ACCOUNT_CURRENCY");
    expect(payment).not.toMatch(/payment_accounts[\s\S]{0,200}\.currency/);
  });

  it("widens the ledger entry type constraint to expense", () => {
    expect(sql).toContain(
      "CHECK (entry_type IN ('invoice', 'payment', 'credit', 'adjustment', 'expense'))",
    );
  });

  it("adds schema-backed salary period uniqueness", () => {
    expect(sql).toContain(
      "CREATE UNIQUE INDEX hr_salary_payments_tenant_employee_period_uidx",
    );
    expect(sql).toContain("(tenant_id, employee_id, payment_period)");
  });

  it("checks existing salary duplicates before adding uniqueness", () => {
    expect(sql).toContain("N2_2_PREFLIGHT_EXISTING_SALARY_PERIOD_DUPLICATES");
    expect(sql).toContain("HAVING count(*) > 1");
  });

  it.each([
    "post_payment",
    "post_expense_with_ledger",
    "reverse_expense",
    "post_manual_ledger_adjustment",
    "record_salary_payment",
    "_finance_ledger_insert",
    "_finance_expense_create_sourced",
  ])("keeps %s SECURITY DEFINER with an empty search_path", (name) => {
    const body = functionDefinition(name);
    expect(body).toContain("SECURITY DEFINER");
    expect(body).toContain("SET search_path = ''");
  });

  it("does not edit or create a POS function", () => {
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.pos_finalize_sale/);
  });

  it("does not perform historical business-row repair", () => {
    expect(sql).not.toMatch(/UPDATE public\.ledger_entries\s+SET effective_date/);
    expect(sql).not.toMatch(/DELETE FROM public\.(invoices|expenses|ledger_entries)/);
  });

  it("contains none of the protected Demo record identifiers", () => {
    for (const protectedIdentifier of [
      "-213",
      "-396",
      "-951",
      "-717",
      "-740",
      "INV-MMO9AAXD",
      "INV-MNDH8GPD",
      "Suni",
    ]) {
      expect(sql).not.toContain(protectedIdentifier);
    }
  });

  it("does not broaden RLS or direct-table grants", () => {
    expect(sql).not.toMatch(/CREATE POLICY|ALTER POLICY|DROP POLICY/);
    expect(sql).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE|ALL)\s+ON\s+(TABLE\s+)?public\./);
  });
});

describe("post_payment corrective contract", () => {
  it("preserves the canonical signature", () => {
    expect(payment).toContain(
      "p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid",
    );
    expect(payment).toContain("p_account_id uuid, p_payload jsonb");
  });

  it("requires finance.payment.create only", () => {
    expect(payment).toContain("'finance.payment.create'");
    expect(payment).not.toContain("finance.invoice.markPaid");
  });

  it("allows only the locked payable states", () => {
    expect(payment).toContain(
      "('approved', 'shared', 'overdue', 'partial')",
    );
    expect(payment).not.toMatch(/status NOT IN \([^)]*reviewed/);
  });

  it("locks the invoice source and row", () => {
    expect(payment).toContain("'invoice', p_invoice_id");
    expect(payment).toMatch(/FROM public\.invoices[\s\S]*FOR UPDATE/);
  });

  it("requires an active same-tenant tenant-owned payment account", () => {
    expect(payment).toContain("tenant_id = p_tenant_id");
    expect(payment).toContain("owner_type = 'tenant'");
    expect(payment).toContain("is_active = true");
  });

  it("enforces invoice and tenant currency parity", () => {
    expect(payment).toContain("FIN_PAYMENT_CURRENCY_MISMATCH");
    expect(payment).toContain("v_payment_currency IS DISTINCT FROM v_tenant_currency");
  });

  it("inserts one receivable invoice payment intent", () => {
    expect(payment).toContain("INSERT INTO public.payment_intents");
    expect(payment).toContain("'receivable', 'invoice', p_invoice_id");
    expect(payment).toContain("'paid', now(), now()");
  });

  it("uses canonical two-decimal amount_display", () => {
    expect(payment).toContain("to_char(p_amount, 'FM999999999990.00')");
  });

  it("posts a negative payment ledger row on p_payment_date", () => {
    expect(payment).toContain("-p_amount, p_payment_date");
    expect(payment).toContain("'payment', 'invoice', p_invoice_id");
  });

  it("links payment_intent_id into ledger metadata", () => {
    expect(payment).toContain("'payment_intent_id', v_payment_intent_id");
  });

  it("preserves the billing allocation link", () => {
    expect(payment).toContain("public._finance_billing_link_upsert");
    expect(payment).toContain("p_tenant_id, 'payment', v_ledger_id");
  });

  it("derives paid or partial server-side", () => {
    expect(payment).toContain("v_new_status := 'paid'");
    expect(payment).toContain("v_new_status := 'partial'");
  });

  it("derives payment_received_at from p_payment_date", () => {
    expect(payment).toContain(
      "payment_received_at = p_payment_date::timestamp AT TIME ZONE 'Asia/Riyadh'",
    );
    expect(payment).not.toMatch(/payment_received_at\s*=\s*now\(\)/);
  });

  it("supports only the locked supplemental payload keys", () => {
    for (const key of [
      "allow_overpayment",
      "reference_note",
      "external_reference",
      "metadata",
    ]) {
      expect(payment).toContain(`'${key}'`);
    }
    expect(payment).toContain("FIN_PAYLOAD_UNKNOWN_KEY");
  });

  it("enforces payment payload length bounds", () => {
    expect(payment).toContain("> 500");
    expect(payment).toContain("> 100");
  });

  it("requires shallow caller metadata", () => {
    expect(payment).toContain("FIN_PAYMENT_METADATA_MUST_BE_SHALLOW");
    expect(payment).toContain("jsonb_typeof(m.value) IN ('object', 'array')");
  });

  it("rejects reserved caller metadata keys", () => {
    for (const key of [
      "tenant_id",
      "actor_id",
      "invoice_id",
      "payment_intent_id",
      "ledger_entry_id",
      "balance_after",
      "effective_date",
      "idempotency_key",
    ]) {
      expect(payment).toContain(`'${key}'`);
    }
  });

  it("preserves the locked allow_overpayment policy", () => {
    expect(payment).toContain("AND NOT v_allow_overpayment");
    expect(payment).toContain("FIN_PAYMENT_OVERPAYMENT");
  });

  it("stores payment_intent_id in the replay response", () => {
    expect(payment).toContain("'payment_intent_id', v_payment_intent_id");
    expect(payment).toContain("_finance_idempotency_complete");
  });
});

describe("expense posting and reversal corrective contracts", () => {
  it("expense posting requires approve but not manage", () => {
    expect(expensePost).toContain("'finance.expenses.approve'");
    expect(expensePost).not.toContain("finance.expenses.manage");
  });

  it("expense posting accepts pending, approved, and paid unposted states", () => {
    expect(expensePost).toContain("('pending', 'approved', 'paid')");
    expect(expensePost).toContain("ledger_status IS DISTINCT FROM 'unposted'");
  });

  it("expense posting creates a positive canonical expense row", () => {
    expect(expensePost).toContain("'expense', 'expense', p_expense_id");
    expect(expensePost).toContain("v_exp.amount, v_exp.expense_date");
    expect(expensePost).not.toContain("'adjustment', 'expense'");
  });

  it("expense posting transitions pending to approved", () => {
    expect(expensePost).toContain(
      "CASE WHEN status = 'pending' THEN 'approved' ELSE status END",
    );
  });

  it("expense reversal requires manage but not adjustment authority", () => {
    expect(expenseReverse).toContain("'finance.expenses.manage'");
    expect(expenseReverse).not.toContain("finance.adjustment.create");
  });

  it("expense reversal blocks HR-sourced rows with the locked code", () => {
    expect(expenseReverse).toContain("FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE");
  });

  it("expense reversal enforces posted approved/paid originals", () => {
    expect(expenseReverse).toContain("ledger_status IS DISTINCT FROM 'posted'");
    expect(expenseReverse).toContain("('approved', 'paid')");
  });

  it("expense reversal creates a positive Model-B expense", () => {
    expect(expenseReverse).toContain("'reversal'");
    expect(expenseReverse).toContain("p_expense_id, v_actor");
  });

  it("expense reversal creates a negative expense ledger row", () => {
    expect(expenseReverse).toContain("'expense', 'expense', v_rev_id");
    expect(expenseReverse).toContain("-v_exp.amount, p_reversal_date");
    expect(expenseReverse).not.toContain("'adjustment', 'expense'");
  });

  it("expense reversal preserves and marks the original reversed", () => {
    expect(expenseReverse).toContain("SET ledger_status = 'reversed'");
    expect(expenseReverse).not.toMatch(/DELETE FROM public\.expenses/);
  });
});

describe("manual adjustment corrective contract", () => {
  it("keeps finance.adjustment.create only", () => {
    expect(adjustment).toContain("'finance.adjustment.create'");
    expect(adjustment).not.toContain("finance.ledger.adjust");
  });

  it("requires a non-zero amount", () => {
    expect(adjustment).toContain("p_amount = 0");
  });

  it("requires a same-tenant client", () => {
    expect(adjustment).toContain("FIN_CLIENT_NOT_IN_TENANT");
  });

  it("enforces the Riyadh today plus seven-day ceiling", () => {
    expect(adjustment).toContain("AT TIME ZONE 'Asia/Riyadh'");
    expect(adjustment).toContain("::date + 7");
  });

  it("enforces normalized 1..500 descriptions", () => {
    expect(adjustment).toContain("btrim(COALESCE(p_description, ''))");
    expect(adjustment).toContain("char_length(v_desc) > 500");
  });

  it("explicitly serializes and locks the client balance partition", () => {
    expect(adjustment).toContain("'client_ledger', p_client_id");
    expect(adjustment).toMatch(/FROM public\.customer_balances[\s\S]*FOR UPDATE/);
  });

  it("returns the rebuilt balance_after", () => {
    expect(adjustment).toContain("v_balance_after");
    expect(adjustment).toContain("'balance_after', v_balance_after");
  });
});

describe("salary corrective contract", () => {
  it("keeps hr.manage only", () => {
    expect(salary).toContain("'hr.manage'");
    expect(salary).not.toContain("hr.salary.pay");
    expect(salary).not.toContain("finance.expenses");
  });

  it("locks and requires an active same-tenant employee", () => {
    expect(salary).toMatch(/FROM public\.hr_employees[\s\S]*FOR UPDATE/);
    expect(salary).toContain("IF NOT v_employee.is_active");
  });

  it("requires a positive salary amount", () => {
    expect(salary).toContain("p_amount <= 0");
  });

  it("requires exact tenant currency", () => {
    expect(salary).toContain("FIN_CURRENCY_MISMATCH");
    expect(salary).toContain("btrim(p_currency) IS DISTINCT FROM v_tenant_currency");
  });

  it("rejects paid_at later than now plus one day", () => {
    expect(salary).toContain("p_paid_at > now() + interval '1 day'");
  });

  it("requires strict YYYY-MM with a real month", () => {
    expect(salary).toContain("^[0-9]{4}-(0[1-9]|1[0-2])$");
  });

  it("enforces the 1000-character notes limit", () => {
    expect(salary).toContain("char_length(v_notes) > 1000");
  });

  it("rejects a logical duplicate before insert", () => {
    expect(salary).toContain("FIN_SALARY_PERIOD_DUP");
    expect(salary).toContain("payment_period = p_payment_period");
  });

  it("translates concurrent unique violations to the domain error", () => {
    expect(salary).toContain("WHEN unique_violation THEN");
    expect(salary).toContain("FIN_SALARY_PERIOD_DUP");
  });

  it("uses Riyadh business date for the optional expense", () => {
    expect(salary).toContain("public._finance_riyadh_date(p_paid_at)");
    expect(salary).toContain("'expense_date', v_biz_date");
  });

  it("uses the private sourced-expense helper", () => {
    expect(salary).toContain("public._finance_expense_create_sourced");
    expect(salary).toContain("'hr_salary_payment', v_salary_id");
  });

  it("posts the salary expense with entry_type expense", () => {
    expect(salary).toContain("'expense', 'expense', v_expense_id");
    expect(salary).not.toContain("'adjustment', 'expense'");
  });

  it("creates no billing link or customer balance mutation", () => {
    expect(salary).not.toContain("billing_links");
    expect(salary).not.toContain("customer_balances");
  });

  it("writes the finance_expense_id backlink", () => {
    expect(salary).toContain("SET finance_expense_id = v_expense_id");
  });

  it("returns period_locked for idempotent callers", () => {
    expect(salary).toContain("'period_locked', true");
  });
});

describe("private helper and ACL regression gates", () => {
  it("persists sourced expense UUID without a text cast", () => {
    expect(sourcedExpenseHelper).toContain("p_source_reference_trusted, p_actor_id");
    expect(sourcedExpenseHelper).not.toContain("p_source_reference_trusted::text");
  });

  it("serializes the ledger partition and locks a physical balance row", () => {
    expect(ledgerHelper).toContain("'client_ledger', p_client_id");
    expect(ledgerHelper).toMatch(/FROM public\.customer_balances[\s\S]*FOR UPDATE/);
  });

  it("rebuilds in effective_date, created_at, id order", () => {
    expect(ledgerHelper).toContain("ORDER BY effective_date, created_at, id");
  });

  it("keeps null-client ledger rows at zero without customer balances", () => {
    expect(ledgerHelper).toContain("IF p_client_id IS NULL");
    expect(ledgerHelper).toContain("RETURN QUERY SELECT v_id, 0::numeric");
  });

  it("upserts the authoritative tenant currency", () => {
    expect(ledgerHelper).toContain("currency = EXCLUDED.currency");
  });

  it("revokes private helpers from authenticated and anon", () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\._finance_ledger_insert[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\._finance_expense_create_sourced[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
  });

  it.each([
    "post_payment",
    "post_expense_with_ledger",
    "reverse_expense",
    "post_manual_ledger_adjustment",
    "record_salary_payment",
  ])("grants corrected public RPC %s to authenticated only", (name) => {
    expect(sql).toMatch(
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([\\s\\S]*?TO authenticated;`),
    );
  });

  it("introduces no unauthorized permission aliases", () => {
    expect(sql).not.toContain("finance.ledger.adjust");
    expect(sql).not.toContain("hr.salary.pay");
    expect(sql).not.toContain("finance.expenses.manage +");
  });

  it("does not introduce supplier-payable or POS RPCs", () => {
    expect(sql).not.toContain("link_supplier_payable_to_invoice");
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION public.pos_finalize_sale");
  });
});
