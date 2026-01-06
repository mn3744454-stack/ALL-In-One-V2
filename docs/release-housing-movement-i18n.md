# Housing, Movement & i18n Release Notes

## Running Audits

### i18n Audit

```bash
npx tsx scripts/audit-i18n.ts
```

**Expected output:** 0 missing keys in en.ts and ar.ts

The audit script:
- Scans all `t('...')`, `tGlobal('...')`, and `.t('...')` patterns
- Verifies keys exist in both `en.ts` and `ar.ts`
- Reports missing keys (causes exit code 1)
- Warns about dynamic keys that can't be statically verified
- Uses allowlist from `scripts/i18n-allowlist.json` for dynamic patterns

### RTL Audit

```bash
npx tsx scripts/audit-rtl.ts
```

**Expected output:** No RTL issues found (exit code 0)

The RTL audit script:
- Scans `src/**` for physical direction classes (ml-*, mr-*, left-*, right-*, text-left, etc.)
- Reports violations that may break RTL layouts
- Uses allowlist from `scripts/rtl-allowlist.json` for exceptions (UI library components, centering, etc.)
- Suggests logical property replacements (ml-* → ms-*, left-* → start-*, etc.)

## Smoke Test Checklist

### Housing Module
- [ ] Areas tab: Create, edit, toggle active
- [ ] Units tab: Create stall/paddock/room/cage, assign horse
- [ ] Units tab: Search by name/code works
- [ ] Units tab: Filter by type works (5 options: stall, paddock, room, cage, other)
- [ ] Units tab: Filter by status works (vacant/occupied/full)
- [ ] Units tab: Stats cards show correct counts
- [ ] Settings tab: Load demo, remove demo
- [ ] BottomNav (mobile): All 3 tabs functional
- [ ] RTL: Layout mirrors correctly

### Movement Module
- [ ] Record Entry/Exit/Transfer
- [ ] Horse profile shows current location
- [ ] Demo load/remove works
- [ ] BottomNav (mobile): All 3 tabs functional

### i18n Verification
- [ ] Switch to Arabic, verify IBM Plex Sans Arabic font
- [ ] All strings translated
- [ ] Switch back to English, verify default font (IBM Plex Sans)
- [ ] No missing translation warnings in console

### Font Smoke Test
1. Load app in English → Body uses "IBM Plex Sans", headings use "Playfair Display"
2. Switch to Arabic → All text uses "IBM Plex Sans Arabic"
3. Check headings, body text, buttons, form labels in both languages
4. Toggle back to English → Fonts revert correctly

## Demo Data Workflow

1. Navigate to Housing Settings tab
2. Click "Load Demo Data"
3. Verify: Areas and units created
4. Verify: Some horses assigned to units
5. Click "Remove Demo Data"
6. Verify: Only demo data removed (is_demo = true)

## Strict UI Constraints

**Unit Types (DB enum - strict allowlist):**
- stall
- paddock
- room
- cage
- other

**Occupancy Modes (DB enum - strict allowlist):**
- single
- group

**Note:** Additional types in i18n files (pasture, barn, isolation, foaling, shared) are reserved for future use and must NOT appear in UI dropdowns.

## Known Limitations

- Unit types limited to DB enum values only
- Demo requires existing horses to demonstrate occupancy
- Movement demo requires at least 1 branch
- Capacity visualization deferred to next iteration
- Bulk assignment deferred to next iteration
- `shared` occupancy mode kept in i18n for future but not exposed in UI
