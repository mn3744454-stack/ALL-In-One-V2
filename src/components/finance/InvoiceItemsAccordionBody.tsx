import { useMemo } from "react";
import { User, Users, Package as PackageIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import type { FrozenInvoiceItem } from "@/hooks/finance/useInvoicePriorAllocations";

interface InvoiceItemsAccordionBodyProps {
  items: FrozenInvoiceItem[];
  currency: string;
}

/**
 * Slice 3.2 — read-only frozen invoice-items panel rendered inside the
 * eligible-invoice accordion.
 *
 * Grouping rules:
 *   - Rows with a horse are grouped by canonical horse id (Arabic term خيل).
 *   - Rows with a lab_horse but no horse are grouped under that lab horse.
 *   - Everything else falls into a Client-Level group.
 * Package parents are rendered once at their financial gross; when they carry
 * a `package_services_snapshot`, the snapshot children render as an indented
 * "Included Package Items" list with no independent gross and no financial
 * effect (they are excluded from itemCount upstream).
 */
export function InvoiceItemsAccordionBody({ items, currency }: InvoiceItemsAccordionBodyProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const fmt = (n: number) => formatCurrency(n, currency);

  const groups = useMemo(() => {
    type Group = {
      key: string;
      kind: "horse" | "lab" | "client";
      label: string;
      labelAr: string | null;
      rows: FrozenInvoiceItem[];
    };
    const map = new Map<string, Group>();
    for (const it of items) {
      let key: string;
      let kind: Group["kind"];
      let label: string;
      let labelAr: string | null;
      if (it.horse_id) {
        key = `h:${it.horse_id}`;
        kind = "horse";
        label = it.horse_name ?? "";
        labelAr = it.horse_name_ar ?? null;
      } else if (it.lab_horse_id) {
        key = `l:${it.lab_horse_id}`;
        kind = "lab";
        label = it.lab_horse_name ?? "";
        labelAr = it.lab_horse_name_ar ?? null;
      } else {
        key = "__client__";
        kind = "client";
        label = t("finance.payments.allocation.clientLevel");
        labelAr = null;
      }
      const g = map.get(key) ?? { key, kind, label, labelAr, rows: [] };
      g.rows.push(it);
      map.set(key, g);
    }
    return Array.from(map.values());
  }, [items, t]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const displayName = isRtl && g.labelAr ? g.labelAr : g.label || g.labelAr || "";
        const groupIcon =
          g.kind === "horse" || g.kind === "lab" ? (
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          );
        return (
          <div key={g.key} className="rounded-md border bg-muted/20 p-2 space-y-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {groupIcon}
              <span className="truncate">{displayName || t("finance.payments.allocation.clientLevel")}</span>
            </div>
            <div className="divide-y">
              {g.rows.map((row) => {
                const isPackage = !!row.package_id;
                const rowName =
                  (isRtl
                    ? row.package_name_ar_snapshot ?? row.service_name_ar_snapshot
                    : row.package_name_snapshot ?? row.service_name_snapshot) ||
                  row.description;
                const showTax = row.line_tax_amount > 0.005;
                return (
                  <div key={row.id} className="py-2 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 flex items-start gap-1.5">
                        {isPackage && <PackageIcon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />}
                        <span className="text-xs truncate">{rowName}</span>
                      </div>
                      <span dir="ltr" className="text-xs font-mono tabular-nums shrink-0">
                        × {row.quantity}
                      </span>
                    </div>
                    <div className="ps-5 mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {showTax && (
                        <>
                          <span>{t("finance.payments.allocation.pretax")}</span>
                          <span dir="ltr" className="text-end font-mono tabular-nums">
                            {fmt(row.line_pretax_amount)}
                          </span>
                          <span>{t("finance.payments.allocation.tax")}</span>
                          <span dir="ltr" className="text-end font-mono tabular-nums">
                            {fmt(row.line_tax_amount)}
                          </span>
                        </>
                      )}
                      <span className="font-semibold text-foreground">
                        {t("finance.payments.allocation.totalDue")}
                      </span>
                      <span
                        dir="ltr"
                        className="text-end font-mono tabular-nums font-semibold text-foreground"
                      >
                        {fmt(row.line_gross_amount)}
                      </span>
                    </div>
                    {isPackage && row.package_services_snapshot && row.package_services_snapshot.length > 0 && (
                      <div className="ps-5 mt-1.5 space-y-0.5">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {t("finance.multiInvoicePayment.packageIncludedItems")}
                        </div>
                        <ul className="ps-3 space-y-0.5">
                          {row.package_services_snapshot.map((child, i) => {
                            const childName =
                              (isRtl ? child.name_ar ?? child.name : child.name ?? child.name_ar) ??
                              "";
                            return (
                              <li
                                key={i}
                                className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0"
                              >
                                <span className="truncate">{childName}</span>
                                {child.quantity != null && (
                                  <span dir="ltr" className="shrink-0 tabular-nums">
                                    × {child.quantity}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
