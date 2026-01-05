# Laboratory MVP Documentation

## Overview

The Laboratory module provides a complete workflow for managing lab samples, results, and sharing capabilities for equine health testing.

## What's Included in MVP

### 1. Samples Lifecycle
- **Create sample**: Register new lab samples with horse, collection date, and physical sample ID
- **Multi-select templates**: Choose multiple result templates (e.g., CBC, Hormonal Panel) for a single sample
- **Template ordering**: Templates are stored in selection order (sort_order) for consistent workflow
- **Mark Received/Unreceived**: Track when samples arrive at the lab (trigger auto-fills `received_at`)
- **Status transitions**: `draft` → `accessioned` → `processing` → `completed`
- **Retest creation**: Create retests from completed samples (max 3 retests per sample)
- **Templates carry forward**: Retests inherit templates from original sample

### 2. Results Workflow
- **Multi-template results**: Enter results for each template assigned to a sample
- **Sequential entry**: After saving one template's results, wizard prompts to continue with next template
- **Partial results**: Can save results for some templates and return later for remaining ones
- **Edit existing**: Draft and reviewed results can be edited by authorized users
- **Status flow**: `draft` → `reviewed` → `final` (terminal state)
- **Flags**: Mark results as `normal`, `abnormal`, or `critical`
- **Progress tracking**: SampleCard shows completion progress (e.g., 2/3 templates)
- **DB protection**: Trigger blocks invalid status transitions

### 3. Edit Permissions
- **Owner & Manager**: Can edit any result (draft, reviewed)
- **Reviewer**: Can edit results they reviewed
- **Creator**: Can edit their own draft results
- **Final results**: Cannot be edited by anyone

### 4. Sharing & Public Page
- **Create share links**: Generate public URLs for finalized results only
- **Alias support**: Hide real horse name using tenant-defined aliases
- **Expiry dates**: Optional expiration for share links
- **Revocation**: Revoke active share links at any time
- **Public page**: Unauthenticated access to shared results at `/shared/lab-result/:token`

### 5. Horse Aliases
- **Create aliases**: Define alternative names for horses per tenant
- **Use in shares**: Share results with alias instead of real horse name
- **Unique per tenant**: One active alias per horse per organization

## Key Constraints

| Constraint | Details |
|------------|---------|
| Retest eligibility | Only `completed` samples can be retested |
| Max retests | 3 retests per original sample |
| Sharing eligibility | Only `final` results can be shared |
| Status finality | `final` is terminal - cannot transition away |
| Timezone | "Today" filter uses Asia/Riyadh timezone |
| Alias uniqueness | One active alias per horse per tenant |

## Manual QA Checklist

### Samples Lifecycle (Mobile-first)
1. [ ] Create new sample - verify all fields save
2. [ ] Select multiple templates during sample creation
3. [ ] Verify template badges appear on SampleCard
4. [ ] Mark sample as Received - verify `received_at` auto-populates
5. [ ] Mark sample as Unreceived - verify fields clear
6. [ ] Transition: draft → accessioned → processing → completed
7. [ ] Verify "Create Retest" button appears only for completed samples

### Retest Flow
1. [ ] Click "Create Retest" on completed sample
2. [ ] Verify new sample created with `retest_of_sample_id` set
3. [ ] Verify templates are copied from original sample
4. [ ] Verify "Retest" badge appears on new sample
5. [ ] Verify retest count increments on original
6. [ ] Verify retest blocked after 3 retests

### Multi-Template Results Workflow
1. [ ] Open result entry for sample with 3 templates
2. [ ] Select first template (e.g., CBC) and enter results
3. [ ] After saving, verify "Continue to next template" prompt appears
4. [ ] Continue to second template, enter results
5. [ ] Verify progress shows 2/3 on SampleCard
6. [ ] Close dialog, reopen - verify can continue with remaining template
7. [ ] Verify draft results can be edited
8. [ ] Complete all templates - verify "All complete" message

### Edit Permissions
1. [ ] As owner - verify can edit draft and reviewed results
2. [ ] As manager - verify can edit draft and reviewed results
3. [ ] As reviewer - verify can edit results you reviewed
4. [ ] As creator - verify can edit own draft results
5. [ ] Verify final results show as non-editable

### Sharing Flow
1. [ ] Attempt share on non-final result - expect error
2. [ ] Share finalized result - expect success + URL copied
3. [ ] Open shared URL in incognito - verify renders
4. [ ] Test Print and PDF buttons
5. [ ] Revoke share link - verify link no longer works

### Alias Flow
1. [ ] Create alias for horse
2. [ ] Create share with "Use Alias" enabled
3. [ ] Verify public page shows alias, not real name

### Filters
1. [ ] All tab - shows all samples
2. [ ] Today tab - shows only samples from current Riyadh day
3. [ ] Received/Unreceived tabs filter correctly
4. [ ] Retest tab shows only retests

## Known Limitations

1. **Public page result_data rendering**: Displays raw keys from `result_data` JSON; does not resolve template field labels
2. **Alias scope**: Aliases are tenant-specific; same horse can have different aliases in different organizations
3. **No bulk operations**: Samples/results must be processed individually
4. **No result templates editor**: Templates must be configured via database

## Technical Notes

### Timezone Handling
The `get_riyadh_day_bounds()` function returns UTC timestamps for the start and end of the current day in Asia/Riyadh timezone. This ensures consistent filtering regardless of user's local timezone.

```sql
-- Returns half-open interval [start, end) in UTC
SELECT * FROM get_riyadh_day_bounds();
-- day_start: 2025-01-04 21:00:00+00 (midnight Riyadh = 21:00 UTC previous day)
-- day_end:   2025-01-05 21:00:00+00 (midnight next day Riyadh)
```

### Multi-Tenant Security
All mutations are tenant-scoped:
- Samples: create/update/delete/markReceived/markUnreceived/createRetest
- Results: create/update/review/finalize/delete
- Shares: create/revoke
- Aliases: set/deactivate

### Database Triggers
- `validate_lab_result_share_creation`: Blocks shares for non-final results
- `validate_lab_result_status_transition`: Enforces status flow rules
- `set_received_at_trigger`: Auto-fills `received_at` when `received_by` is set
