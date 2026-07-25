import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIALOG = fs.readFileSync(
  path.resolve(__dirname, "CreateSampleDialog.tsx"),
  "utf-8",
);
const SAMPLE_CARD = fs.readFileSync(
  path.resolve(__dirname, "SampleCard.tsx"),
  "utf-8",
);
const ORDER_CARD = fs.readFileSync(
  path.resolve(__dirname, "../horses/orders/OrderCard.tsx"),
  "utf-8",
);
const EN = fs.readFileSync(
  path.resolve(__dirname, "../../i18n/locales/en.ts"),
  "utf-8",
);
const AR = fs.readFileSync(
  path.resolve(__dirname, "../../i18n/locales/ar.ts"),
  "utf-8",
);

describe("Multi-sample immediate-checkout safety contract", () => {
  it("CreateSampleDialog exposes canImmediateCheckout derived guard", () => {
    expect(DIALOG).toMatch(/expectedSampleCount/);
    expect(DIALOG).toMatch(/canImmediateCheckout/);
    expect(DIALOG).toMatch(/isMultiSampleImmediateCheckoutBlocked/);
  });

  it("Collect Now button disabled when !canImmediateCheckout", () => {
    expect(DIALOG).toMatch(/disabled=\{[^}]*!canImmediateCheckout/);
  });

  it("pre-creation guard prevents multi-sample immediate checkout path", () => {
    expect(DIALOG).toMatch(/canImmediateCheckout/);
    // Post-creation guard: sampleIds.length === 1 required to mount checkout.
    expect(DIALOG).toMatch(/createdSampleIds/);
  });

  it("renders bilingual guidance alert using multiSampleBlocked key", () => {
    expect(DIALOG).toMatch(/multiSampleBlocked/);
  });

  it("SampleCard maps intake → deposit and completion → final", () => {
    expect(SAMPLE_CARD).toMatch(/link_kind|linkKind/);
    expect(SAMPLE_CARD).toMatch(/deposit/);
    expect(SAMPLE_CARD).toMatch(/final/);
  });

  it("OrderCard uses Final only and passes no client UUID", () => {
    expect(ORDER_CARD).toMatch(/linkKind=["']final["']|link_kind:\s*"final"/);
    expect(ORDER_CARD).not.toMatch(/suggestedClientId/);
  });

  it("no caller passes suggestedClientId", () => {
    for (const [name, src] of [
      ["CreateSampleDialog", DIALOG],
      ["SampleCard", SAMPLE_CARD],
      ["OrderCard", ORDER_CARD],
    ] as const) {
      expect(src, `${name} must not send suggestedClientId`).not.toMatch(
        /suggestedClientId/,
      );
    }
  });

  it("translation parity: exact English + Arabic guidance strings", () => {
    expect(EN).toContain(
      "Immediate collection is available for one sample only. Create the samples first, then collect each sample separately from its sample card.",
    );
    expect(AR).toContain(
      "التحصيل الفوري متاح لعينة واحدة فقط. أنشئ العينات أولاً، ثم حصّل كل عينة على حدة من بطاقتها.",
    );
  });
});
