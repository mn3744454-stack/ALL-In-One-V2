/**
 * Unified tax computation utility.
 * Uses tenant-level settings: default_tax_rate and prices_tax_inclusive.
 */

export interface TaxConfig {
  /** Tax rate as percentage, e.g. 15 for 15% */
  taxRate: number;
  /** Whether catalog/entered prices include tax */
  pricesTaxInclusive: boolean;
}

export interface TaxResult {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

/**
 * Extract tax configuration from the active tenant object.
 * Falls back to 15% exclusive if not configured.
 */
export function getTenantTaxConfig(tenant: any): TaxConfig {
  return {
    taxRate: Number(tenant?.default_tax_rate ?? 15),
    pricesTaxInclusive: Boolean(tenant?.prices_tax_inclusive ?? false),
  };
}

/**
 * Compute subtotal, tax, and total from a given amount using tenant tax config.
 *
 * If prices are tax-exclusive (default for Saudi/GCC):
 *   subtotal = amount, tax = amount × rate/100, total = subtotal + tax
 *
 * If prices are tax-inclusive:
 *   total = amount, tax = amount × rate / (100 + rate), subtotal = total - tax
 */
export function computeTax(amount: number, config: TaxConfig): TaxResult {
  if (amount === 0 || config.taxRate === 0) {
    return { subtotal: amount, taxAmount: 0, totalAmount: amount };
  }

  if (config.pricesTaxInclusive) {
    // Price entered is the total (inclusive of tax)
    const taxAmount = round2(amount * config.taxRate / (100 + config.taxRate));
    const subtotal = round2(amount - taxAmount);
    return { subtotal, taxAmount, totalAmount: amount };
  } else {
    // Price entered is the subtotal (exclusive of tax)
    const taxAmount = round2(amount * config.taxRate / 100);
    const totalAmount = round2(amount + taxAmount);
    return { subtotal: amount, taxAmount, totalAmount };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
