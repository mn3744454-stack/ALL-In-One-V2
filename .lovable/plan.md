# Final Verification Plan — Billing Links Fix + Phase 7 Proof (Corrected Final Version)

## A. Billing Links — Critical Schema Violation Confirmed and Final Fix Required

**Problem**: `billing_links.invoice_id` has a foreign key constraint `REFERENCES public.invoices(id) ON DELETE CASCADE`.  

The current code inserts `admission.id` as `invoice_id`. This is a **foreign key violation** and therefore invalid at the database level.

This placeholder pattern must be removed completely.

### Final Correct Fix Strategy

Billing links must only be created when a **real invoice row** already exists.

The correct workflow is:

1. **Admission creation**

   - Create the admission

   - Create and link movement correctly

   - **Do not create any billing link yet**

   - Reason: there is no real invoice yet

2. **During the billing workflow**

   - When staff creates a real invoice related to the stay, create a billing link using:

     - `source_type = 'boarding'`

     - `source_id = admission.id`

     - `invoice_id = real invoice id`

     - `link_kind = 'deposit' | 'final' | other valid kind`

   - This must happen only after the invoice exists

3. **Checkout financial review**

   - Query real billing links for the admission

   - If no billing links exist yet, the admission-scoped values should correctly return zero

   - This is truthful and valid behavior

4. **Deposit handling**

   - Deposit must be represented only when a real deposit invoice exists

   - Then create a real billing link with:

     - `link_kind = 'deposit'`

     - `invoice_id = actual deposit invoice id`

### Required Code Changes

In `src/hooks/housing/useBoardingAdmissions.ts`:

- Remove the fake billing link insert block from `createAdmission`

- Remove the fake billing link insert block from `confirmCheckout`

Do **not** insert any `billing_links` row using `admission.id` as `invoice_id`.

Keep the existing `createBillingLink()` mutation as the correct mechanism for linking real invoices later.

### Expected Result

- No FK violations

- Billing links only reference real invoices

- Financial review remains correct

- Zero linked invoices = zero billed/paid/balance in the admission-scoped section

---

## B. Phase 7 — Horse-Scoped Sharing Proof (Accepted as Satisfied)

**Finding**: Phase 7 is satisfied by the existing `HorseSharesPanel` integration in Horse Profile.

### Concrete Proof

1. **Location in Horse Profile**

   - `HorseProfile.tsx` includes:

     - `<HorseSharesPanel horseId={horse.id} horseName={horse.name} />`

2. **User flow**

   - From Horse Profile, the user opens the Sharing area

   - The user can click **Create Share**

   - This opens `CreateHorseShareDialog`

   - The dialog supports horse-specific scope configuration such as:

     - packs / scope bundles

     - `includeVet`

     - `includeLab`

     - `includeFiles`

     - optional recipient email

     - date filtering

     - expiry

   - It creates a share through the existing RPC / token flow

   - It returns a horse-scoped share URL

3. **Infrastructure reused**

   - `horse_shares`

   - `horse_share_packs`

   - `create_horse_share` RPC

   - `get_horse_share_view`

   - `revoke_horse_share`

   - existing privacy / alias patterns

4. **Clarification: token sharing vs consent grants**

   - Token-based horse sharing is the correct implementation for the required Phase 7 scope:

     - horse-scoped share action from Horse Profile

   - Tenant-level `consent_grants` remain a separate pattern for broader ongoing cross-tenant relationships

   - No new sharing model is required for this phase

### Final Conclusion for Phase 7

Phase 7 is considered fulfilled by the Horse Profile integration of `HorseSharesPanel`, provided the flow is already working as described in the codebase.

No additional new sharing UI is required for this phase.

---

## C. Required Changes Summary

| File | Change |

|------|--------|

| `src/hooks/housing/useBoardingAdmissions.ts` | Remove fake billing link inserts from `createAdmission` and `confirmCheckout` |

| `src/hooks/housing/useAdmissionFinancials.ts` | Keep existing logic that reads only real billing links and returns zeros when none exist |

No other structural changes are required for this verification pass unless implementation reality contradicts the report.

---

## D. Final Verification Summary

| Item | Status |

|------|--------|

| Billing links use only real invoice IDs | Must be enforced now |

| Placeholder invoice_id pattern removed | Required now |

| FK integrity respected | Required now |

| Financial review works when zero links exist | Already valid and should remain |

| HorseSharesPanel on Horse Profile | Verified |

| Horse-scoped share action exists | Verified |

| Existing sharing infrastructure reused | Verified |

| Phase 7 satisfied by current HorseSharesPanel integration | Accepted |

---

## E. Execute Now

Apply the focused billing-links fix exactly as described above.

After applying it, return a concise final report with:

1. Exact code changes made

2. Confirmation that fake billing links were removed

3. Confirmation that FK integrity is now respected

4. Confirmation that financial review still works correctly when no linked invoices exist

5. Final verdict: whether the Stable horse ecosystem implementation is now complete for the agreed scope