This plan covers only the authoring step authorized by the completed R3 Pass B audit. No remediation of any R3 defect is included.

## Scope

Create one canonical architecture document and register it in the docs index.

## Authoring diff (exact)

Add:
- `docs/architecture/core-user-flows-and-operational-lifecycles.md`

Modify:
- `docs/README.md` — add index entry, bump `1.5.0` → `1.6.0`

Nothing else is added, modified, moved, renamed, or deleted. Accepted Round 1 and Round 2 documents remain untouched.

## Document contract

- Document ID: `DHB-ARCH-CORE-FLOWS-LIFECYCLES`
- Version: `1.0.0`
- Title: Dayli Horse — Core User Flows, End-to-End Operational Lifecycles & Post-Onboarding Experience Reality
- Native Markdown per `docs/CONVENTIONS.md` (no code-fence wrapping of prose), full front-matter block (id, title, version, status, audience, date, last-verified, supersedes, superseded-by, source, source-sha256).

## Document structure

1. Purpose, scope and read-only provenance
2. Workflow completeness taxonomy (12 values, kept distinct from account maturity, module status, severity and commercial readiness)
3. Identity → onboarding → workspace activation
4. Workspace creation and capability initialization (including the five seeded capability categories and the `useModuleAccess` fallback parity)
5. Membership, invitations, roles and access
6. Horse identity, ownership, custody and access
7. Horse Owner and hosted-horse lifecycle
8. Boarding contract → arrival → admission → housing → checkout (with the authoritative arrival state machine)
9. Hosted-horse Service Requests
10. Laboratory (per-object lifecycles and terminal actions)
11. Veterinary Clinic vs Independent Veterinarian (side by side, not merged)
12. Training Academy
13. Services, products, inventory and POS
14. Finance lifecycles (invoice, payments, expenses, statements)
15. Connections, consents and cross-tenant access
16. Contracts and documents
17. Notifications (channel-aware taxonomy)
18. Community and representation (scope separated from publishing identity)
19. Files, media and public sharing
20. Cancellation, reversal, archive and deletion
21. Post-onboarding dossiers for all 10 current types
22. Planned-type flow readiness (Farrier, Professional Rider, Jockey)
23. Failure, dead-end and recovery register
24. Test-coverage matrix
25. Localization, RTL, mobile, time and number findings
26. Defect and risk register (R3-01 … R3-13)

All 17 mandatory matrices from the audit are carried in verbatim.

## Terminology rules enforced during authoring

- "Boarding Contract request" (`pending_stable` / `pending_owner`) is never used interchangeably with hosted-horse Service Requests, arrival scheduling, contract approval, or admission.
- Payment is documented as non-reversible; `voided` is recorded as an unreachable enum value.
- `reviewed`, `issued` and `sent` are recorded as permitted-but-unused invoice constraint members, not lifecycle states.
- Community is documented as tenant-scoped but personally authored.
- Notification channels use the seven-value channel-aware taxonomy.

## Out of scope

No code, schema, RLS, RPC, Edge Function, route or configuration change. No security remediation. No second document.
