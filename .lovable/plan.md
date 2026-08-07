# Owner Alignment — Prompt 57 Four-File Bounded Correction Envelope

Status: Owner Alignment only. Implementation remains separately gated. No hosted database mutation, migration repair, history stamping, replay, rerun, Behavioral QA, Acceptance, Slice 3B/3C, Prompt 58, or Closure is in scope.

## Authoritative Principles (as approved)

1. Managed-chain ACL intent is authoritative for canonical clean reconstruction.
2. Hosted/platform-observed ACL differences are recorded as divergence only, and never broaden the canonical authorization contract.
3. `sandbox_exec` EXECUTE on finance functions is not authorized (remains Deferred Item 18).
4. Absence of hosted-only default-ACL rows in a clean environment is not a failure, provided explicit REVOKE / RLS / postcondition security remains fail-closed and any unexpected observed grantee fails.
5. Exactly four files. No fifth correction path. No workflow correction.

## File 1 — Migration #313: source-checkout predecessor fingerprint

Replace the single-state predecessor fingerprint preflight for `create_source_checkout_invoice` with a three-state presence gate:

- PRESENT and matching expected predecessor shape: proceed.
- ABSENT (clean rebuild — predecessor never materialised): skip the fingerprint comparison, proceed, and record the skip reason.
- PRESENT but non-matching: fail closed with an explicit contradiction error.

Outcome: clean rebuilds no longer abort on a fingerprint that only exists in the hosted lineage, while drift on an existing installation still blocks.

## File 2 — Migration #321: `_finance_invoice_approve_inline` owner-only contract

Append a deterministic hardening block after the function definition, per DEC-B:

- `ALTER FUNCTION ... OWNER TO` the managed owner role.
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated, service_role`.

Outcome: on a clean rebuild the function can no longer inherit `PUBLIC EXECUTE` from default privileges; the authorization surface is owner-only and identical in hosted and clean environments.

## File 3 — Migration #323: thirteen-function semantic ACL verification

Replace the raw aggregate MD5 ACL fingerprints (environment-coupled, invalidated by platform default-ACL injection) with a three-branch selector evaluated per environment:

- POS-PRESENT: verify against the recorded positive observation set.
- POS-ABSENT: verify with structural semantic assertions — for each of the thirteen finance functions, assert the exact set of (role, privilege) pairs derived from managed-chain intent.
- CONTRADICTORY: fail closed.

Managed-chain intent applied:

- 12 of 13 functions explicitly REVOKE `service_role`.
- `post_payment_session` is the sole function carrying a genuine managed `service_role` GRANT.
- `sandbox_exec` is excluded from every allowlist.
- Any observed grantee outside the derived allowlist fails the assertion.

## File 4 — Migration #326: environment-aware restricted-role / default-ACL handling

- Gate restricted/sandbox role references on role existence: mandatory roles missing is a failure; optional (hosted-only) roles missing is a recorded skip.
- Make default-ACL verification presence-conditional: absent hosted-only default-ACL rows are a recorded skip, not a failure.
- Preserve unchanged: explicit deny-all table security, REVOKE statements, RLS enablement, and postcondition assertions — all remain fail-closed.
- Any unexpected observed grantee fails.

## Divergence Register (recorded, not corrected)

| Observation | Managed intent | Disposition |
| --- | --- | --- |
| `service_role` EXECUTE observed on finance functions other than `post_payment_session` | Explicit REVOKE | Class C — observed only, excluded from canonical allowlist |
| `sandbox_exec` EXECUTE observed | No managed GRANT | Class C — excluded, Deferred Item 18 |
| Platform-injected default-ACL rows | Not managed | Environment-conditional, skip-on-absent |

## Explicitly Out of Scope

Migrations #315 and #316 (Class A, no collision with frozen workflow hashes) are untouched. No changes to workflow definitions, no hosted mutation, no test execution against the hosted database.

## Next Gate

Implementation of these four file edits requires a separate explicit authorization.
