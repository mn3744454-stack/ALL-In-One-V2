/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const migration = read(
  "supabase/migrations/20260722213000_aml_1_b_1_n2_5_invoice_rpc_runtime_wiring.sql",
);
const form = read("src/components/finance/InvoiceFormDialog.tsx");
const details = read("src/components/finance/InvoiceDetailsSheet.tsx");
const approval = read("src/lib/finance/approveInvoice.ts");
const payment = read("src/lib/finance/postLedgerForPayments.ts");
const paymentHook = read("src/hooks/finance/useInvoicePayments.ts");

function functionDefinition(name: string): string {
  const match = migration.match(new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$function\\$;`,
  ));
  if (!match) throw new Error(`Function definition not found: ${name}`);
  return match[0];
}

describe("N+2.5 invoice database contract", () => {
  const compute = functionDefinition("_finance_invoice_compute_totals");
  const create = functionDefinition("create_invoice_with_items");
  const update = functionDefinition("update_invoice_with_items");
  const approve = functionDefinition("approve_invoice");
  const cancel = functionDefinition("cancel_invoice");
  const splitPayment = functionDefinition("post_invoice_payments");

  it("keeps invoice number, prices, totals, and snapshots server-owned", () => {
    expect(compute).toContain("FROM public.tenant_services");
    expect(compute).toContain("FROM public.lab_services");
    expect(compute).toContain("FROM public.stable_service_plans");
    expect(create).toContain("_finance_invoice_number_next");
    expect(create).toContain("_finance_invoice_compute_totals");
  });

  it("supports laboratory horses, service discriminators, and packages", () => {
    for (const field of [
      "lab_horse_id",
      "service_source",
      "package_id",
      "package_services_snapshot",
    ]) {
      expect(migration).toContain(field);
    }
  });

  it("keeps create and replacement-item edit atomic", () => {
    expect(create).toContain("INSERT INTO public.invoices");
    expect(create).toContain("INSERT INTO public.invoice_items");
    expect(update).toContain("DELETE FROM public.invoice_items");
    expect(update).toContain("INSERT INTO public.invoice_items");
    expect(update).toContain("FIN_INVOICE_DOMAIN_LOCKED");
  });

  it("revalidates physical items and totals before approval", () => {
    expect(approve).toContain("FIN_INVOICE_ITEMS_INVALID");
    expect(approve).toContain("FIN_INVOICE_TOTALS_STALE");
    expect(approve).toContain("('draft', 'reviewed')");
    expect(approve).toContain("v_inv.client_id");
  });

  it("uses the canonical cancellation reversal identity", () => {
    expect(cancel).toContain("'adjustment'");
    expect(cancel).toContain("'invoice_cancellation'");
    expect(cancel).not.toMatch(/_finance_ledger_insert\([\s\S]*?'invoice',\s*'invoice'/);
  });

  it("posts every split tender in one transaction", () => {
    expect(splitPayment).toContain("public.post_payment(");
    expect(splitPayment).toContain("FIN_PAYMENT_SPLIT_INVALID");
    expect(splitPayment).toContain("_finance_idempotency_complete");
    expect(splitPayment).toContain("payment_session_id");
  });

  it.each([
    "create_invoice_with_items",
    "update_invoice_with_items",
    "approve_invoice",
    "cancel_invoice",
    "post_invoice_payments",
  ])("hardens %s as a SECURITY DEFINER RPC", (name) => {
    const definition = functionDefinition(name);
    expect(definition).toContain("SECURITY DEFINER");
    expect(definition).toContain("SET search_path = ''");
  });

  it("does not rewrite existing business data", () => {
    expect(migration).not.toMatch(/UPDATE public\.(ledger_entries|customer_balances)\s+SET/);
    expect(migration).not.toMatch(/DELETE FROM public\.(invoices|ledger_entries)/);
  });
});

describe("N+2.5 invoice frontend wiring", () => {
  it("creates and edits the header and items through atomic RPC helpers", () => {
    expect(form).toContain("createInvoiceWithItems(");
    expect(form).toContain("updateInvoiceWithItems(");
    expect(form).not.toContain('.from("invoice_items"');
    expect(form).not.toContain("generateInvoiceNumber");
    expect(form).not.toContain("subtotal: calculations.subtotal");
  });

  it("approves only through approve_invoice", () => {
    expect(approval).toContain("approveInvoiceRpc(");
    expect(approval).not.toContain('.from("invoices"');
    expect(approval).not.toContain("postLedgerForInvoice");
  });

  it("cancels and deletes through RPCs without browser ledger writes", () => {
    expect(details).toContain("cancelInvoiceRpc(");
    expect(details).toContain("deleteDraftInvoiceRpc(");
    expect(details).not.toContain('.from("ledger_entries").insert');
    expect(details).not.toContain('.from("customer_balances").upsert');
    expect(details).toContain('hasPermission("finance.invoice.approve")');
    expect(details).toContain('hasPermission("finance.invoice.cancel")');
  });

  it("records split payments through one RPC and reads effective_date", () => {
    expect(payment).toContain('.rpc("post_invoice_payments"');
    expect(payment).not.toContain('.from("ledger_entries")');
    expect(payment).not.toContain('.from("customer_balances")');
    expect(paymentHook).toContain("effective_date");
    expect(paymentHook).toContain("paymentDate");
  });
});
