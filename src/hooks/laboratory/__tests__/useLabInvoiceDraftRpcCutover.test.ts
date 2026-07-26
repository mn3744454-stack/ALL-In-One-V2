/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

const hook = read("src/hooks/laboratory/useLabInvoiceDraft.ts");
const dialog = read("src/components/laboratory/GenerateInvoiceDialog.tsx");

describe("Lab Sample → Draft Invoice RPC cutover", () => {
  it("uses the atomic createInvoiceWithItems RPC", () => {
    expect(hook).toContain('from "@/lib/finance/invoiceRpc"');
    expect(hook).toContain("createInvoiceWithItems(tenantId, payload)");
  });

  it("removes the legacy direct invoice/invoice_items INSERT path", () => {
    expect(hook).not.toMatch(/\.from\(\s*["']invoices["']\s*\)[\s\S]{0,200}\.insert/);
    expect(hook).not.toMatch(/\.from\(\s*["']invoice_items["']\s*\)[\s\S]{0,200}\.insert/);
    expect(hook).not.toContain("useInvoices(");
    expect(hook).not.toContain("useInvoiceItems(");
    expect(hook).not.toContain("createItem(");
    expect(hook).not.toContain("generateInvoiceNumber");
  });

  it("does not forward RPC-unknown keys on invoice items", () => {
    // entity_type/entity_id/total_price/position/invoice_id/tax_amount/subtotal
    // must not be part of the RPC item payload construction.
    const rpcItemsBlock = hook.match(/rpcItems[\s\S]*?const payload/);
    expect(rpcItemsBlock, "rpcItems block").toBeTruthy();
    const block = rpcItemsBlock![0];
    expect(block).not.toContain("entity_type");
    expect(block).not.toContain("entity_id");
    expect(block).not.toContain("total_price");
    expect(block).not.toContain("invoice_id");
    expect(block).not.toContain("position:");
    expect(block).not.toContain("tax_amount");
    expect(block).not.toContain("subtotal");
  });

  it("preserves source trace and duplicate detection via the notes marker", () => {
    expect(hook).toContain("buildLabSourceMarker");
    expect(hook).toContain("composeNotesWithMarker");
    expect(hook).toContain("[LAB:");
    // checkExistingInvoice searches invoices.notes for the marker.
    expect(hook).toMatch(/\.ilike\(\s*"notes"/);
    // Legacy fallback for historical rows still present.
    expect(hook).toContain('.eq("entity_type", sourceType)');
  });

  it("forwards horse_id / lab_horse_id per item when the sample supplies them", () => {
    expect(dialog).toContain("horseId: sample?.horse_id");
    expect(dialog).toContain("labHorseId: sample?.lab_horse_id");
    expect(hook).toContain("sourceContext?.horseId");
    expect(hook).toContain("sourceContext?.labHorseId");
  });

  it("logs the raw error but shows a safe localized fallback", () => {
    expect(hook).toContain("console.error(");
    expect(hook).toContain('t("laboratory.billing.invoiceError")');
    expect(hook).not.toMatch(/toast\.error\(\s*err\?\.message/);
  });

  it("invalidates finance + lab caches only after RPC success", () => {
    // Cache invalidation lives after the RPC call and before the return.
    const success = hook.match(/const result = await createInvoiceWithItems[\s\S]*?return result\.invoice_id;/);
    expect(success, "success branch").toBeTruthy();
    expect(success![0]).toContain("invalidateFinanceQueries(queryClient, tenantId)");
    expect(success![0]).toContain('queryKey: ["lab-samples"]');
  });
});
