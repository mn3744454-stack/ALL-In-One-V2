# File 19 — Payment Account Backfill IDs (Turn 3B)

Captured: 2026-07-25 UTC · Project ref: vhxglsvxwwpmoqjabfmj
Migration: `supabase/migrations/20260725071233_4dd54c91-4aa5-4b5a-aab0-e5f487a36c49.sql`

Exactly nine `owner_type='tenant'` routing rows were inserted by the backfill in
Turn 3B (one per pre-existing tenant). Rollback per-row deletion (see File 16) must
target these UUIDs and only these UUIDs.

| Tenant UUID | Payment Account UUID |
|---|---|
| 348ce41c-1102-4295-bf6a-2ea0203c1036 | 43f80a7d-f1ec-4471-aa13-d10a2f27e49f |
| 1298be8b-14bb-4b35-ae2d-1fa735a69a3c | b5df0e43-0bb7-4d97-9087-24231b9bb961 |
| f5967dff-c1e0-43dc-b6f5-e28e5a8b005a | ed1f00a1-52a1-40a8-b0db-51a0f1bede35 |
| 3c21fc2c-a884-4b79-a1c5-c435e8518dff | 75d51cfc-e61c-40e7-82ad-33c943993a06 |
| 5e4763c8-f8c1-464c-b996-7f22231231ca | bab58e2f-d9ac-4b0d-bb34-0fa7db55e6c0 |
| ba2e37f9-184b-4bf6-8a8d-f2b26a010b3f | cb8ea9c6-9d0f-48c7-94f9-e7f620181854 |
| 8951ac1a-2940-4e93-9a62-95e47f110cba | 27260034-9f4b-443e-9814-aba326b85117 |
| bfaf5aca-f0f8-47b7-96b9-7bc77b05bafb | 377224a4-b789-4520-afa7-9b83e6c371f6 |
| 145f2128-83ca-4ba8-85b5-8ade245c5530 | dd4af866-bd56-4c6d-8c9e-a05dc4a7a7cf |

Rollback preconditions (per row):
- `payment_intents.payee_account_id` reference count = 0
- `payment_splits.receiver_account_id` reference count = 0

At capture time the entire `payment_accounts` referrer set is empty
(no `payment_intents`, no `payment_splits` rows point at any backfilled ID).
Rollback of Turn 3B is therefore mechanically safe until the first payment session
consumes one of these routing rows.
