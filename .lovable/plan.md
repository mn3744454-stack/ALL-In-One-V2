## Goal
Make the table column headers in **Contract Documents** (image 26) and **Contract Forms** (image 27) appear **bold** to match the Operational Contracts table (image 25).

## Root Cause
In `src/contracts/sections/ContractDocumentsSection.tsx` and `src/contracts/sections/ContractTemplatesSection.tsx`, the `<th>` elements use `font-medium`, which renders thinner than the bold headers used by the Operational Contracts table.

## Change
Update the `<thead>` styling in both files:
- Replace `font-medium` with `font-bold` on each `<th>`.
- Change the header row text color from `text-muted-foreground` to `text-foreground` so the bold weight reads clearly (matching image 25).

No other changes:
- No layout, filters, view-switcher, dialogs, hooks, or translations touched.
- No backend, schema, RPC, RLS, permissions, or editor changes.
- Operational Contracts table untouched (already correct).

## Files
- `src/contracts/sections/ContractDocumentsSection.tsx` — thead styling only.
- `src/contracts/sections/ContractTemplatesSection.tsx` — thead styling only.

## QA
- Documents tab → Table view: headers (الاسم، النوع، الحالة، آخر تحديث، الإجراءات) appear bold.
- Forms tab → Table view: same headers appear bold.
- Operational Contracts table unchanged.
- AR/RTL and EN/LTR both render bold weight.
- No console/build/type errors.
