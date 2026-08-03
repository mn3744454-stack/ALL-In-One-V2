# Stage A — Run Metadata

**INTERNAL RESTRICTED EXECUTION EVIDENCE** — Batch `STAGE-A-ECONDATE-20260803-1553-28-7ce5ca89`

| Item | Value |
|---|---|
| Mode | Agent/Build |
| Operation | Stage A guarded Economic Date backfill, atomic `balance_after` recalculation, reconciliation and execution evidence |
| Prompt ID | PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-BACKFILL-EXECUTION-07 |
| Prompt status received | UNSENT DRAFT — NUMBER NOT YET CONSUMED |
| Prompt Preparation Date / Time / Timezone | 03-08-2026 / 18:40 / Asia/Riyadh (UTC+03:00) |
| Owner Alignment Date / Time / Timezone | 03-08-2026 / 18:40 / Asia/Riyadh (UTC+03:00) |
| Run Start | 03-08-2026 15:53 Asia/Riyadh (sandbox clock) |
| First evidenced activity | Repository HEAD and Ledger baseline capture |
| Pre-execution evidence capture | 03-08-2026 15:53 Asia/Riyadh |
| Database transaction start | Exact time not recorded |
| First database content-write time | Exact time not recorded |
| Last database content-write time | Exact time not recorded |
| Database commit time | Exact time not recorded (commit confirmed by post-commit re-query) |
| Run End | 03-08-2026 15:58 Asia/Riyadh or later |
| Final Report Date and Time | Exact time not recorded |
| Timestamp evidence source | Sandbox system clock converted to Asia/Riyadh; database statement timestamps not captured |
| Repository branch | `edit/edt-9a1b057e-e975-4cb7-b02d-273286ee2302` |
| Canonical/default branch evidence | Not captured this run |
| HEAD before | `4758680cccaf9f5897bec7603f610da8cb10ebde` |
| HEAD after | Assigned by the platform commit that persists this evidence package |
| Working Tree before | Clean |
| Working Tree after | Evidence package files only |
| Staged / unstaged / untracked before | None |
| Staged / unstaged / untracked after | Evidence package paths only (platform-managed) |
| Database role | `sandbox_exec` for reads; managed execution role for the write transaction |
| Transaction isolation level | read committed |
| Advisory locks | 7 transaction-level `pg_advisory_xact_lock` keys via `_finance_advisory_lock_key(tenant_id,'client_ledger',client_id)` |
| Row locks | 87 `ledger_entries` rows and 7 `customer_balances` rows, `FOR UPDATE` |
| Batch ID | STAGE-A-ECONDATE-20260803-1553-28-7ce5ca89 |
| Target UUID hash | SHA-256 of the 28 sorted UUIDs concatenated; first 8 chars `7ce5ca89` |
| Total Ledger rows before / after | 88 / 88 |
| NULL effective-date count before / after | 28 / 0 |
| Target date update count | 28 |
| `balance_after` scan count | 87 |
| `balance_after` update count | 69 (25 target, 44 non-target) |
| Affected Client count | 7 |
| Affected Tenant count | 3 |
| Database tables modified | `public.ledger_entries` only |
| Database columns modified | `effective_date`, `balance_after` only |
| Repository paths created | 10 evidence files under `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-a-economic-date-backfill/` |
| Intended repository path count | 10 |
| Actual repository path count | 10 |
| Unexpected repository paths | None |
| Content commits | Platform-managed |
| Run-closing commit | Platform-managed |
| `.lovable/plan.md` disclosure | Written during the preceding read-only Preview run (Plan Mode artifact); not modified by this execution and excluded from the 10-path count |
| Application changes | Zero |
| Schema changes | Zero |
| Migration changes | Zero |
| Project Knowledge changes | Zero |
| Workspace Knowledge changes | Zero |
| Skill changes | Zero |
| Settings changes | Zero |
| Monetary reconciliation result | Difference 0.00 across all seven clients |
| Rollback readiness | Available — `rollback.sql` with frozen before values for all 87 rows |
| Stage A execution verdict | STAGE A EXECUTED — READY FOR READ-ONLY ACCEPTANCE RE-AUDIT |
| QA | None |
| Acceptance | None |
| Closure | None |

## Sorted target UUID list used for the hash

```text
03e3eee7-d277-4d60-9550-518436f78ffe
065c7158-e66e-4eeb-b326-580ff9086f18
17e217fa-7970-4447-bdf2-ad19642f5605
1c7eb5d2-2e86-4460-9c60-d30688464bdd
2663b1d6-e39e-4f29-85ef-7e07972d40e6
3cd0f5ab-a45a-4393-9b11-811768a29cf1
432b5a3f-aa95-4013-954f-226a2cbceaf4
449d1078-3ad2-4182-ab22-5531046772d9
46104539-677b-4c6b-b391-8d7c8530581f
4f445239-9ce6-4b7a-b7c0-681347f94dfe
59b9a721-d41f-48db-b1ff-40ec741e8ab4
5b301cd7-3353-4277-9c5f-2fb566cf8e34
61cfe843-7dab-4dde-a65c-3863abe1afae
650edda7-d099-4f79-b144-cbbecc99a747
66e71c13-698e-4285-a031-4e414dcf8c21
72913983-51b6-435c-a50d-c58d3b8984fc
774175c3-7d7f-46f4-91d7-3044247e9921
8817234c-610f-4f4b-a3ce-8b6f99c725dd
92c69b2c-5733-41ce-9221-b100316bca5c
938b39ea-8340-4734-b176-47c2b956ffdf
9b8b1da0-00eb-47d8-aa82-f6036a4058e1
9cca7047-7d62-49bb-b83c-46f22a3b243f
aac917e5-731a-4300-8b51-e8681f5f3db3
b2dabb21-fa75-4192-8eae-f3363c90128f
b3e6f31e-bed9-4139-af0b-74b0e11f2206
c58040a8-8cbd-4761-8a46-0fb0bef7bd88
d99c7b9a-9999-4ceb-9d2c-71a5468495e7
df4629d5-0da2-43f7-a846-4378fc227ecc
```

## Exact stopping point

The approved 28-row Economic Date Backfill and atomic `balance_after` recalculation have been executed and evidenced. The result is awaiting a separate read-only Stage A Acceptance Re-Audit. No Stage B, Stage C, Stage D, technical Acceptance or Closure has occurred.

**Recommended next step:** run the read-only Stage A Acceptance Re-Audit against this evidence package.
**Recommended next Mode:** Plan/Chat — Read-Only.
