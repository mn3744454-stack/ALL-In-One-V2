import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceStatusBadge } from "../InvoiceStatusBadge";
import { I18nProvider } from "@/i18n/I18nContext";

function renderBadge(status: string, lang: "en" | "ar" = "en") {
  return render(
    <I18nProvider initialLanguage={lang}>
      <InvoiceStatusBadge status={status} />
    </I18nProvider>,
  );
}

describe("InvoiceStatusBadge unknown fallback", () => {
  it("renders localized English 'Unknown Status' for an unmapped status", () => {
    renderBadge("frobnicated", "en");
    const el = screen.getByText("Unknown Status");
    expect(el).toBeInTheDocument();
    expect(el.closest("[data-status-mapped]")?.getAttribute("data-status-mapped")).toBe("unknown");
  });

  it("renders localized Arabic 'حالة غير معروفة' for an unmapped status", () => {
    renderBadge("frobnicated", "ar");
    expect(screen.getByText("حالة غير معروفة")).toBeInTheDocument();
  });

  it("still renders known statuses as before (draft → Draft, not Unknown)", () => {
    renderBadge("draft", "en");
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("does NOT silently mask unmapped statuses as 'Draft'", () => {
    renderBadge("frobnicated", "en");
    expect(screen.queryByText("Draft")).toBeNull();
  });
});
