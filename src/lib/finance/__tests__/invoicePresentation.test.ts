/// <reference types="node" />
import { describe, expect, it } from "vitest";
import {
  buildInvoicePresentation,
  invoiceItemsMatchHorseSelection,
  type RawInvoiceItemForPresentation,
} from "../invoicePresentation";

const CL = "Client-Level Charges";

function opts(extra: Partial<Parameters<typeof buildInvoicePresentation>[1]> = {}) {
  return { clientLevelLabel: CL, lang: "en", ...extra };
}

describe("buildInvoicePresentation — Phase 1 · N+1A invariants", () => {
  it("G1: Package parent attributed to Horse A carries children under it, children are non-financial", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "pkg-1",
        description: "Jockey Riding",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        horse_id: "horse-A",
        resolvedHorseName: "Maha",
        package_id: "pkg-abc",
        package_services_snapshot: [
          { service_id: "s1", name: "Treatment", quantity: 1 },
          { service_id: "s2", name: "Birth Assistance", quantity: 1 },
        ],
      },
    ];
    const p = buildInvoicePresentation(items, opts());
    expect(p.groups).toHaveLength(1);
    expect(p.groups[0].key).toBe("horse:horse-A");
    expect(p.groups[0].horseName).toBe("Maha");
    expect(p.groups[0].items).toHaveLength(1);
    const parent = p.groups[0].items[0];
    expect(parent.isPackage).toBe(true);
    expect(parent.children).toHaveLength(2);
    expect(parent.total_price).toBe(500);
    // Children contribute nothing.
    expect(p.computedItemsSubtotal).toBe(500);
    expect(p.parentItemCount).toBe(1);
    expect(p.childItemCount).toBe(2);
  });

  it("G2: Same Package on two horses stays as two distinct parents, one per group", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "pkg-A",
        description: "Jockey Riding",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        horse_id: "horse-A",
        resolvedHorseName: "Maha",
        package_id: "pkg-abc",
        package_services_snapshot: [{ service_id: "s1", name: "Treatment", quantity: 1 }],
      },
      {
        id: "pkg-B",
        description: "Jockey Riding",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        horse_id: "horse-B",
        resolvedHorseName: "Fatin",
        package_id: "pkg-abc",
        package_services_snapshot: [{ service_id: "s1", name: "Treatment", quantity: 1 }],
      },
    ];
    const p = buildInvoicePresentation(items, opts());
    expect(p.groups.map((g) => g.key)).toEqual(["horse:horse-A", "horse:horse-B"]);
    expect(p.groups[0].items[0].id).toBe("pkg-A");
    expect(p.groups[1].items[0].id).toBe("pkg-B");
    expect(p.groups[0].items[0].children).toHaveLength(1);
    expect(p.groups[1].items[0].children).toHaveLength(1);
    expect(p.parentItemCount).toBe(2);
    expect(p.computedItemsSubtotal).toBe(1000);
  });

  it("G3: Multiple unattributed items form exactly one Client-Level group", () => {
    const items: RawInvoiceItemForPresentation[] = [
      { id: "cl1", description: "Admin Fee", quantity: 1, unit_price: 10, total_price: 10 },
      { id: "cl2", description: "Late Fee", quantity: 1, unit_price: 20, total_price: 20 },
      {
        id: "h1",
        description: "Consult",
        quantity: 1,
        unit_price: 100,
        total_price: 100,
        horse_id: "horse-A",
        resolvedHorseName: "Maha",
      },
    ];
    const p = buildInvoicePresentation(items, opts());
    const clientLevel = p.groups.filter((g) => g.kind === "client_level");
    expect(clientLevel).toHaveLength(1);
    expect(clientLevel[0].items.map((i) => i.id)).toEqual(["cl1", "cl2"]);
    // Client-Level is last.
    expect(p.groups[p.groups.length - 1].kind).toBe("client_level");
    // Horse item stays outside.
    const horseGroup = p.groups.find((g) => g.kind === "horse")!;
    expect(horseGroup.items.map((i) => i.id)).toEqual(["h1"]);
  });

  it("G4: exact duplicate service snapshot suppressed; distinct description retained", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "d1",
        description: "General Examination",
        service_name_snapshot: " general examination ",
        quantity: 1,
        unit_price: 50,
        total_price: 50,
      },
      {
        id: "d2",
        description: "Pre-purchase assessment",
        service_name_snapshot: "General Examination",
        quantity: 1,
        unit_price: 50,
        total_price: 50,
      },
    ];
    const p = buildInvoicePresentation(items, opts());
    const [dup, distinct] = p.groups[0].items;
    expect(dup.serviceLabel).toBeNull();
    expect(distinct.serviceLabel).toBe("General Examination");
    expect(distinct.description).toBe("Pre-purchase assessment");
  });

  it("G5: Package children contribute zero; totals derive from parent only", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "pkg-1",
        description: "Jockey Riding",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        package_id: "pkg-abc",
        package_services_snapshot: [
          { service_id: "s1", name: "A", quantity: 1 },
          { service_id: "s2", name: "B", quantity: 1 },
          { service_id: "s3", name: "C", quantity: 1 },
          { service_id: "s4", name: "D", quantity: 1 },
        ],
      },
    ];
    const p = buildInvoicePresentation(items, opts());
    expect(p.computedItemsSubtotal).toBe(500); // not 500 * 5
    expect(p.groups[0].itemsTotal).toBe(500);
    expect(p.parentItemCount).toBe(1);
    expect(p.childItemCount).toBe(4);
  });

  it("G6: horse_id, lab_horse_id, and client-level form three separate groups", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "h",
        description: "Stable service",
        quantity: 1,
        unit_price: 10,
        total_price: 10,
        horse_id: "horse-A",
        resolvedHorseName: "Maha",
      },
      {
        id: "lh",
        description: "Lab test",
        quantity: 1,
        unit_price: 20,
        total_price: 20,
        lab_horse_id: "lab-B",
        resolvedHorseName: "Sample Horse",
      },
      { id: "cl", description: "Admin", quantity: 1, unit_price: 5, total_price: 5 },
    ];
    const p = buildInvoicePresentation(items, opts());
    const kinds = p.groups.map((g) => g.kind);
    expect(kinds).toEqual(["horse", "lab_horse", "client_level"]);
    expect(p.groups[0].horseName).toBe("Maha");
    expect(p.groups[1].horseName).toBe("Sample Horse");
    expect(p.groups[2].horseName).toBeNull();
  });

  it("G7: empty Package snapshot renders parent only with no children and no error", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "pkg-empty",
        description: "Empty package",
        quantity: 1,
        unit_price: 100,
        total_price: 100,
        package_id: "pkg-empty",
        package_services_snapshot: [],
      },
    ];
    const p = buildInvoicePresentation(items, opts());
    expect(p.groups[0].items[0].isPackage).toBe(true);
    expect(p.groups[0].items[0].children).toEqual([]);
    expect(p.childItemCount).toBe(0);
  });

  it("G8: same input consumed by Screen and PDF paths yields identical semantic model", () => {
    const items: RawInvoiceItemForPresentation[] = [
      {
        id: "pkg",
        description: "Jockey Riding",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
        horse_id: "horse-A",
        resolvedHorseName: "Maha",
        package_id: "pkg-abc",
        package_services_snapshot: [{ service_id: "s1", name: "Treatment", quantity: 1 }],
      },
      { id: "cl", description: "Admin", quantity: 1, unit_price: 5, total_price: 5 },
    ];
    const screen = buildInvoicePresentation(items, opts());
    const pdf = buildInvoicePresentation(items, opts());
    expect(pdf.groups.map((g) => g.key)).toEqual(screen.groups.map((g) => g.key));
    expect(pdf.parentItemCount).toBe(screen.parentItemCount);
    expect(pdf.childItemCount).toBe(screen.childItemCount);
    expect(pdf.computedItemsSubtotal).toBe(screen.computedItemsSubtotal);
    // Deep child membership match.
    for (let i = 0; i < screen.groups.length; i++) {
      expect(pdf.groups[i].items.map((it) => it.id)).toEqual(
        screen.groups[i].items.map((it) => it.id),
      );
      for (let j = 0; j < screen.groups[i].items.length; j++) {
        expect(pdf.groups[i].items[j].children.map((c) => c.name)).toEqual(
          screen.groups[i].items[j].children.map((c) => c.name),
        );
      }
    }
  });

  it("G10: reopen serialization — package horse persists round-trip", () => {
    // Simulate the payload the frontend sends: package line with horse_id.
    const line = {
      id: "pkg",
      description: "Jockey Riding",
      quantity: 1,
      unit_price: 500,
      total_price: 500,
      horse_id: "horse-A",
      package_id: "pkg-abc",
      package_services_snapshot: [{ service_id: "s1", name: "Treatment", quantity: 1 }],
    };
    // Serialize -> parse to mimic RPC round-trip.
    const roundTripped: RawInvoiceItemForPresentation = JSON.parse(JSON.stringify(line));
    roundTripped.resolvedHorseName = "Maha";
    const p = buildInvoicePresentation([roundTripped], opts());
    expect(p.groups[0].key).toBe("horse:horse-A");
    expect(p.groups[0].items[0].isPackage).toBe(true);
    expect(p.groups[0].items[0].children).toHaveLength(1);
  });
});

describe("invoiceItemsMatchHorseSelection — Phase 1 · G9 Statement filter parity", () => {
  it("matches when a package parent carries horse_id for the selected horse", () => {
    const items = [
      { horse_id: "horse-A", lab_horse_id: null }, // package parent for A
    ];
    expect(invoiceItemsMatchHorseSelection(items, ["horse-A"])).toBe(true);
    expect(invoiceItemsMatchHorseSelection(items, ["horse-B"])).toBe(false);
  });

  it("does not match when only unrelated items are attributed", () => {
    const items = [
      { horse_id: "horse-B", lab_horse_id: null },
      { horse_id: null, lab_horse_id: null },
    ];
    expect(invoiceItemsMatchHorseSelection(items, ["horse-A"])).toBe(false);
  });

  it("empty selection never matches", () => {
    expect(
      invoiceItemsMatchHorseSelection([{ horse_id: "horse-A", lab_horse_id: null }], []),
    ).toBe(false);
  });
});
