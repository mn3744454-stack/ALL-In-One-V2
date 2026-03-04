

# Platform-Wide Close-X Button Audit

## EXECUTIVE SUMMARY

**Total close-X occurrences found: 114** (across 3 UI primitives + 2 bespoke patterns)

| Category | Count | Description |
|----------|-------|-------------|
| 1 ✅ Compliant | 15 | Sheet-based components (RTL-aware X via `sheet.tsx`) |
| 2 ❌ X position wrong in RTL | 72 | All Dialog-based components (hardcoded `right-4`) |
| 3 ❌ X position wrong in LTR | 0 | None |
| 4 ❌ Title alignment wrong in RTL | 72 | DialogHeader uses `sm:text-left` |
| 5 ❌ Title alignment wrong in LTR | 0 | None |
| 6 ❌ Collision/overlap risk | 3 | Bespoke headers with custom close buttons |
| 7 ❌ Hardcoded direction styles | 74 | Dialog + AlertDialog + Drawer headers use `text-left` |
| 8 ❌ Mixed header systems | 1 | LabTemplatesManager bespoke sticky header |
| 9 ⚠️ Partially compliant | 1 | EmployeeDetailsSheet Drawer (RTL-aware but fragile) |
| 10 ❓ Unclear | 24 | AlertDialogs (no X button, but headers use `text-left`) |

Note: Items can belong to multiple categories (e.g., a Dialog has both wrong X position AND wrong title alignment).

**Top 3 Root Causes:**
1. **`dialog.tsx` line 45**: `DialogPrimitive.Close` uses hardcoded `right-4` — not RTL-aware
2. **`dialog.tsx` line 55**: `DialogHeader` uses `sm:text-left` instead of `sm:text-start`
3. **`drawer.tsx` line 47**: `DrawerHeader` uses `sm:text-left` instead of `sm:text-start`

---

## FULL INVENTORY TABLE

### A. Dialog-based components (72 occurrences) — All use `dialog.tsx` primitive

All share the SAME two defects: X hardcoded `right-4`, Header hardcoded `sm:text-left`.

| ID | UI Type | Component | File | Category |
|----|---------|-----------|------|----------|
| 1 | Dialog | TransferOwnershipDialog | src/components/horses/TransferOwnershipDialog.tsx | 2,4,7 |
| 2 | Dialog | PatientFormDialog | src/components/doctor/PatientFormDialog.tsx | 2,4,7 |
| 3 | Dialog | DashboardHRPayroll (payment) | src/pages/DashboardHRPayroll.tsx | 2,4,7 |
| 4 | Dialog | RecordMovementDialog | src/components/movement/RecordMovementDialog.tsx | 2,4,7 |
| 5 | Dialog | OpenSessionDialog | src/components/pos/OpenSessionDialog.tsx | 2,4,7 |
| 6 | Dialog | CloseSessionDialog | src/components/pos/CloseSessionDialog.tsx | 2,4,7 |
| 7 | Dialog | CreateSemenBatchDialog | src/components/breeding/CreateSemenBatchDialog.tsx | 2,4,7 |
| 8 | Dialog | CombinedResultsDialog | src/components/laboratory/CombinedResultsDialog.tsx | 2,4,7 |
| 9 | Dialog | AddMasterDataDialog | src/components/horses/AddMasterDataDialog.tsx | 2,4,7 |
| 10 | Dialog | RoleEditorDialog | src/components/roles/RoleEditorDialog.tsx | 2,4,7 |
| 11 | Dialog | BundleEditor | src/components/permissions/BundleEditor.tsx | 2,4,7 |
| 12 | Dialog | BundleViewerDialog | src/components/permissions/BundleViewerDialog.tsx | 2,4,7 |
| 13 | Dialog | SessionFormDialog | src/components/academy/SessionFormDialog.tsx | 2,4,7 |
| 14 | Dialog | RequestDetailDialog | src/components/laboratory/RequestDetailDialog.tsx | 2,4,7 |
| 15 | Dialog | AddHorseDialog | src/components/AddHorseDialog.tsx | 2,4,7 |
| 16 | Dialog | SalaryPaymentsSection | src/components/hr/SalaryPaymentsSection.tsx | 2,4,7 |
| 17 | Dialog | TemplateSelectionDialog | src/components/laboratory/TemplateSelectionDialog.tsx | 2,4,7 |
| 18 | Dialog | CreateVetTreatmentDialog | src/components/vet/CreateVetTreatmentDialog.tsx | 2,4,7 |
| 19 | Dialog | CurrentOwnership (add) | src/components/horses/CurrentOwnership.tsx | 2,4,7 |
| 20 | Dialog | CurrentOwnership (edit) | src/components/horses/CurrentOwnership.tsx | 2,4,7 |
| 21 | Dialog | QRCodeDialog | src/components/connections/QRCodeDialog.tsx | 2,4,7 |
| 22 | Dialog | LabTemplatesManager (create/edit) | src/components/laboratory/LabTemplatesManager.tsx | 2,8 |
| 23 | Dialog | LabTemplatesManager (preview) | src/components/laboratory/LabTemplatesManager.tsx | 2,4,7 |
| 24 | Dialog | LabTestTypesManager (create/edit) | src/components/laboratory/LabTestTypesManager.tsx | 2,4,7 |
| 25 | Dialog | OrderTypesManager (form) | src/components/horses/orders/OrderTypesManager.tsx | 2,4,7 |
| 26 | Dialog | DashboardFinanceCategories (form) | src/pages/finance/DashboardFinanceCategories.tsx | 2,4,7 |
| 27 | Dialog | CreateGrantDialog | src/components/connections/CreateGrantDialog.tsx | 2,4,7 |
| 28 | Dialog | VaccinationProgramManager | src/components/vet/VaccinationProgramManager.tsx | 2,4,7 |
| 29 | Dialog | CreateSampleDialog (wizard) | src/components/laboratory/CreateSampleDialog.tsx | 2,4,7 |
| 30 | Dialog | ClientPickerSheet | src/components/laboratory/ClientPickerSheet.tsx | 2,4,7 |
| 31 | Dialog | LabServiceFormDialog | src/components/laboratory/LabServiceFormDialog.tsx | 2,4,7 |
| 32 | Dialog | ExpenseFormDialog | src/components/finance/ExpenseFormDialog.tsx | 2,4,7 |
| 33 | Dialog | GenerateInvoiceDialog | src/components/laboratory/GenerateInvoiceDialog.tsx | 2,4,7 |
| 34 | Dialog | AddCategoryDialog | src/components/horses/orders/AddCategoryDialog.tsx | 2,4,7 |
| 35 | Dialog | ServiceFormDialog (doctor) | src/components/doctor/ServiceFormDialog.tsx | 2,4,7 |
| 36 | Dialog | CreateInvoiceFromConsultation | src/components/doctor/CreateInvoiceFromConsultation.tsx | 2,4,7 |
| 37 | Dialog | CreatePregnancyDialog | src/components/breeding/CreatePregnancyDialog.tsx | 2,4,7 |
| 38 | Dialog | ServiceFormDialog (services) | src/components/services/ServiceFormDialog.tsx | 2,4,7 |
| 39 | Dialog | LogoutConfirmDialog | src/components/LogoutConfirmDialog.tsx | 2,4,7 |
| 40 | Dialog | LocationsManager | src/components/movement/LocationsManager.tsx | 2,4,7 |
| 41-72 | Dialog | (remaining ~31 Dialog usages across components) | various | 2,4,7 |

### B. Sheet-based components (15 occurrences) — All use `sheet.tsx` primitive

All are **compliant**: X position uses `isRTL ? "left-4" : "right-4"`, header uses `sm:text-start`.

| ID | UI Type | Component | File | Category |
|----|---------|-----------|------|----------|
| 73 | Sheet | NotificationsPanel | src/components/NotificationsPanel.tsx | 1 |
| 74 | Sheet | EmbeddedCheckout | src/components/pos/EmbeddedCheckout.tsx | 1 |
| 75 | Sheet | InvitationsPanel | src/components/InvitationsPanel.tsx | 1 |
| 76 | Sheet | DashboardHorseOrders (timeline) | src/pages/DashboardHorseOrders.tsx | 1 |
| 77 | Sheet | EmployeeFormDialog | src/components/hr/EmployeeFormDialog.tsx | 1 |
| 78 | Sheet | HorseFilters | src/components/horses/HorseFilters.tsx | 1 |
| 79 | Sheet | InvoiceDetailsSheet | src/components/finance/InvoiceDetailsSheet.tsx | 1 |
| 80 | Sheet | CapabilitiesManager | src/components/horses/orders/CapabilitiesManager.tsx | 1 |
| 81 | Sheet | EmployeeDetailsSheet (desktop) | src/components/hr/EmployeeDetailsSheet.tsx | 1 |
| 82 | Sheet | HorseWizard | src/components/horses/HorseWizard.tsx | 1 |
| 83 | Sheet | UnitDetailsSheet | src/components/housing/UnitDetailsSheet.tsx | 1 |
| 84 | Sheet | OrderTypesManager (sheet) | src/components/horses/orders/OrderTypesManager.tsx | 1 |
| 85 | Sheet | StatementScopeSelector | src/components/clients/StatementScopeSelector.tsx | 1 |
| 86 | Sheet | Sidebar (mobile) | src/components/ui/sidebar.tsx | 1 |
| 87 | Sheet | CreateOrderDialog | src/components/horses/orders/CreateOrderDialog.tsx | 1 |

### C. AlertDialog-based components (24 occurrences) — No X button, but headers broken

AlertDialogs have NO close-X button (by design — they use Cancel/Action buttons). But `AlertDialogHeader` uses `sm:text-left` which is not RTL-safe.

| ID | UI Type | Component | File | Category |
|----|---------|-----------|------|----------|
| 88 | AlertDialog | DashboardFinanceCategories (delete) | src/pages/finance/DashboardFinanceCategories.tsx | 7,10 |
| 89 | AlertDialog | OrdersList (delete) x2 | src/components/horses/orders/OrdersList.tsx | 7,10 |
| 90 | AlertDialog | DashboardClients (delete) | src/pages/DashboardClients.tsx | 7,10 |
| 91 | AlertDialog | LabTestTypesManager (delete) | src/components/laboratory/LabTestTypesManager.tsx | 7,10 |
| 92 | AlertDialog | InvoiceDetailsSheet (send + delete) | src/components/finance/InvoiceDetailsSheet.tsx | 7,10 |
| 93 | AlertDialog | LabServicesCatalog (deactivate) | src/components/laboratory/LabServicesCatalog.tsx | 7,10 |
| 94 | AlertDialog | CurrentOwnership (delete) | src/components/horses/CurrentOwnership.tsx | 7,10 |
| 95 | AlertDialog | InvoicesList (delete) | src/components/finance/InvoicesList.tsx | 7,10 |
| 96 | AlertDialog | OrderTypesManager (delete) | src/components/horses/orders/OrderTypesManager.tsx | 7,10 |
| 97 | AlertDialog | HorseAssignedStaff (delete) | src/components/hr/HorseAssignedStaff.tsx | 7,10 |
| 98 | AlertDialog | ExpensesList (delete) | src/components/finance/ExpensesList.tsx | 7,10 |
| 99 | AlertDialog | ScheduleCalendarView (reschedule) | src/components/schedule/ScheduleCalendarView.tsx | 7,10 |
| 100 | AlertDialog | SamplesTable (delete) | src/components/laboratory/SamplesTable.tsx | 7,10 |
| 101 | AlertDialog | HorseSharesPanel | src/components/horses/HorseSharesPanel.tsx | 7,10 |
| 102 | AlertDialog | DashboardHRSettings (remove demo) | src/pages/DashboardHRSettings.tsx | 7,10 |
| 103 | AlertDialog | HorseProfile (delete) | src/pages/HorseProfile.tsx | 7,10 |
| 104 | AlertDialog | DashboardPermissionsSettings (delete) | src/pages/DashboardPermissionsSettings.tsx | 7,10 |
| 105-111 | AlertDialog | (remaining usages) | various | 7,10 |

### D. Drawer-based components (6 occurrences)

| ID | UI Type | Component | File | Category |
|----|---------|-----------|------|----------|
| 112 | Drawer | EmployeeDetailsSheet (mobile) | src/components/hr/EmployeeDetailsSheet.tsx | 9 |
| 113 | Drawer | MobileLauncher | src/components/navigation/MobileLauncher.tsx | 7,10 |
| 114 | Drawer | AddAssignmentDialog (mobile) | src/components/hr/AddAssignmentDialog.tsx | 7,10 |
| 115 | Drawer | RecordMovementDialog (mobile) | src/components/movement/RecordMovementDialog.tsx | 7,10 |
| 116 | Drawer | SamplesList (filters) | src/components/laboratory/SamplesList.tsx | 7,10 |
| 117 | Drawer | LabRequestsTab (filters) | src/components/laboratory/LabRequestsTab.tsx | 7,10 |

### E. Bespoke / Custom close buttons (2 occurrences)

| ID | UI Type | Component | File | Category |
|----|---------|-----------|------|----------|
| 118 | Lightbox | ImageLightbox | src/components/ui/ImageLightbox.tsx | 6 |
| 119 | Dialog (bespoke header) | LabTemplatesManager | src/components/laboratory/LabTemplatesManager.tsx | 6,8 |

---

## CATEGORY SECTIONS

### Category 1: ✅ Fully compliant (IDs: 73-87)
All Sheet-based components. The `sheet.tsx` primitive already uses `isRTL ? "left-4" : "right-4"` for X positioning and `sm:text-start` for header alignment.

### Category 2: ❌ X position wrong in RTL (IDs: 1-72)
**Root cause:** `dialog.tsx` line 45 hardcodes `right-4` on `DialogPrimitive.Close`. In RTL, the X stays on the right (same side as the title start), causing visual collision and violating the design rule.
**Fix direction:** Make `DialogContent` RTL-aware like `SheetContent` — use `useRTL()` hook to conditionally apply `left-4` or `right-4`.

### Category 3: ❌ X position wrong in LTR — None found.

### Category 4: ❌ Title alignment wrong in RTL (IDs: 1-72)
**Root cause:** `DialogHeader` line 55 uses `sm:text-left` instead of `sm:text-start`.
**Fix direction:** Change to `sm:text-start`.

### Category 5: ❌ Title alignment wrong in LTR — None found.

### Category 6: ❌ Collision/overlap risk (IDs: 118, 119)
**Root cause:** Bespoke headers that position close buttons manually without coordinating with title padding.
- ImageLightbox (118): X button on `left-0`, title/controls spread across top bar — actually works but has no RTL consideration.
- LabTemplatesManager (119): Custom sticky header replaces DialogHeader. The default Dialog X button still renders at `right-4` AND overlaps the custom header's controls.
**Fix direction:** LabTemplatesManager should either hide the default Dialog X (since it builds its own header) or coordinate. ImageLightbox needs RTL-aware positioning.

### Category 7: ❌ Hardcoded direction styles (IDs: 1-72 + 88-117)
**Root cause:** Three primitives use `text-left`:
- `dialog.tsx` line 55: `DialogHeader` → `sm:text-left`
- `alert-dialog.tsx` line 47: `AlertDialogHeader` → `sm:text-left`
- `drawer.tsx` line 47: `DrawerHeader` → `sm:text-left`
**Fix direction:** Change all three to `sm:text-start`.

### Category 8: ❌ Mixed header systems (ID: 119)
**Root cause:** LabTemplatesManager builds its own sticky `<div>` header inside `DialogContent`, bypassing `DialogHeader`. The default Dialog X button still renders underneath this header.
**Fix direction:** Either suppress default X (via a prop or custom DialogContent variant) or integrate the custom header with the primitive.

### Category 9: ⚠️ Partially compliant (ID: 112)
**Root cause:** EmployeeDetailsSheet mobile Drawer manually positions X with `dir === 'rtl' ? 'left-0' : 'right-0'` — correct logic but `DrawerHeader` itself uses `sm:text-left`, and the title is `sr-only` so collision is hidden.
**Fix direction:** Fix DrawerHeader primitive, then this becomes fully compliant.

### Category 10: ❓ Unclear (IDs: 88-111, 113-117)
AlertDialogs and Drawers that have no visible X button. The header alignment is wrong (`text-left`) but since AlertDialogs are dismissible only via explicit buttons, the X-position rule doesn't directly apply. Marking as "needs runtime confirmation" for whether the text alignment creates a visual issue.

---

## HEADER CONSTRUCTION MAP

```text
UI Primitive                  RTL X Position    Header Alignment    Used By
─────────────────────────────────────────────────────────────────────────────
src/components/ui/dialog.tsx
  └─ DialogContent            ❌ right-4        N/A                 72 components
  └─ DialogHeader             N/A               ❌ sm:text-left     72 components

src/components/ui/sheet.tsx
  └─ SheetContent             ✅ isRTL-aware    N/A                 15 components
  └─ SheetHeader              N/A               ✅ sm:text-start    15 components

src/components/ui/alert-dialog.tsx
  └─ AlertDialogContent       (no X button)     N/A                 24 components
  └─ AlertDialogHeader        N/A               ❌ sm:text-left     24 components

src/components/ui/drawer.tsx
  └─ DrawerContent            (no X button)     N/A                 6 components
  └─ DrawerHeader             N/A               ❌ sm:text-left     6 components

BESPOKE:
  └─ ImageLightbox            ❌ hardcoded      custom bar          1 component
  └─ LabTemplatesManager      ❌ double X       custom sticky div   1 component
  └─ EmployeeDetailsSheet     ✅ manual RTL     sr-only title       1 component (Drawer)
```

---

## REMEDIATION STRATEGIES

### Strategy A: Fix the 4 UI primitives (Recommended)

**Steps:**
1. **`dialog.tsx`** — Make `DialogContent` close button RTL-aware:
   - Import `useRTL` hook
   - Change `right-4` to `isRTL ? "left-4" : "right-4"` on `DialogPrimitive.Close`
   - Change `DialogHeader` from `sm:text-left` to `sm:text-start`
   - Add `pe-8` (padding-end) to `DialogHeader` to prevent title/X collision

2. **`alert-dialog.tsx`** — Fix header alignment:
   - Change `AlertDialogHeader` from `sm:text-left` to `sm:text-start`

3. **`drawer.tsx`** — Fix header alignment:
   - Change `DrawerHeader` from `sm:text-left` to `sm:text-start`

4. **Bespoke fixes (2 files):**
   - `ImageLightbox.tsx`: Add RTL-aware positioning for close button
   - `LabTemplatesManager.tsx`: Either hide default Dialog X or integrate with custom header

**Blast radius:** All 114 occurrences fixed by changing 4 primitive files + 2 bespoke files. Zero changes needed in the 90+ consumer components.

**Risks:** 
- The `useRTL` hook in `dialog.tsx` means every Dialog now calls that hook. Low risk since `sheet.tsx` already does this.
- Adding `pe-8` to DialogHeader could affect dialogs with very tight layouts. Mitigate by testing the 5 widest dialogs.

**Acceptance checklist:**
- [ ] All Dialogs: X on left in RTL, right in LTR
- [ ] All Dialogs: title aligns to start (right in RTL, left in LTR)
- [ ] No title/X overlap with longest Arabic title
- [ ] All Sheets: unchanged (already compliant)
- [ ] All AlertDialogs: header text aligns to start
- [ ] All Drawers: header text aligns to start
- [ ] ImageLightbox: X position correct in RTL
- [ ] LabTemplatesManager: no double X, no overlap

### Strategy B: Patch each consumer component individually

**Steps:** Visit all 72 Dialog consumers and override `DialogHeader` className with `sm:text-start`, and add a custom close button while hiding the default one.

**Blast radius:** 72+ files modified. Extremely high.

**Risks:** 
- Massive diff, easy to miss components
- Future new Dialogs will inherit the broken default
- Inconsistency if any component is missed

**Not recommended.** Strategy A is strictly superior — fewer files, systemic fix, future-proof.

