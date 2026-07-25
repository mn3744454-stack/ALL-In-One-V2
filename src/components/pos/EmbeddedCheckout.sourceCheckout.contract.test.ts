import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const FILE = path.resolve(__dirname, "EmbeddedCheckout.tsx");
const src = fs.readFileSync(FILE, "utf-8");

/**
 * Static structural contract test — verifies the Turn-4 / Turn-4A
 * `EmbeddedCheckout` frontend contract without booting a DOM.
 * These assertions intentionally use robust substring / regex checks so they
 * survive whitespace edits but fail loudly when a forbidden legacy call path
 * is re-introduced or the atomic RPC cutover regresses.
 */
describe("EmbeddedCheckout static contract", () => {
  it("uses createSourceCheckoutInvoice exactly once (operational call)", () => {
    const matches = src.match(/createSourceCheckoutInvoice\s*\(/g) ?? [];
    // Exactly one operational call site. The import + type alias references
    // use `createSourceCheckoutInvoice` as an identifier (no `(`).
    expect(matches.length).toBe(1);
  });

  it("removes every legacy direct financial write", () => {
    const forbidden = [
      /\.from\(["']invoices["']\)/,
      /\.from\(["']invoice_items["']\)/,
      /postLedgerForInvoice/,
      /useBillingLinks/,
      /createLinkAsync/,
      /INV-\$\{/, // client-generated invoice numbers
      /suggestedClientId/,
      /tax_amount\s*:\s*0/, // persisted zero-tax shortcut
    ];
    for (const rx of forbidden) {
      expect(src, `forbidden pattern re-introduced: ${rx}`).not.toMatch(rx);
    }
  });

  it("restricts sourceType prop to lab_sample | horse_order", () => {
    expect(src).toMatch(/sourceType:\s*"lab_sample"\s*\|\s*"horse_order"/);
  });

  it("declares linkKind as a required prop", () => {
    // Required prop → no `?:` before the type annotation.
    expect(src).toMatch(/linkKind:\s*SourceCheckoutLinkKind/);
    expect(src).not.toMatch(/linkKind\?:\s*SourceCheckoutLinkKind/);
  });

  it("horse_order branch forces link_kind='final' and forwards no items", () => {
    // Isolate the horse_order return object.
    const branch = src.slice(src.indexOf('source_type: "horse_order"'));
    expect(branch).toMatch(/link_kind:\s*"final"/);
    // Items are lab-only.
    const labBranch = src.slice(
      src.indexOf('source_type: "lab_sample"'),
      src.indexOf('source_type: "horse_order"'),
    );
    expect(labBranch).toMatch(/items:/);
    // Only the four allowed lab-item keys are forwarded.
    expect(labBranch).toMatch(/description:/);
    expect(labBranch).toMatch(/quantity:/);
    expect(labBranch).toMatch(/unit_price:/);
    expect(labBranch).toMatch(/is_taxable:/);
    // Forbidden pass-through keys.
    expect(labBranch).not.toMatch(/entity_type:/);
    expect(labBranch).not.toMatch(/entity_id:/);
    expect(labBranch).not.toMatch(/description_ar:/);
  });

  it("never sends root client/horse authority", () => {
    // The RPC rejects these keys — the frontend must not send them.
    expect(src).not.toMatch(/client_id:\s*[a-zA-Z]/);
    expect(src).not.toMatch(/horse_id:\s*[a-zA-Z]/);
    expect(src).not.toMatch(/lab_horse_id:\s*[a-zA-Z]/);
  });

  it("mints one idempotency key per open session and rotates on payload change", () => {
    expect(src).toMatch(/idempotencyKeyRef/);
    expect(src).toMatch(/crypto\.randomUUID\(\)/);
    // Rotation on payload fingerprint change.
    expect(src).toMatch(/lastSubmittedFingerprintRef/);
    expect(src).toMatch(/idempotencyKeyRef\.current\s*=\s*crypto\.randomUUID\(\)/);
  });

  it("blocks Sheet dismissal while the mutation is in-flight", () => {
    // The Sheet's onOpenChange short-circuits close when pending.
    expect(src).toMatch(/if\s*\(\s*isPending\s*&&\s*!next\s*\)\s*return/);
    expect(src).toMatch(/onEscapeKeyDown=\{\(e\)\s*=>\s*\{\s*if\s*\(isPending\)/);
    expect(src).toMatch(/onPointerDownOutside=\{\(e\)\s*=>\s*\{\s*if\s*\(isPending\)/);
    expect(src).toMatch(/onInteractOutside=\{\(e\)\s*=>\s*\{\s*if\s*\(isPending\)/);
  });

  it("error path does NOT call onComplete", () => {
    // onComplete is only in onSuccess.
    const onSuccessBlock = src.slice(src.indexOf("onSuccess"), src.indexOf("onError"));
    const onErrorBlock = src.slice(src.indexOf("onError"), src.indexOf("});", src.indexOf("onError")));
    expect(onSuccessBlock).toMatch(/onComplete\?\./);
    expect(onErrorBlock).not.toMatch(/onComplete\?\./);
  });
});
