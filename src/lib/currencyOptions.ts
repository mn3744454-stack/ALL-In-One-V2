/**
 * Shared currency options used across all currency selectors in the platform.
 * Single source of truth — keep in sync with TaxPricingCard.
 */
export const CURRENCY_OPTIONS = [
  { value: "SAR", label: "SAR – Saudi Riyal" },
  { value: "AED", label: "AED – UAE Dirham" },
  { value: "QAR", label: "QAR – Qatari Riyal" },
  { value: "KWD", label: "KWD – Kuwaiti Dinar" },
  { value: "BHD", label: "BHD – Bahraini Dinar" },
  { value: "OMR", label: "OMR – Omani Rial" },
  { value: "USD", label: "USD – US Dollar" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "GBP", label: "GBP – British Pound" },
] as const;
