# Stage A Economic Date Backfill — Read-Only Preview

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-BACKFILL-PREVIEW-06

## A. Executive Verdict

`STAGE A BLOCKED BY SPECIFIC PREVIEW DEFECTS`

One blocker only: **BLK-A-01 — `balance_after` authority and recalculation scope is not covered by any approved Owner decision.** The 28-row date mapping itself is fully verified and execution-ready. Detail in Sections G and O.

## B. Owner Decisions Applied

- **D-1 — APPROVED and applied.** Cancellation/void economic date = action date. Verified independently: `b2dabb21…` action 2026-03-28, `b3e6f31e…` and `92c69b2c…` action 2026-04-03 (UTC and Asia/Riyadh calendar dates agree for all three; no `cancelled_at` column exists, `metadata` is `{}`, so the posting instant is the only action evidence).
- **D-2 — APPROVED and applied.** `b3e6f31e…` and `92c69b2c…` treated as ordinary voids for date purposes; no invoice repair, merge, delete or re-cancel is in the proposed scope.
- **D-3 — APPROVED and applied.** No row is classified as a Historical Correction; no generic backdating rule is proposed.
- **D-4 — APPROVED and applied.** `774175c3…` and `72913983…` take 2026-05-09 (session date) against invoice `issue_date` 2026-05-10, flagged `LEGACY_PRE_ISSUE_PAYMENT_EXCEPTION`. No change to the `post_payment` guard is proposed.

## C. Evidence Boundary

Directly verified — live database:
- `ledger_entries`: 88 rows; 28 with `effective_date IS NULL`.
- All 28 prefixes resolve to exactly one full UUID each (28 distinct rows returned; no prefix collision).
- Every payment target carries a non-null `payment_session_id` with a non-null `payment_sessions.payment_date`.
- The 3 adjustment targets carry no `payment_session_id` and no session date.
- `balance_after`: `numeric NOT NULL`, 0 NULLs across 88 rows.
- Under the canonical order `effective_date, created_at, id` (NULLs first), stored `balance_after` already disagrees with the recomputed running sum on **78 of 88 rows**; under a pure `created_at` order it disagrees on **61 of 88**. This staleness predates and is independent of the proposed backfill.
- Per-client `SUM(amount)` equals stored `customer_balances.balance` exactly for all 7 affected clients.

Directly verified — repository:
- `_finance_ledger_insert` is the only writer that recomputes `balance_after`, and it rewrites the **entire** client chain in `ORDER BY effective_date, created_at, id`; `p_effective_date` is mandatory.
- No trigger on `ledger_entries` maintains `balance_after`.
- Readers of `balance_after`: none in the financial read paths inspected — `useClientStatement.ts` recomputes a running balance in the client, `useLedgerBalance.ts` reads `v_customer_ledger_balances` (amount-based), `useCustomerBalance.ts` reads `customer_balances`. `balance_after` is stored but effectively **derived and unread**.

Mini Audit facts reconfirmed: 88 total, 28 NULL, 23 direct session resolutions, 3 void resolutions, 2 legacy exceptions.

Data drift: none.

Inferences (labelled): the void action date is inferred from `created_at` because no dedicated cancellation timestamp exists; the owner approved exactly these dates in D-1.

Inaccessible evidence: original actor/session for the 3 voids; any provenance of "Demo" status.

Unresolved gaps: the authority status of `balance_after` (BLK-A-01).

## D. Baseline and Drift Result

`NO MATERIAL DATA DRIFT`

| Measure | Mini Audit | Now |
|---|---:|---:|
| Ledger rows | 88 | 88 |
| NULL `effective_date` | 28 | 28 |
| Target prefixes resolving uniquely | 28 | 28 |
| Rows added since | — | 0 |
| Rows removed since | — | 0 |
| Targets already dated | — | 0 |
| Amount / client / tenant / source changes | — | 0 |
| New NULL rows outside the 28 | — | 0 |

## E. Complete Full-UUID Target Matrix

Tenant T1 = `348ce41c-1102-4295-bf6a-2ea0203c1036`, T2 = `145f2128-83ca-4ba8-85b5-8ade245c5530`, T3 = `8951ac1a-2940-4e93-9a62-95e47f110cba`. Current `effective_date` is NULL for all 28. Drift result is `UNCHANGED` for all 28.

| # | Full Ledger UUID | Tenant | Client ID | Type | Source | Full source UUID | Invoice ID | Invoice # | Amount | created_at (UTC) | Source economic date | Proposed effective_date | Basis | Owner decision | Legacy exception |
|---:|---|---|---|---|---|---|---|---|---:|---|---|---|---|---|---|
| 1 | aac917e5-731a-4300-8b51-e8681f5f3db3 | T1 | 4461804b-d110-4e18-a5a3-bbc039f5b9f9 | payment | payment_session | a7d75d9f-0de7-4505-8095-8e304bdb92d9 | dbbdc7c5-6cc1-45b3-8cdb-aa71722e1112 | INV-LAB-ML3A65ZF-RMC7 | −150.00 | 2026-02-05 20:41:59 | 2026-02-05 | 2026-02-05 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 2 | 432b5a3f-aa95-4013-954f-226a2cbceaf4 | T1 | 4461804b-…b9f9 | payment | payment_session | a7d75d9f-0de7-4505-8095-8e304bdb92d9 | dbbdc7c5-…1112 | INV-LAB-ML3A65ZF-RMC7 | −10.00 | 2026-02-05 20:41:59 | 2026-02-05 | 2026-02-05 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 3 | 938b39ea-8340-4734-b176-47c2b956ffdf | T1 | 3e1f790b-ea8d-47dd-ac30-0f80b6415786 | payment | payment_session | 1de6e7fc-b281-4c25-8ed2-e083f54a5443 | 4d8e334d-5086-41d3-9023-8da6d15ec22b | INV-LAB-ML9XS8HS-ALTN | −120.00 | 2026-02-05 21:25:42 | 2026-02-05 | 2026-02-05 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 4 | 1c7eb5d2-2e86-4460-9c60-d30688464bdd | T1 | 4461804b-…b9f9 | payment | payment_session | 84062999-7f93-4f3d-8c4c-f9577e9e0017 | 78150da7-6605-4cda-8072-9ce876a12d31 | INV-LAB-MLAEBDG6-J5UN | −230.00 | 2026-02-06 04:40:16 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 5 | 650edda7-d099-4f79-b144-cbbecc99a747 | T1 | 4461804b-…b9f9 | payment | payment_session | 15006e19-f81c-449d-a883-ba786e859326 | 728348c9-0fb7-4b65-8006-cd79c68030ef | INV-LAB-MLADGLZY-ZAVV | −150.00 | 2026-02-06 04:40:57 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 6 | 17e217fa-7970-4447-bdf2-ad19642f5605 | T1 | 4461804b-…b9f9 | payment | payment_session | dab67e08-e4d1-4482-9453-1001ed84d83e | 66b918e9-5b51-4971-9eb2-411e1ded3f69 | INV-LAB-ML9XV91Q-4WPQ | −150.00 | 2026-02-06 04:42:14 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 7 | 449d1078-3ad2-4182-ab22-5531046772d9 | T1 | a3165b28-7b3e-414d-adae-944673e482a7 | payment | payment_session | 7b52e3a8-02cd-4f2e-840d-3362c98abf74 | c6e01c63-5256-49c5-bfae-ab6b087d7662 | INV-LAB-ML2IGWCM-MANH | −120.00 | 2026-02-06 04:43:30 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 8 | 2663b1d6-e39e-4f29-85ef-7e07972d40e6 | T1 | a3165b28-…82a7 | payment | payment_session | 7b52e3a8-02cd-4f2e-840d-3362c98abf74 | c6e01c63-…7662 | INV-LAB-ML2IGWCM-MANH | −30.00 | 2026-02-06 04:43:30 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 9 | d99c7b9a-9999-4ceb-9d2c-71a5468495e7 | T1 | 3e1f790b-…5786 | payment | payment_session | 76c5639b-1a85-4afa-b4e1-d5745450ce42 | 4d8e334d-…c22b | INV-LAB-ML9XS8HS-ALTN | −30.00 | 2026-02-06 04:44:37 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 10 | 66e71c13-698e-4285-a031-4e414dcf8c21 | T1 | a3165b28-…82a7 | payment | payment_session | 9aaa55b6-3fda-4a83-87f5-ead7b935a531 | 556bbe46-f4e3-46b4-b387-9f9cd1523f78 | INV-LAB-ML1MMMNN-RCL0 | −110.00 | 2026-02-06 04:45:10 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 11 | c58040a8-8cbd-4761-8a46-0fb0bef7bd88 | T1 | a3165b28-…82a7 | payment | payment_session | ff27e5d7-3dff-4a8d-933d-05b1251a2157 | 556bbe46-…3f78 | INV-LAB-ML1MMMNN-RCL0 | −40.00 | 2026-02-06 04:45:29 | 2026-02-06 | 2026-02-06 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 12 | 3cd0f5ab-a45a-4393-9b11-811768a29cf1 | T1 | a0705f81-ec7c-4ccd-881b-42395cd4bf1d | payment | payment_session | 679969ab-de1c-44a2-8e52-1469f780b46b | f7947580-841c-4f68-a290-f057be84dcb1 | INV-LAB-MLE6FAHB-9URC | −10.00 | 2026-02-08 20:13:05 | 2026-02-08 | 2026-02-08 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 13 | 4f445239-9ce6-4b7a-b7c0-681347f94dfe | T1 | a0705f81-…bf1d | payment | payment_session | 679969ab-de1c-44a2-8e52-1469f780b46b | f7947580-…dcb1 | INV-LAB-MLE6FAHB-9URC | −20.00 | 2026-02-08 20:13:05 | 2026-02-08 | 2026-02-08 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 14 | 61cfe843-7dab-4dde-a65c-3863abe1afae | T1 | a0705f81-…bf1d | payment | payment_session | b5f87a58-f33e-482e-a407-bdc55614e0dc | f7947580-…dcb1 | INV-LAB-MLE6FAHB-9URC | −45.00 | 2026-02-08 20:20:19 | 2026-02-08 | 2026-02-08 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 15 | 9cca7047-7d62-49bb-b83c-46f22a3b243f | T1 | 364165f0-58ec-464c-bdc0-86f3e7a0c79b | payment | payment_session | f74b07c9-a995-45dc-ad9a-7ae9d24fae25 | e78e54b0-7d4c-4c74-b706-bfa8ad5cb523 | INV-LAB-MMA1TFSU-JF7R | −45.00 | 2026-03-03 03:33:36 | 2026-03-03 | 2026-03-03 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 16 | 59b9a721-d41f-48db-b1ff-40ec741e8ab4 | T1 | 364165f0-…c79b | payment | payment_session | b635cf70-a36e-4459-8fd4-38c715411198 | e78e54b0-…b523 | INV-LAB-MMA1TFSU-JF7R | −70.00 | 2026-03-03 05:20:57 | 2026-03-03 | 2026-03-03 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 17 | 8817234c-610f-4f4b-a3ce-8b6f99c725dd | T1 | 364165f0-…c79b | payment | payment_session | a8bf3ffa-8daa-4b94-8c39-01d7343dea63 | e78e54b0-…b523 | INV-LAB-MMA1TFSU-JF7R | −12.00 | 2026-03-03 07:15:01 | 2026-03-03 | 2026-03-03 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 18 | 065c7158-e66e-4eeb-b326-580ff9086f18 | T1 | 364165f0-…c79b | payment | payment_session | c509fd88-b89e-4cf1-9a5e-fea9da6f680f | 5b02f7b0-946a-46eb-9c74-f69615a35c68 | INV-LAB-MLWQMSK5-MY4D | −85.00 | 2026-03-03 07:28:39 | 2026-03-03 | 2026-03-03 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 19 | 03e3eee7-d277-4d60-9550-518436f78ffe | T2 | f225ffb7-2eb1-4346-a949-882992d6f630 | payment | payment_session | c9293f1d-b2e3-44ea-b4cd-6c940c7137cf | 36d817c5-adce-4d4c-8efc-572f221cde08 | INV-MN9GDJVA | −95.00 | 2026-03-28 02:25:43 | 2026-03-28 | 2026-03-28 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 20 | b2dabb21-fa75-4192-8eae-f3363c90128f | T2 | f225ffb7-…f630 | adjustment (invoice_cancellation) | void action | n/a | 8c76a483-1719-4609-97cc-d9e8d6bc82d5 | اسط-202603-108 | −1,725.00 | 2026-03-28 16:54:10 | 2026-03-28 (action) | 2026-03-28 | OWNER_APPROVED_CANCELLATION_ACTION_DATE | D-1 | No |
| 21 | b3e6f31e-bed9-4139-af0b-74b0e11f2206 | T2 | f225ffb7-…f630 | adjustment (invoice) | void action | n/a | ad621674-308c-42dc-afbb-55e56f9c0d49 | INV-MMQ5FJ3G | −10,000.00 | 2026-04-03 00:31:46 | 2026-04-03 (action) | 2026-04-03 | OWNER_APPROVED_DUPLICATE_VOID_ACTION_DATE | D-1/D-2 | No |
| 22 | 92c69b2c-5733-41ce-9221-b100316bca5c | T2 | f225ffb7-…f630 | adjustment (invoice) | void action | n/a | 0576b93b-2d44-445a-9a77-d3e914f46a12 | INV-MNAVS3UJ | −5,750.00 | 2026-04-03 00:31:48 | 2026-04-03 (action) | 2026-04-03 | OWNER_APPROVED_DUPLICATE_VOID_ACTION_DATE | D-1/D-2 | No |
| 23 | 774175c3-7d7f-46f4-91d7-3044247e9921 | T3 | a279407b-55ec-478b-b8ba-de4459df986f | payment | payment_session | 857ed192-e414-43ce-817c-9c98ffca46ee | 281178fb-7e3f-45b6-b956-ba1b325f4cb8 | SUL-202605-199 (issue 2026-05-10) | −700.00 | 2026-05-09 21:32:06 | 2026-05-09 | 2026-05-09 | OWNER_APPROVED_LEGACY_PRE_ISSUE_PAYMENT_DATE | D-4 | **Yes** |
| 24 | 72913983-51b6-435c-a50d-c58d3b8984fc | T3 | a279407b-…986f | payment | payment_session | 491732ff-7439-4b0f-8ffd-7fb581af06f4 | 281178fb-…5bc8 | SUL-202605-199 (issue 2026-05-10) | −250.00 | 2026-05-09 21:34:43 | 2026-05-09 | 2026-05-09 | OWNER_APPROVED_LEGACY_PRE_ISSUE_PAYMENT_DATE | D-4 | **Yes** |
| 25 | df4629d5-0da2-43f7-a846-4378fc227ecc | T2 | f225ffb7-…f630 | payment | payment_session | f3f16237-5b5a-4221-97b0-a19483059468 | e6267adb-6470-4f89-88d8-1f7036054839 | INV-MQ1HZ1SN | −15,322.58 | 2026-06-05 22:31:35 | 2026-06-05 | 2026-06-05 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 26 | 46104539-677b-4c6b-b391-8d7c8530581f | T1 | 364165f0-…c79b | payment | payment_session | 6f0c28a7-e9cb-44dd-a671-e990c6a266e0 | e78e54b0-…b523 | INV-LAB-MMA1TFSU-JF7R | −80.00 | 2026-07-18 11:11:04 | 2026-07-18 | 2026-07-18 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 27 | 5b301cd7-3353-4277-9c5f-2fb566cf8e34 | T1 | 364165f0-…c79b | payment | payment_session | 6f0c28a7-e9cb-44dd-a671-e990c6a266e0 | e78e54b0-…b523 | INV-LAB-MMA1TFSU-JF7R | −23.00 | 2026-07-18 11:11:04 | 2026-07-18 | 2026-07-18 | DIRECT_PAYMENT_SESSION_DATE | — | No |
| 28 | 9b8b1da0-00eb-47d8-aa82-f6036a4058e1 | T1 | 364165f0-…c79b | payment | payment_session | 7ffcb9a4-1aaf-41c9-90f4-16c74f78914a | af663402-5dd3-492d-8c8f-d39ef08478a5 | الم-202607-951 | −15.00 | 2026-07-18 11:49:26 | 2026-07-18 | 2026-07-18 | DIRECT_PAYMENT_SESSION_DATE | — | No |

Every proposed date equals the verified source date. No deviation from the owner-approved table in Section 6 of the prompt.

## F. Resolution-Basis Summary

| Basis | Expected | Observed |
|---|---:|---:|
| DIRECT_PAYMENT_SESSION_DATE | 23 | 23 |
| OWNER_APPROVED_CANCELLATION_ACTION_DATE | 1 | 1 |
| OWNER_APPROVED_DUPLICATE_VOID_ACTION_DATE | 2 | 2 |
| OWNER_APPROVED_LEGACY_PRE_ISSUE_PAYMENT_DATE | 2 | 2 |
| **Total** | **28** | **28** |

No deviation.

## G. Balance-After Authority Verdict

`EFFECTIVE_DATE_AND_BALANCE_AFTER_MUST_BE_UPDATED_ATOMICALLY`

Evidence:
1. `numeric`, `NOT NULL`; 2. all 88 rows populated; 3. sole writer is `_finance_ledger_insert`, which rewrites the whole client chain on every insert; no trigger maintains it; 4. no financial read path reads it — statements recompute in the browser, balances come from `customer_balances` / `v_customer_ledger_balances`; 5. it is therefore **derived, persisted and currently unread**; 6. a date-only `UPDATE` performs **no** recalculation; 7. no trigger cascades to later rows; 8. a date-only update leaves stale running balances — 69 of 88 rows would disagree with the canonical sequence (25 targets, 44 non-targets, across 7 clients); 9. so the Stage A transaction must recompute in the same transaction if the column is to remain meaningful; 10. `customer_balances.balance` is order-independent — it equals `SUM(amount)` per client and matches exactly for all 7 affected clients today.

Material qualification feeding BLK-A-01: the stored chain is **already** wrong before any backfill — 78 of 88 rows disagree with the canonical order today, and 61 of 88 disagree even under a pure `created_at` order. The backfill does not create this defect; it makes an existing latent defect deterministic. Recomputing the 7 affected clients would incidentally repair 87 of the 88 rows, which is a scope expansion beyond a date-only correction and is not covered by D-1…D-4.

## H. Complete Re-Sequencing Simulation

Simulation only, in a read-only CTE, ordering by `effective_date, created_at, id` with the approved dates substituted. Rows listed are every row of the 7 affected clients whose `balance_after` differs from the canonical running sum, plus every target row. 69 rows require an update; the full 87-row client scope is available from the same query. `T` = target row.

Client `364165f0` (15 rows, net 2,770.00):

| Row | T | Amount | Cur pos | New pos | Cur balance_after | Expected | Diff |
|---|---|---:|---:|---:|---:|---:|---:|
| 9cca7047 | T | −45.00 | 1 | 4 | 3,055.00 | 340.00 | −2,715.00 |
| 59b9a721 | T | −70.00 | 2 | 5 | 2,985.00 | 270.00 | −2,715.00 |
| 8817234c | T | −12.00 | 3 | 6 | 2,973.00 | 258.00 | −2,715.00 |
| 065c7158 | T | −85.00 | 4 | 7 | 2,888.00 | 173.00 | −2,715.00 |
| 46104539 | T | −80.00 | 5 | 8 | 2,808.00 | 93.00 | −2,715.00 |
| 5b301cd7 | T | −23.00 | 6 | 9 | 2,785.00 | 70.00 | −2,715.00 |
| 61bb4abc | | 15.00 | 11 | 10 | 400.00 | 85.00 | −315.00 |
| 9b8b1da0 | T | −15.00 | 7 | 11 | 2,770.00 | 70.00 | −2,700.00 |
| e7343642 | | 230.00 | 12 | 12 | 630.00 | 300.00 | −330.00 |
| 9cbbe45c | | −20.00 | 13 | 13 | 610.00 | 280.00 | −330.00 |
| a0011739 | | −210.00 | 14 | 14 | 400.00 | 70.00 | −330.00 |
| 04d874a8 | | 2,700.00 | 15 | 15 | 3,100.00 | 2,770.00 | −330.00 |

Client `3e1f790b` (5 rows, net 372.00): `938b39ea` T −120.00 (1→2, 402.00 → 30.00), `d99c7b9a` T −30.00 (2→3, 372.00 → 0.00), `52c41287` 350.00 (4→4, 500.00 → 350.00), `1147284a` 22.00 (5→5, 522.00 → 372.00).

Client `4461804b` (14 rows, net 905.00): `8fd6b44d` 580.00 (6→1, 1,485.00 → 580.00), `8577a63e` 230.00 (7→2, 905.00 → 810.00), `aac917e5` T −150.00 (1→3, −150.00 → 660.00), `432b5a3f` T −10.00 (2→4, −160.00 → 650.00), `fba177ba` 150.00 (8→5, −10.00 → 800.00), `4f52c3ac` 150.00 (9→6, 140.00 → 950.00), `57896343` 230.00 (10→7, 370.00 → 1,180.00), `1c7eb5d2` T −230.00 (3→8, 140.00 → 950.00), `650edda7` T −150.00 (4→9, −10.00 → 800.00), `17e217fa` T −150.00 (5→10, −160.00 → 650.00), `33b26a88` 150.00 (11→11, −10.00 → 800.00), `bcc77591` 580.00 (12→12, 570.00 → 1,380.00), `b8527f7d` 105.00 (13→13, 1,835.00 → 1,485.00).

Client `a0705f81` (6 rows, net 0.00): `3cd0f5ab` T −10.00 (1→2, 65.00 → 65.00, no change), `4f445239` T −20.00 (2→3, 45.00 → 45.00, no change), `61cfe843` T −45.00 (3→4, 0.00 → 0.00, no change), `82dd5e6f` 150.00 (5→5, 225.00 → 150.00), `1bd6a1cd` −150.00 (6→6, 75.00 → 0.00).

Client `a279407b` (4 rows, net 1,669.35): `a71e7f99` 1,669.35 (3→1, 2,619.35 → 1,669.35), `774175c3` T −700.00 (1→2, 1,919.35 → 969.35), `72913983` T −250.00 (2→3, 1,669.35 → 719.35), `971c54d7` 950.00 (4→4, 950.00 → 1,669.35).

Client `a3165b28` (6 rows, net 0.00): `902835c0` 150.00 (5→1, −150.00 → 150.00), `521febce` 150.00 (6→2, 0.00 → 300.00), `449d1078` T −120.00 (1→3, −120.00 → 180.00), `2663b1d6` T −30.00 (2→4, −150.00 → 150.00), `66e71c13` T −110.00 (3→5, −260.00 → 40.00), `c58040a8` T −40.00 (4→6, −300.00 → 0.00).

Client `f225ffb7` (37 rows, net 131,985.00): 21 rows differ. Targets: `03e3eee7` −95.00 (1→10, 164,782.58 → 21,685.00), `b2dabb21` −1,725.00 (2→13, 163,057.58 → 21,857.50), `b3e6f31e` −10,000.00 (3→18, 153,057.58 → 135,482.50), `92c69b2c` −5,750.00 (4→19, 147,307.58 → 129,732.50), `df4629d5` −15,322.58 (5→21, 131,985.00 → 129,732.50). Non-targets: `15e30041` (→21,857.50), `7a5c8710` (→23,582.50), `28b12072` (→27,607.50), `8cdab6b5` (→33,357.50), `ad96b9b5` (→39,107.50), `acf33513` (→145,482.50), `b15c46a4` (→145,055.08), `891ba41b` (→129,752.50), `f360c741` (→130,402.50), `1f4e281b` (→130,747.50), `0e8a2a9c` (→131,047.50), `b20609a3` (→132,542.50), `0aa4521c` (→132,397.50), `50d40024` (→132,197.50), `29f54e9f` (→131,947.50), `becd1ed1` (→131,647.50), `3c2686a5` (→131,547.50), `70f287a2` (→131,892.50), `0cfafc32` (→131,782.50), `48932727` (→131,552.50), `bb3726b4` (→132,645.00), `60786fa9` (→132,485.00), `a204aef6` (→131,985.00, final).

Totals: 69 rows need a `balance_after` update — 25 target rows and 44 non-target rows — across 7 clients. Three target rows (`3cd0f5ab`, `4f445239`, `61cfe843`) need no balance change.

## I. Per-Client Monetary Reconciliation

Row counts, debits, credits and nets are identical before and after by construction — the simulation changes only ordering, never an amount, and no row is added or removed.

| Tenant | Client | Ledger rows (before = after) | Debit before = after | Credit before = after | Net before = after | Stored customer balance | Proposed final balance | Difference | Targets | balance_after rows changing |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| T1 | 364165f0 | 15 | 3,330.00 | −560.00 | 2,770.00 | 2,770.00 | 2,770.00 | 0.00 | 7 | 12 |
| T1 | 3e1f790b | 5 | 522.00 | −150.00 | 372.00 | 372.00 | 372.00 | 0.00 | 2 | 4 |
| T1 | 4461804b | 14 | 2,175.00 | −1,270.00 | 905.00 | 905.00 | 905.00 | 0.00 | 5 | 13 |
| T1 | a0705f81 | 6 | 225.00 | −225.00 | 0.00 | 0.00 | 0.00 | 0.00 | 3 | 2 |
| T3 | a279407b | 4 | 2,619.35 | −950.00 | 1,669.35 | 1,669.35 | 1,669.35 | 0.00 | 2 | 4 |
| T1 | a3165b28 | 6 | 300.00 | −300.00 | 0.00 | 0.00 | 0.00 | 0.00 | 4 | 6 |
| T2 | f225ffb7 | 37 | 166,872.58 | −34,887.58 | 131,985.00 | 131,985.00 | 131,985.00 | 0.00 | 5 | 28 |
| — | **Total** | **87** | **176,043.93** | **−38,342.58** | **137,701.35** | **137,701.35** | **137,701.35** | **0.00** | **28** | **69** |

Every client's calculated net equals its stored `customer_balances.balance` both before and after. No monetary difference. This criterion passes.

## J. Exact Future Database Write Scope

- Target `effective_date` rows: the 28 full UUIDs in Section E. Count 28.
- `balance_after` rows: 69 total — 25 target, 44 non-target — restricted to the 7 clients listed in Section I. Every one must be explicitly allowlisted by full UUID in the execution artifact.
- Affected clients: 7. Affected tenants: 3. Affected ledger rows in scope for recalculation-consideration: 87 of 88.
- Other tables: none. No invoice, payment session, allocation or `customer_balances` write is required — the stored balances already reconcile exactly.

## K. Proposed Execution SQL (not executed)

```sql
BEGIN;

-- 0. Serialize against concurrent ledger writers for the affected clients.
SELECT public._finance_advisory_lock_key(tenant_id, 'client_ledger', client_id)
  FROM (VALUES
    ('348ce41c-1102-4295-bf6a-2ea0203c1036'::uuid,'364165f0-58ec-464c-bdc0-86f3e7a0c79b'::uuid),
    ('348ce41c-1102-4295-bf6a-2ea0203c1036','3e1f790b-ea8d-47dd-ac30-0f80b6415786'),
    ('348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9'),
    ('348ce41c-1102-4295-bf6a-2ea0203c1036','a0705f81-ec7c-4ccd-881b-42395cd4bf1d'),
    ('348ce41c-1102-4295-bf6a-2ea0203c1036','a3165b28-7b3e-414d-adae-944673e482a7'),
    ('145f2128-83ca-4ba8-85b5-8ade245c5530','f225ffb7-2eb1-4346-a949-882992d6f630'),
    ('8951ac1a-2940-4e93-9a62-95e47f110cba','a279407b-55ec-478b-b8ba-de4459df986f')
  ) v(tenant_id, client_id);

-- 1. Frozen preview mapping (full UUID -> approved date), exactly 28 rows.
CREATE TEMP TABLE stage_a_map (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  client_id uuid NOT NULL,
  expected_amount numeric NOT NULL,
  expected_source uuid,           -- payment_session_id, NULL for the 3 voids
  new_effective_date date NOT NULL,
  basis text NOT NULL
) ON COMMIT DROP;
INSERT INTO stage_a_map VALUES
 ('aac917e5-731a-4300-8b51-e8681f5f3db3','348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9',-150.00,'a7d75d9f-0de7-4505-8095-8e304bdb92d9','2026-02-05','DIRECT_PAYMENT_SESSION_DATE')
 /* … the remaining 27 rows exactly as listed in Section E … */ ;

-- 2. Preconditions. Any failure aborts the transaction.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM stage_a_map;
  IF n <> 28 THEN RAISE EXCEPTION 'STAGE_A_MAP_COUNT % <> 28', n; END IF;

  SELECT count(*) INTO n FROM stage_a_map m
    JOIN public.ledger_entries l ON l.id = m.id
   WHERE l.effective_date IS NULL
     AND l.tenant_id = m.tenant_id AND l.client_id = m.client_id
     AND l.amount = m.expected_amount
     AND l.payment_session_id IS NOT DISTINCT FROM m.expected_source;
  IF n <> 28 THEN RAISE EXCEPTION 'STAGE_A_PRECONDITION_MISMATCH matched=%', n; END IF;

  -- Every payment target's approved date must still equal its session date.
  SELECT count(*) INTO n FROM stage_a_map m
    JOIN public.payment_sessions ps ON ps.id = m.expected_source
   WHERE m.expected_source IS NOT NULL AND ps.payment_date <> m.new_effective_date;
  IF n <> 0 THEN RAISE EXCEPTION 'STAGE_A_SOURCE_DATE_DRIFT rows=%', n; END IF;

  -- Report, but do not touch, any NULL row outside the frozen map.
  SELECT count(*) INTO n FROM public.ledger_entries l
   WHERE l.effective_date IS NULL AND l.id NOT IN (SELECT id FROM stage_a_map);
  RAISE NOTICE 'STAGE_A_OUT_OF_SCOPE_NULL_ROWS=%', n;
END $$;

-- 3. Capture the complete before image for the rollback artifact.
CREATE TEMP TABLE stage_a_before ON COMMIT DROP AS
  SELECT id, client_id, tenant_id, amount, effective_date, balance_after, created_at
    FROM public.ledger_entries
   WHERE client_id IN (SELECT client_id FROM stage_a_map);

-- 4. The date backfill: explicit UUID -> date mapping only.
UPDATE public.ledger_entries l
   SET effective_date = m.new_effective_date
  FROM stage_a_map m
 WHERE l.id = m.id AND l.effective_date IS NULL;

-- 5. Atomic running-balance recomputation, canonical order, affected clients only.
--    Included only if Owner Decision D-5 approves the balance_after scope.
WITH seq AS (
  SELECT id,
         sum(amount) OVER (PARTITION BY client_id
                           ORDER BY effective_date, created_at, id
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS bal
    FROM public.ledger_entries
   WHERE client_id IN (SELECT client_id FROM stage_a_map)
)
UPDATE public.ledger_entries l
   SET balance_after = seq.bal
  FROM seq
 WHERE l.id = seq.id AND l.balance_after IS DISTINCT FROM seq.bal;

-- 6. Postconditions.
DO $$
DECLARE n int; d numeric;
BEGIN
  SELECT count(*) INTO n FROM public.ledger_entries l JOIN stage_a_map m ON m.id = l.id
   WHERE l.effective_date IS DISTINCT FROM m.new_effective_date;
  IF n <> 0 THEN RAISE EXCEPTION 'STAGE_A_TARGET_DATE_NOT_APPLIED rows=%', n; END IF;

  SELECT count(*) INTO n FROM public.ledger_entries l JOIN stage_a_before b ON b.id = l.id
   WHERE l.id NOT IN (SELECT id FROM stage_a_map)
     AND l.effective_date IS DISTINCT FROM b.effective_date;
  IF n <> 0 THEN RAISE EXCEPTION 'STAGE_A_NON_TARGET_DATE_CHANGED rows=%', n; END IF;

  SELECT count(*) INTO n FROM public.ledger_entries l JOIN stage_a_before b ON b.id = l.id
   WHERE l.amount <> b.amount;
  IF n <> 0 THEN RAISE EXCEPTION 'STAGE_A_AMOUNT_CHANGED rows=%', n; END IF;

  SELECT coalesce(max(abs(x.diff)),0) INTO d FROM (
    SELECT cb.balance - sum(l.amount) AS diff
      FROM public.ledger_entries l
      JOIN public.customer_balances cb
        ON cb.client_id = l.client_id AND cb.tenant_id = l.tenant_id
     WHERE l.client_id IN (SELECT client_id FROM stage_a_map)
     GROUP BY cb.balance, l.client_id) x;
  IF d <> 0 THEN RAISE EXCEPTION 'STAGE_A_BALANCE_RECONCILIATION_FAILED diff=%', d; END IF;
END $$;

COMMIT;
```

Any raised exception aborts the whole transaction. No partial commit is possible.

## L. Proposed Rollback SQL (not executed)

Preconditions: the execution artifact `affected-running-balances-before.csv` exists and is complete; no ledger write has occurred for the 7 clients since the batch; the batch ID matches.

```sql
BEGIN;
-- Load the before image from the artifact into a temp table with the same shape.
CREATE TEMP TABLE stage_a_restore (
  id uuid PRIMARY KEY, effective_date date, balance_after numeric NOT NULL
) ON COMMIT DROP;
-- \copy stage_a_restore FROM 'affected-running-balances-before.csv' WITH CSV HEADER

UPDATE public.ledger_entries l
   SET effective_date = r.effective_date,   -- NULL for all 28 targets
       balance_after  = r.balance_after
  FROM stage_a_restore r
 WHERE l.id = r.id
   AND (l.effective_date IS DISTINCT FROM r.effective_date
        OR l.balance_after IS DISTINCT FROM r.balance_after);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.ledger_entries WHERE effective_date IS NULL;
  IF n <> 28 THEN RAISE EXCEPTION 'ROLLBACK_NULL_COUNT % <> 28', n; END IF;
  SELECT count(*) INTO n FROM public.ledger_entries l JOIN stage_a_restore r ON r.id = l.id
   WHERE l.balance_after <> r.balance_after;
  IF n <> 0 THEN RAISE EXCEPTION 'ROLLBACK_BALANCE_MISMATCH rows=%', n; END IF;
END $$;
COMMIT;
```

Verification after rollback: NULL `effective_date` count = 28; per-client `SUM(amount)` unchanged; `customer_balances.balance` unchanged; no column other than `effective_date` and `balance_after` touched; no row outside the 87-row client scope touched.

## M. Evidence Artifact Package (proposed, not created)

Directory: `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-a-economic-date-backfill/`

Files: `README.md`, `target-rows-before.csv`, `target-rows-after.csv`, `affected-running-balances-before.csv`, `affected-running-balances-after.csv`, `reconciliation-before-after.csv`, `execution.sql`, `rollback.sql`, `validation.md`, `run-metadata.md` — with the contents specified in Section 14 of the prompt.

Batch ID pattern: `STAGE-A-ECONDATE-<YYYYMMDD>-<HHMM-Riyadh>-<28>-<first8 of the sha256 of the sorted target UUID list>`, for example `STAGE-A-ECONDATE-20260803-1700-28-<hash8>`. The hash binds the batch to the exact frozen target set.

## N. Stage A Acceptance Criteria

The 22 criteria in Section 16 of the prompt are adopted verbatim, with these measurable bindings: (1)(2)(3) the map holds exactly the 28 UUIDs of Section E and all preconditions pass; (4) zero non-target `effective_date` changes, proven against `stage_a_before`; (5)(6) zero amount changes and zero writes to `invoices`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`; (7)(8)(9) per-client debit, credit and net identical to Section I; (10)(11) `customer_balances` unchanged and equal to `SUM(amount)`; (12)(13) if D-5 approves, every row of the 7 clients satisfies `balance_after = canonical running sum`, verified by a full re-scan; (14) rows 23 and 24 are recorded in `README.md` as `LEGACY_PRE_ISSUE_PAYMENT_EXCEPTION`; (15) rows 20–22 carry the D-1/D-2 action dates; (16) no row is labelled a Historical Correction; (17) NULL count among the 28 becomes zero; (18) any NULL row created after this preview is reported by the `STAGE_A_OUT_OF_SCOPE_NULL_ROWS` notice and left untouched; (19) rollback restores the artifact state exactly; (20) all ten artifact files exist; (21)(22) a successful commit is not Acceptance — a read-only Stage A Acceptance Re-Audit is still required.

## O. Risks and Blockers

Blocking:
- **BLK-A-01 — `balance_after` recalculation scope requires a new Owner decision (D-5).** Affected rows: 69 (25 target, 44 non-target) across 7 clients; the client scope covers 87 of 88 ledger rows. Evidence: Sections G, H. The stored chain is already stale on 78 of 88 rows before any backfill, so the choice is not "date-only versus safe" — it is between leaving a known-wrong derived column wrong, repairing it for the affected clients inside the Stage A transaction, or dropping the column from authority in a later stage. Required resolution: owner picks one of (a) recalculate the 7 affected clients atomically in Stage A (recommended — step 5 of the proposed SQL), (b) date-only update and defer all balance repair to a dedicated stage, (c) treat `balance_after` as non-authoritative and plan its removal. Owner Alignment: required. Recommended next Mode after the decision: Plan/Chat read-only for a one-page D-5 addendum, then Agent/Build.

Non-blocking:
- Two overlapping SELECT policies on `ledger_entries`.
- Void action dates rest on `created_at` because no cancellation timestamp column exists (owner-approved under D-1).

Accepted legacy exceptions: rows 23 and 24 — payment economic date precedes the invoice `issue_date`; approved under D-4; the `post_payment` guard is unchanged for new writes.

Deferred: `useLedger.ts` writer correction, statement and first-activity cutover, exports, `NOT NULL`, POS atomicity.

Out of scope: duplicate-invoice cleanup, provenance and import infrastructure, opening obligations, unapplied-credit architecture.

## P. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY STAGE A PREVIEW ONLY.
WS-DH-2026-0003 remains ACTIVE — INVESTIGATIVE AUDIT PENDING.
Owner Alignment decisions D-1 through D-4 have been applied to the preview only.
No database backfill, code execution, QA, Acceptance or Closure occurred.

## Q. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.
No Phase advancement, database execution, technical Acceptance or Closure occurred in this run.

## RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan/Chat — Read-Only.
2. Operation: Stage A Economic Date Backfill Preview, Balance Re-Sequencing Simulation, Rollback Contract and Execution Readiness Review.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-BACKFILL-PREVIEW-06.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026.
6. Prompt Preparation Time: 16:21.
7. Prompt Preparation Timezone: Asia/Riyadh (UTC+03:00).
8. Owner Alignment Date: 03-08-2026.
9. Owner Alignment Time: 16:21.
10. Owner Alignment Timezone: Asia/Riyadh (UTC+03:00).
11. Run Start: 03-08-2026 16:50 (+03:00), derived from the platform message send time 13:50 UTC.
12. First evidenced activity: ledger total and NULL-count query.
13. Run End: Exact time not recorded.
14. Last evidenced activity: `balance_after` staleness and recalculation-count queries.
15. Final Report Date and Time: Exact time not recorded.
16. Timestamp evidence source: platform-supplied message send time; all others Exact time not recorded.
17. Branch: current edit branch.
18. Canonical/default branch evidence: not queried this run.
19. HEAD before: not queried this run.
20. HEAD after: unchanged — no source commit.
21. Working Tree before: not queried this run.
22. Working Tree after: `.lovable/plan.md` only.
23.–25. Staged / unstaged / untracked paths: not queried; nothing staged or created by this run.
26. Repository paths read: `src/hooks/finance/useLedgerBalance.ts`, `src/hooks/finance/useCustomerBalance.ts`, `src/hooks/finance/useLedger.ts`, `src/hooks/clients/useClientStatement.ts`, `src/lib/finance/effectiveDate.ts`, `docs/aml_1_b_1/stage_j5_1/preflight/01_fn__finance_ledger_insert.txt`, `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/workstream.md`.
27. Database queries executed: 9 read-only statements (counts, target resolution, two re-sequencing CTEs, reconciliation, staleness, column metadata).
28. Database role used: the sandbox managed Postgres role.
29. Rows read: 88 ledger rows plus joined invoices and payment sessions, and `customer_balances` for 7 clients.
30. Current total Ledger count: 88.
31. Current NULL effective-date count: 28.
32. Full target count: 28.
33. Affected Client count: 7 (3 tenants, 87 ledger rows).
34. Target effective-date update count proposed: 28.
35. Balance-after update count proposed: 69 (25 target, 44 non-target) — pending Owner Decision D-5.
36. Intended repository changes: zero.
37. Actual intentional repository changes: zero.
38. Database changes: zero.
39. Migration changes: zero.
40. Project Knowledge changes: zero.
41. Workspace Knowledge changes: zero.
42. Skill changes: zero.
43. Settings changes: zero.
44. `.lovable/plan.md` disclosure: written by Plan Mode to carry this report; a platform planning artifact under DEC-RM-DH-003-004, not a governance or application change.
45. Workstream Status: ACTIVE — INVESTIGATIVE AUDIT PENDING.
46. Roadmap Phase: RM-DH-004 / Phase 1.
47. Owner decisions remaining: one — D-5 (`balance_after` scope), raised by BLK-A-01.
48. Stage A readiness verdict: STAGE A BLOCKED BY SPECIFIC PREVIEW DEFECTS.
49. Acceptance: none.
50. Closure: none.
51. Exact stopping point: The approved 28-row Stage A Economic Date Backfill has been previewed read-only using full UUIDs, verified source dates, simulated chronological ordering, simulated running balances, monetary reconciliation, bounded proposed SQL, rollback SQL and an evidence-package contract. No repository, database, migration or financial-data write has occurred.
52. Recommended next step: the owner rules on D-5, choosing option (a), (b) or (c) in BLK-A-01.
53. Recommended next Mode: Plan/Chat — Read-Only for the D-5 addendum, then Agent/Build for Stage A execution.
