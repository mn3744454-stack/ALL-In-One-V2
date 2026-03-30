

## Fix: Boarding Invoice Dialog Overflow

**Problem**: The `CreateInvoiceFromAdmission` dialog content exceeds viewport height when billed periods, overlap warnings, and form fields are all visible — content spills outside the dialog with no scroll.

**Solution**: Apply the same layout containment pattern already established for `CheckoutDialog` (per the boarding-checkout-layout-standard memory):

1. **`CreateInvoiceFromAdmission.tsx`** — restructure the dialog content:
   - Add `max-h-[85vh] flex flex-col` to `DialogContent`
   - Keep `DialogHeader` as `shrink-0` (sticky top)
   - Wrap the middle content (billed periods summary, warnings, form fields) in a `flex-1 overflow-y-auto` scroll region
   - Keep the action buttons (`Cancel` / `Create`) as `shrink-0` pinned at the bottom outside the scroll area

2. **No changes** to `dialog.tsx` (shared component), statement UI, or any other files.

**Files changed**: `src/components/housing/CreateInvoiceFromAdmission.tsx` only.

