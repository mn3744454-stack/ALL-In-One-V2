import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MultiInvoiceKpiBar } from "../MultiInvoiceKpiBar";
import { I18nProvider } from "@/i18n/I18nContext";

function renderKpi(props: React.ComponentProps<typeof MultiInvoiceKpiBar>, lang: "en" | "ar" = "en") {
  return render(
    <I18nProvider initialLanguage={lang}>
      <MultiInvoiceKpiBar {...props} />
    </I18nProvider>,
  );
}

describe("MultiInvoiceKpiBar", () => {
  const base = {
    eligibleCount: 17,
    totalOutstanding: 1234.5,
    selectedCount: 2,
    selectedOutstanding: 250,
    currency: "SAR",
  };

  it("renders all four KPI cells in English with 'X of Y'", () => {
    renderKpi(base, "en");
    expect(screen.getByTestId("kpi-eligible-invoices")).toHaveTextContent("17");
    expect(screen.getByTestId("kpi-total-outstanding")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-selected-invoices")).toHaveTextContent("2 of 17");
    expect(screen.getByTestId("kpi-selected-outstanding")).toBeInTheDocument();
  });

  it("renders Arabic 'X من Y' for the selected-invoices indicator", () => {
    renderKpi(base, "ar");
    expect(screen.getByTestId("kpi-selected-invoices")).toHaveTextContent("2 من 17");
  });

  it("shows zeros gracefully without breaking layout", () => {
    renderKpi(
      { eligibleCount: 0, totalOutstanding: 0, selectedCount: 0, selectedOutstanding: 0 },
      "en",
    );
    expect(screen.getByTestId("kpi-selected-invoices")).toHaveTextContent("0 of 0");
  });
});
