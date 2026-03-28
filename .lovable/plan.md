

# Plan: My Profile — Back Button, Mode Guard, and Bilingual Name Fields

## Issues Identified

1. **No back button on desktop** — `MobilePageHeader` is `lg:hidden`, so on desktop there's no way to navigate back from My Profile.
2. **My Profile accessible in organization mode** — The route `/dashboard/my-profile` has no `WorkspaceRouteGuard`, so switching to "منشأة" mode still shows the personal profile page (screenshot 31).
3. **Full name is a single field** — The user wants two fields: name in Arabic + name in English, on the My Profile page (not at signup, only in the profile editor).

## Changes

### A. Add Desktop Back Button to DashboardMyProfile
- Add a visible back link/button in the desktop header area (the `div.mb-6` section) that navigates to `/dashboard`.
- Use the same chevron + "رجوع" / "Back" pattern, visible on `lg:` screens (the `MobilePageHeader` already handles mobile).

### B. Guard My Profile Route to Personal Mode Only
- In `App.tsx`, wrap `DashboardMyProfile` with `<WorkspaceRouteGuard requiredMode="personal">` so it redirects to `/dashboard` if the user is in organization mode.

### C. Bilingual Name Fields on My Profile
- **DB Migration**: Add `full_name_ar` column to the `profiles` table (nullable text, default null). The existing `full_name` becomes the English name field.
- **Update `DashboardMyProfile.tsx`**: Replace the single "Full Name" input with two fields:
  - "الاسم بالعربي" (Arabic name) — maps to `full_name_ar`
  - "الاسم بالإنجليزية" (English name) — maps to `full_name`
- **Update `useUpdateProfile` hook**: Include `full_name_ar` in the mutation payload.
- **Update i18n**: Add keys `myProfile.fullNameAr`, `myProfile.fullNameEn`, `myProfile.fullNameArPlaceholder`, `myProfile.fullNameEnPlaceholder` in both `en.ts` and `ar.ts`.
- **Avatar header display**: Show the bilingual name using the `BilingualName` component in the profile card header.
- **Signup remains single-field** — no change to signup form per the user's explicit instruction.

### D. Update handle_new_user Trigger (if needed)
- The new `full_name_ar` column is nullable with no default required from the trigger — no trigger update needed. Users fill it in later via My Profile.

### Files Touched
- `supabase/migrations/` — new migration for `full_name_ar` on `profiles`
- `src/pages/DashboardMyProfile.tsx` — back button, bilingual name fields, route guard awareness
- `src/App.tsx` — wrap route with `WorkspaceRouteGuard`
- `src/hooks/usePublicProfile.ts` — add `full_name_ar` to mutation
- `src/i18n/locales/en.ts` — new keys
- `src/i18n/locales/ar.ts` — new keys

