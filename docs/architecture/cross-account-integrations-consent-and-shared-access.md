<!--
id: DHB-ARCH-CROSS-ACCOUNT-INTEGRATIONS
title: Dayli Horse — Ecosystem-Wide Cross-Account Integrations, Consent, Shared Horse Access & Inter-Workspace Service Delivery
version: 1.0.0
status: current
audience: internal+external
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored from the completed strict read-only ecosystem cross-account investigative audit (live enum, live public-schema object census, RLS/RPC inspection and frontend callsite review), with the owner-binding owner-visibility decision applied
source-sha256: n/a
-->

# Dayli Horse — Ecosystem-Wide Cross-Account Integrations, Consent, Shared Horse Access & Inter-Workspace Service Delivery

## 1. Document Identity and Authority

| Field | Value |
|---|---|
| Document ID | `DHB-ARCH-CROSS-ACCOUNT-INTEGRATIONS` |
| Version | `1.0.0` |
| Status | Current / Accepted Architecture Reference |
| Audience | Project owner, authorized development partners, maintainers and auditors |
| Path | `docs/architecture/cross-account-integrations-consent-and-shared-access.md` |
| Date / last-verified | 2026-07-28 |
| Authority | Canonical current-truth reference for cross-account integration, consent, shared horse access, multi-party service chains and inter-workspace service delivery |

This document is additive. It does not modify, supersede or reinterpret the accepted baselines
[`DHB-ARCH-ACCOUNT-TYPES-IDENTITY`](./account-types-and-identity-model.md),
[`DHB-ARCH-ACCOUNT-MODULE-REALITY`](./account-types-and-module-reality.md) or
[`DHB-ARCH-CORE-FLOWS-LIFECYCLES`](./core-user-flows-and-operational-lifecycles.md).

## 2. Purpose and Scope

This document records, as current truth, how any two or more Dayli Horse workspaces may discover each other, connect,
establish consent, grant horse-specific access, materialize a client or provider relationship, request and deliver a
service, exchange records, notify each other, invoice and settle, retain history, and terminate authority.

It covers the complete relationship universe: 10 current implemented account/workspace types, 45 current unique
cross-type pairs, 90 current directional relationship paths, 10 same-type relationship assessments, 3 planned
account/workspace types, 13 approved target account/workspace types, 78 total target unique pairs, 33 pairs involving
at least one planned type, and the multi-party chains that span three or more workspaces.

Out of scope: remediation of any finding, design of the future owner-visibility release mechanism, security fixes,
finance implementation, and any change to application source, database objects, policies, functions or configuration.

## 3. Evidence Hierarchy and Verification Date

1. Live database state (enums, tables, policies, functions, grants) — highest authority.
2. Application source and frontend callsites.
3. Accepted current-truth architecture documents.
4. Historical evidence — lowest authority; superseded wherever it conflicts.

Verification date: 2026-07-28. Primary evidence used during authoring:

- Live enum `tenant_type` = `stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor` — exactly 10 values. No `farrier`, `rider` or `jockey` value exists. No "Independent Laboratory" value exists; the canonical Laboratory workspace type is `lab`.
- Live enum `connection_type` = `b2b, b2c, employment` — connections are **type-agnostic** and do not constrain which account types may connect.
- Live public-schema cross-account object census (see §32).
- Negative evidence: no `pharmacy_*`, `auction_*`, `transport_*`, `farrier_*`, `rider_*` or `jockey_*` domain lifecycle table exists.

## 4. Ecosystem Architecture Principle

**Dayli Horse is a many-to-many equine ecosystem, not a Stable-centered hub-and-spoke application.**

Any account type may potentially interact with any other type when — and only when — all of the following exist:
domain purpose, authority, a connection, consent, horse access, a service lifecycle, and governed records and finance.

The existence of generic connection primitives does **not** prove an operational integration. A pair is only
operationally integrated when a dedicated domain lifecycle can be initiated, accepted, delivered, observed, settled
and closed.

The audit deliberately did not assume that services originate from a Stable, that provider relationships are
Stable-mediated, that horses are hosted at a Stable, or that the Horse Owner can only act through a Stable.

## 5. Current and Target Account-Type Contract

**10 current implemented account/workspace types:**

| # | Type | Enum value |
|---|---|---|
| 1 | Stable | `stable` |
| 2 | Veterinary Clinic | `clinic` |
| 3 | Laboratory | `lab` |
| 4 | Training Academy | `academy` |
| 5 | Equine Pharmacy | `pharmacy` |
| 6 | Horse Transport | `transport` |
| 7 | Horse Auction | `auction` |
| 8 | Horse Owner | `horse_owner` |
| 9 | Independent Trainer | `trainer` |
| 10 | Independent Veterinarian | `doctor` |

**3 planned account/workspace types:** Farrier, Professional Rider, Jockey. Professional Rider and Jockey are
distinct planned types and are never merged. None is currently implemented.

**13 approved target account/workspace types** = 10 current + 3 planned.

Counts used throughout this document: **10 current implemented account/workspace types**, **3 planned
account/workspace types**, **13 approved target account/workspace types**, **45 current unique cross-type pairs**,
**90 current directional paths**, **33 planned-involving pairs**, 78 total target unique pairs.

## 6. Ecosystem Graph Model

- **Node** — an account/workspace type.
- **Edge** — a possible relationship between two types.
- **Directed edge** — a current actionable flow from one type to another.
- **Edge authority** — connection, consent, horse access, membership, ownership, custody, token or public sharing.
- **Edge maturity** — one of the 15 integration-maturity values in §7.
- **Edge payload** — horse data, service request, record, document, notification or financial object.
- **Edge termination** — revoke, expire, cancel, end, disconnect or none.

Authority is layered and strictly ordered:

```text
membership → connection → consent → horse scope → domain lifecycle object → finance object → token / public share
```

The first three layers are fully generic and type-agnostic. Only the fourth layer is type-specific, and it exists for
a small subset of pairs. This is the single structural fact that explains the whole matrix in §8: most of the graph is
**connectable but not operable**.

## 7. Integration Maturity Taxonomy

| # | Value | Meaning |
|---|---|---|
| 1 | `end-to-end-integrated` | Both parties can initiate, accept, operate, observe, settle and close the relationship through governed workflows. |
| 2 | `operational-partial` | A real relationship exists, but states, visibility, notifications, finance, revocation or terminal behavior are incomplete. |
| 3 | `connection-foundation-only` | Generic connection primitives exist without a dedicated domain lifecycle. |
| 4 | `consent-foundation-only` | Consent primitives exist without a complete service or record-sharing lifecycle. |
| 5 | `horse-access-foundation-only` | Horse-scoped access exists without a complete collaboration workflow. |
| 6 | `provider-preference-only` | Provider preference can be recorded but does not bind or execute a service. |
| 7 | `backend-foundation-ui-partial` | Backend relationships exist but the user-facing lifecycle is incomplete. |
| 8 | `request-only` | One side can submit a request, but downstream delivery is incomplete. |
| 9 | `view-only` | One side can view governed data but cannot operate the lifecycle. |
| 10 | `public-token-only` | Access exists only through token/public sharing. |
| 11 | `placeholder` | Account/workspace identity exists without an integration workflow. |
| 12 | `contradictory` | Multiple authority, visibility or state models conflict. |
| 13 | `planned` | Approved future integration without current implementation. |
| 14 | `not-applicable` | The relationship is not meaningful for the current domain model. |
| 15 | `no-current-direct-integration` | Both account types exist, but no current direct relationship or governed workflow was found. |

Integration maturity is a separate axis from account-type maturity, module status, workflow completeness, risk
severity and commercial readiness. A pair may be `connection-foundation-only` while both participating account types
are individually domain-substantive.

## 8. Current 10 × 10 Ecosystem Matrix

Legend: `OP` = operational-partial · `CF` = connection-foundation-only · `CSF` = consent-foundation-only ·
`HAF` = horse-access-foundation-only · `PT/VO` = public-token-only / view-only · `RQ` = request-only ·
`PH` = placeholder · `NCDI` = no-current-direct-integration · `ST` = same-type (see §13).

| ↓ A \ B → | Stable | Clinic | Lab | Academy | Pharmacy | Transport | Auction | Owner | Trainer | Doctor |
|---|---|---|---|---|---|---|---|---|---|---|
| **Stable** | ST | CF | OP | CF | CF | CF | NCDI | OP | CF | HAF |
| **Clinic** | CF | ST | OP | NCDI | NCDI | NCDI | NCDI | CSF | NCDI | CF |
| **Lab** | OP | OP | ST | CF | NCDI | NCDI | NCDI | PT/VO | CF | OP |
| **Academy** | CF | NCDI | CF | ST | NCDI | NCDI | NCDI | RQ | CF | NCDI |
| **Pharmacy** | CF | NCDI | NCDI | NCDI | ST | NCDI | NCDI | NCDI | NCDI | NCDI |
| **Transport** | CF | NCDI | NCDI | NCDI | NCDI | ST | NCDI | NCDI | NCDI | NCDI |
| **Auction** | NCDI | NCDI | NCDI | NCDI | NCDI | NCDI | ST | PH | PH | PH |
| **Owner** | OP | CSF | PT/VO | RQ | NCDI | NCDI | PH | ST | CF | HAF |
| **Trainer** | CF | NCDI | CF | CF | NCDI | NCDI | PH | CF | ST | NCDI |
| **Doctor** | HAF | CF | OP | NCDI | NCDI | NCDI | PH | HAF | NCDI | ST |

No cell is blank and **no current pair is classified `end-to-end-integrated`.**

## 9. Target 13 × 13 Readiness Matrix

Legend adds: `PL` = planned (no current implementation).

| ↓ A \ B → | Stable | Clinic | Lab | Academy | Pharmacy | Transport | Auction | Owner | Trainer | Doctor | Farrier | Rider | Jockey |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Stable** | ST | CF | OP | CF | CF | CF | NCDI | OP | CF | HAF | PL | PL | PL |
| **Clinic** | CF | ST | OP | NCDI | NCDI | NCDI | NCDI | CSF | NCDI | CF | PL | PL | PL |
| **Lab** | OP | OP | ST | CF | NCDI | NCDI | NCDI | PT/VO | CF | OP | PL | PL | PL |
| **Academy** | CF | NCDI | CF | ST | NCDI | NCDI | NCDI | RQ | CF | NCDI | PL | PL | PL |
| **Pharmacy** | CF | NCDI | NCDI | NCDI | ST | NCDI | NCDI | NCDI | NCDI | NCDI | PL | PL | PL |
| **Transport** | CF | NCDI | NCDI | NCDI | NCDI | ST | NCDI | NCDI | NCDI | NCDI | PL | PL | PL |
| **Auction** | NCDI | NCDI | NCDI | NCDI | NCDI | NCDI | ST | PH | PH | PH | PL | PL | PL |
| **Owner** | OP | CSF | PT/VO | RQ | NCDI | NCDI | PH | ST | CF | HAF | PL | PL | PL |
| **Trainer** | CF | NCDI | CF | CF | NCDI | NCDI | PH | CF | ST | NCDI | PL | PL | PL |
| **Doctor** | HAF | CF | OP | NCDI | NCDI | NCDI | PH | HAF | NCDI | ST | PL | PL | PL |
| **Farrier** | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL |
| **Rider** | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL |
| **Jockey** | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL |

Every cell involving Farrier, Professional Rider or Jockey is `PL` (planned). None is currently implemented.

## 10. Current 45-Pair Coverage Register

| # | Pair | Integration maturity | Dedicated domain lifecycle object? |
|---|---|---|---|
| P01 | Stable ↔ Veterinary Clinic | `connection-foundation-only` | No |
| P02 | Stable ↔ Laboratory | `operational-partial` | Yes |
| P03 | Stable ↔ Training Academy | `connection-foundation-only` | No |
| P04 | Stable ↔ Equine Pharmacy | `connection-foundation-only` | No |
| P05 | Stable ↔ Horse Transport | `connection-foundation-only` | No |
| P06 | Stable ↔ Horse Auction | `no-current-direct-integration` | No |
| P07 | Stable ↔ Horse Owner | `operational-partial` | Yes |
| P08 | Stable ↔ Independent Trainer | `connection-foundation-only` | No |
| P09 | Stable ↔ Independent Veterinarian | `horse-access-foundation-only` | No |
| P10 | Veterinary Clinic ↔ Laboratory | `operational-partial` | Yes |
| P11 | Veterinary Clinic ↔ Training Academy | `no-current-direct-integration` | No |
| P12 | Veterinary Clinic ↔ Equine Pharmacy | `no-current-direct-integration` | No |
| P13 | Veterinary Clinic ↔ Horse Transport | `no-current-direct-integration` | No |
| P14 | Veterinary Clinic ↔ Horse Auction | `no-current-direct-integration` | No |
| P15 | Veterinary Clinic ↔ Horse Owner | `consent-foundation-only` | No |
| P16 | Veterinary Clinic ↔ Independent Trainer | `no-current-direct-integration` | No |
| P17 | Veterinary Clinic ↔ Independent Veterinarian | `connection-foundation-only` | No |
| P18 | Laboratory ↔ Training Academy | `connection-foundation-only` | No |
| P19 | Laboratory ↔ Equine Pharmacy | `no-current-direct-integration` | No |
| P20 | Laboratory ↔ Horse Transport | `no-current-direct-integration` | No |
| P21 | Laboratory ↔ Horse Auction | `no-current-direct-integration` | No |
| P22 | Laboratory ↔ Horse Owner | `public-token-only / view-only` | Yes |
| P23 | Laboratory ↔ Independent Trainer | `connection-foundation-only` | No |
| P24 | Laboratory ↔ Independent Veterinarian | `operational-partial` | Yes |
| P25 | Training Academy ↔ Equine Pharmacy | `no-current-direct-integration` | No |
| P26 | Training Academy ↔ Horse Transport | `no-current-direct-integration` | No |
| P27 | Training Academy ↔ Horse Auction | `no-current-direct-integration` | No |
| P28 | Training Academy ↔ Horse Owner | `request-only` | Yes |
| P29 | Training Academy ↔ Independent Trainer | `connection-foundation-only` | No |
| P30 | Training Academy ↔ Independent Veterinarian | `no-current-direct-integration` | No |
| P31 | Equine Pharmacy ↔ Horse Transport | `no-current-direct-integration` | No |
| P32 | Equine Pharmacy ↔ Horse Auction | `no-current-direct-integration` | No |
| P33 | Equine Pharmacy ↔ Horse Owner | `no-current-direct-integration` | No |
| P34 | Equine Pharmacy ↔ Independent Trainer | `no-current-direct-integration` | No |
| P35 | Equine Pharmacy ↔ Independent Veterinarian | `no-current-direct-integration` | No |
| P36 | Horse Transport ↔ Horse Auction | `no-current-direct-integration` | No |
| P37 | Horse Transport ↔ Horse Owner | `no-current-direct-integration` | No |
| P38 | Horse Transport ↔ Independent Trainer | `no-current-direct-integration` | No |
| P39 | Horse Transport ↔ Independent Veterinarian | `no-current-direct-integration` | No |
| P40 | Horse Auction ↔ Horse Owner | `placeholder` | No |
| P41 | Horse Auction ↔ Independent Trainer | `placeholder` | No |
| P42 | Horse Auction ↔ Independent Veterinarian | `placeholder` | No |
| P43 | Horse Owner ↔ Independent Trainer | `connection-foundation-only` | No |
| P44 | Horse Owner ↔ Independent Veterinarian | `horse-access-foundation-only` | No |
| P45 | Independent Trainer ↔ Independent Veterinarian | `no-current-direct-integration` | No |

All 45 current unique cross-type pairs are present. No cell is blank.

## 11. Current 90 Directional Path Register

Direction is never assumed symmetric. Each of the 45 pairs is classified twice.

| # | Pair | Direction | Directional classification |
|---|---|---|---|
| D01 | P01 | Stable → Clinic | `connection-foundation-only` — generic connection only; no destination workflow |
| D02 | P01 | Clinic → Stable | `connection-foundation-only` — generic connection only; no destination workflow |
| D03 | P02 | Stable → Lab | `operational-partial` — requester initiates the laboratory request chain and receives released results |
| D04 | P02 | Lab → Stable | `view-only` — Laboratory returns results into the requester projection; no reverse initiation and no cross-tenant invoicing |
| D05 | P03 | Stable → Academy | `connection-foundation-only` — generic connection only; no destination workflow |
| D06 | P03 | Academy → Stable | `connection-foundation-only` — generic connection only; no destination workflow |
| D07 | P04 | Stable → Pharmacy | `connection-foundation-only` — generic connection only; no destination workflow |
| D08 | P04 | Pharmacy → Stable | `connection-foundation-only` — generic connection only; no destination workflow |
| D09 | P05 | Stable → Transport | `connection-foundation-only` — generic connection only; no destination workflow |
| D10 | P05 | Transport → Stable | `connection-foundation-only` — generic connection only; no destination workflow |
| D11 | P06 | Stable → Auction | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D12 | P06 | Auction → Stable | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D13 | P07 | Stable → Owner | `operational-partial` — hosting, care and billing delivered to the Owner; owner-facing visibility is a curated RPC projection |
| D14 | P07 | Owner → Stable | `operational-partial` — Owner initiates boarding-contract requests and hosted-horse Service Requests; no Owner → Stable invoicing |
| D15 | P08 | Stable → Trainer | `connection-foundation-only` — generic connection only; no destination workflow |
| D16 | P08 | Trainer → Stable | `connection-foundation-only` — generic connection only; no destination workflow |
| D17 | P09 | Stable → Doctor | `horse-access-foundation-only` — grants scoped per-horse access |
| D18 | P09 | Doctor → Stable | `horse-access-foundation-only` — receives scoped per-horse access; no bound request lifecycle |
| D19 | P10 | Clinic → Lab | `operational-partial` — requester initiates the laboratory request chain and receives released results |
| D20 | P10 | Lab → Clinic | `view-only` — Laboratory returns results into the requester projection; no reverse initiation and no cross-tenant invoicing |
| D21 | P11 | Clinic → Academy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D22 | P11 | Academy → Clinic | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D23 | P12 | Clinic → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D24 | P12 | Pharmacy → Clinic | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D25 | P13 | Clinic → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D26 | P13 | Transport → Clinic | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D27 | P14 | Clinic → Auction | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D28 | P14 | Auction → Clinic | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D29 | P15 | Clinic → Owner | `consent-foundation-only` — scoped consent may be granted and read; no service lifecycle |
| D30 | P15 | Owner → Clinic | `consent-foundation-only` — scoped consent may be granted and read; no service lifecycle |
| D31 | P16 | Clinic → Trainer | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D32 | P16 | Trainer → Clinic | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D33 | P17 | Clinic → Doctor | `connection-foundation-only` — generic connection only; no destination workflow |
| D34 | P17 | Doctor → Clinic | `connection-foundation-only` — generic connection only; no destination workflow |
| D35 | P18 | Lab → Academy | `connection-foundation-only` — generic connection only; no destination workflow |
| D36 | P18 | Academy → Lab | `connection-foundation-only` — generic connection only; no destination workflow |
| D37 | P19 | Lab → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D38 | P19 | Pharmacy → Lab | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D39 | P20 | Lab → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D40 | P20 | Transport → Lab | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D41 | P21 | Lab → Auction | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D42 | P21 | Auction → Lab | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D43 | P22 | Lab → Owner | `public-token-only` — Laboratory publishes a report or result the Owner may view |
| D44 | P22 | Owner → Lab | `no-current-direct-integration` — the Owner has no route to initiate or pay for work |
| D45 | P23 | Lab → Trainer | `connection-foundation-only` — generic connection only; no destination workflow |
| D46 | P23 | Trainer → Lab | `connection-foundation-only` — generic connection only; no destination workflow |
| D47 | P24 | Lab → Doctor | `view-only` — Laboratory returns results into the Doctor's projection; no Lab → Doctor initiation or invoicing |
| D48 | P24 | Doctor → Lab | `operational-partial` — Doctor initiates the generic requester path and receives results |
| D49 | P25 | Academy → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D50 | P25 | Pharmacy → Academy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D51 | P26 | Academy → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D52 | P26 | Transport → Academy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D53 | P27 | Academy → Auction | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D54 | P27 | Auction → Academy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D55 | P28 | Academy → Owner | `request-only` — Academy receives and records the booking; no governed completion or progress projection |
| D56 | P28 | Owner → Academy | `request-only` — Owner submits a booking request |
| D57 | P29 | Academy → Trainer | `connection-foundation-only` — generic connection only; no destination workflow |
| D58 | P29 | Trainer → Academy | `connection-foundation-only` — generic connection only; no destination workflow |
| D59 | P30 | Academy → Doctor | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D60 | P30 | Doctor → Academy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D61 | P31 | Pharmacy → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D62 | P31 | Transport → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D63 | P32 | Pharmacy → Auction | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D64 | P32 | Auction → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D65 | P33 | Pharmacy → Owner | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D66 | P33 | Owner → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D67 | P34 | Pharmacy → Trainer | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D68 | P34 | Trainer → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D69 | P35 | Pharmacy → Doctor | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D70 | P35 | Doctor → Pharmacy | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D71 | P36 | Transport → Auction | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D72 | P36 | Auction → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D73 | P37 | Transport → Owner | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D74 | P37 | Owner → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D75 | P38 | Transport → Trainer | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D76 | P38 | Trainer → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D77 | P39 | Transport → Doctor | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D78 | P39 | Doctor → Transport | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D79 | P40 | Auction → Owner | `placeholder` — the Auction workspace has no domain lifecycle object |
| D80 | P40 | Owner → Auction | `placeholder` — the Auction workspace has no domain lifecycle object |
| D81 | P41 | Auction → Trainer | `placeholder` — the Auction workspace has no domain lifecycle object |
| D82 | P41 | Trainer → Auction | `placeholder` — the Auction workspace has no domain lifecycle object |
| D83 | P42 | Auction → Doctor | `placeholder` — the Auction workspace has no domain lifecycle object |
| D84 | P42 | Doctor → Auction | `placeholder` — the Auction workspace has no domain lifecycle object |
| D85 | P43 | Owner → Trainer | `connection-foundation-only` — generic connection only; no destination workflow |
| D86 | P43 | Trainer → Owner | `connection-foundation-only` — generic connection only; no destination workflow |
| D87 | P44 | Owner → Doctor | `horse-access-foundation-only` — grants scoped per-horse access |
| D88 | P44 | Doctor → Owner | `horse-access-foundation-only` — receives scoped per-horse access; no bound request lifecycle |
| D89 | P45 | Trainer → Doctor | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |
| D90 | P45 | Doctor → Trainer | `no-current-direct-integration` — no pair-specific object, route or lifecycle exists |

All 90 current directional paths are classified.

## 12. Planned-Involving 33-Pair Register

Every pair below is `planned`. None is currently operational. Reusable current foundations are, in every case:
`connections`, `consent_grants`, `connection_horse_access`, tenant-local Finance, and the notification framework.
The blocker is, in every case, identical: **no `tenant_type` enum value exists for the planned type**, and no
scheduling or service-delivery lifecycle object exists for it.

| # | Pair | Purpose | Required connection | Consent | Horse access | Service / scheduling | Record ownership | Finance | Notifications | Revocation | Bilingual / mobile | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PL01 | Farrier ↔ Stable | hoof-care and shoeing service delivery with Stable | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL02 | Farrier ↔ Veterinary Clinic | hoof-care and shoeing service delivery with Veterinary Clinic | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL03 | Farrier ↔ Laboratory | hoof-care and shoeing service delivery with Laboratory | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL04 | Farrier ↔ Training Academy | hoof-care and shoeing service delivery with Training Academy | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL05 | Farrier ↔ Equine Pharmacy | hoof-care and shoeing service delivery with Equine Pharmacy | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL06 | Farrier ↔ Horse Transport | hoof-care and shoeing service delivery with Horse Transport | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL07 | Farrier ↔ Horse Auction | hoof-care and shoeing service delivery with Horse Auction | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL08 | Farrier ↔ Horse Owner | hoof-care and shoeing service delivery with Horse Owner | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL09 | Farrier ↔ Independent Trainer | hoof-care and shoeing service delivery with Independent Trainer | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL10 | Farrier ↔ Independent Veterinarian | hoof-care and shoeing service delivery with Independent Veterinarian | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL11 | Professional Rider ↔ Stable | competition and schooling ride engagement with Stable | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL12 | Professional Rider ↔ Veterinary Clinic | competition and schooling ride engagement with Veterinary Clinic | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL13 | Professional Rider ↔ Laboratory | competition and schooling ride engagement with Laboratory | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL14 | Professional Rider ↔ Training Academy | competition and schooling ride engagement with Training Academy | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL15 | Professional Rider ↔ Equine Pharmacy | competition and schooling ride engagement with Equine Pharmacy | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL16 | Professional Rider ↔ Horse Transport | competition and schooling ride engagement with Horse Transport | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL17 | Professional Rider ↔ Horse Auction | competition and schooling ride engagement with Horse Auction | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL18 | Professional Rider ↔ Horse Owner | competition and schooling ride engagement with Horse Owner | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL19 | Professional Rider ↔ Independent Trainer | competition and schooling ride engagement with Independent Trainer | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL20 | Professional Rider ↔ Independent Veterinarian | competition and schooling ride engagement with Independent Veterinarian | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL21 | Jockey ↔ Stable | race-ride engagement with Stable | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL22 | Jockey ↔ Veterinary Clinic | race-ride engagement with Veterinary Clinic | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL23 | Jockey ↔ Laboratory | race-ride engagement with Laboratory | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL24 | Jockey ↔ Training Academy | race-ride engagement with Training Academy | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL25 | Jockey ↔ Equine Pharmacy | race-ride engagement with Equine Pharmacy | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL26 | Jockey ↔ Horse Transport | race-ride engagement with Horse Transport | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL27 | Jockey ↔ Horse Auction | race-ride engagement with Horse Auction | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL28 | Jockey ↔ Horse Owner | race-ride engagement with Horse Owner | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL29 | Jockey ↔ Independent Trainer | race-ride engagement with Independent Trainer | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL30 | Jockey ↔ Independent Veterinarian | race-ride engagement with Independent Veterinarian | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | race booking and licence-bound assignment — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL31 | Farrier ↔ Professional Rider | hoof-care and shoeing service delivery with Professional Rider | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL32 | Farrier ↔ Jockey | hoof-care and shoeing service delivery with Jockey | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | scheduled visit / cycle-based recall — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |
| PL33 | Professional Rider ↔ Jockey | competition and schooling ride engagement with Jockey | generic `connections` (`b2b`/`b2c`) | scoped `consent_grants` | `connection_horse_access` per horse | engagement / assignment per horse and event — not implemented | producing workspace owns the service record | tenant-local invoice; no cross-tenant issuance exists | connection + service events required | forward-looking revoke required | AR/EN labels and mobile surfaces required | `planned` |

All 33 planned-involving pairs are classified `planned`.

## 13. Same-Type Relationship Analysis

Generic connection infrastructure is type-agnostic, so every same-type edge is technically connectable. No same-type
pair currently has a proven dedicated operational lifecycle.

| Same-type pair | Plausible purpose | Dedicated lifecycle | Classification |
|---|---|---|---|
| Stable ↔ Stable | Horse transfer between stables | None | `connection-foundation-only` |
| Clinic ↔ Clinic | Clinical referral | None | `connection-foundation-only` |
| Laboratory ↔ Laboratory | Referral / subcontracting of tests | None | `connection-foundation-only` |
| Academy ↔ Academy | Programme collaboration | None | `connection-foundation-only` |
| Pharmacy ↔ Pharmacy | Stock transfer / supply | None | `connection-foundation-only` |
| Transport ↔ Transport | Subcontracting of a movement | None | `connection-foundation-only` |
| Auction ↔ Auction | Cross-listing | None | `connection-foundation-only` |
| Horse Owner ↔ Horse Owner | Co-ownership | None as a workspace edge — co-ownership is represented through ownership percentages and `horse_ownership_history` | `not-applicable` |
| Independent Trainer ↔ Independent Trainer | Referral / cover | None | `connection-foundation-only` |
| Independent Veterinarian ↔ Independent Veterinarian | Referral / second opinion | None | `connection-foundation-only` |

## 14. Relationship and Authority Model

Twenty distinct authority mechanisms exist. **None substitutes for another.**

| # | Mechanism | Creator | Recipient | Scope | Direction | Expiry | Revocation | Downstream authority granted |
|---|---|---|---|---|---|---|---|---|
| 1 | Workspace membership | Workspace owner/admin | Person | Whole workspace, role-bounded | Inward | None | Member removal | Everything the role's permissions allow inside that one workspace |
| 2 | Membership invitation | Workspace owner/admin | Email/phone identity | Pending membership | Outward | Yes | Revoke | None until accepted and identity-verified |
| 3 | Workspace connection | Workspace A | Workspace B | Relationship edge only | Bidirectional once accepted | Optional `expires_at` | `revoke_connection` | **None** — no data, no horse, no consent |
| 4 | Connection message | Either party | Counterparty | Message thread | Bidirectional | None | Connection revoke | None |
| 5 | Consent grant | Grantor tenant | Connected tenant | Resource type ± resource IDs, date window, excluded fields | One-way | Yes | `revoke_consent_grant` | Governed read (or stated access level) of the named resources only |
| 6 | `connection_horse_access` | Granting tenant | Connected tenant | Named horses, read / readwrite | One-way | **No expiry column** | Delete-then-insert replacement | Per-horse access only |
| 7 | `horse_owner_access_grants` | Owner | Workspace | Owner-held horses | One-way | Yes | Revoke | Scoped owner-authorized access |
| 8 | `owner_delegations` (+ `delegation_scopes`) | Owner | Delegate | Named scopes | One-way | Yes | Revoke (audited in `delegation_audit_log`) | Acting on the owner's behalf within the named scopes |
| 9 | `horse_shares` | Horse-authoritative tenant | Recipient | Single horse | One-way | Yes | Revoke | Governed horse view |
| 10 | `horse_share_packs` | Horse-authoritative tenant | Recipient | Bundle of horses/records | One-way | Yes | Revoke | Governed bundled view |
| 11 | Owner claim invitation / token | Stable or platform | Prospective owner | Claim of a specific horse/owner identity | Outward | Yes | Revoke | None until claimed; audited in `owner_claim_events` |
| 12 | Public report / media share | Publishing tenant | Anyone holding the link | One report / media object | Outward | Token lifetime | Revoke (SharedMedia signed URLs may survive ≤3600s) | Read of the published object only |
| 13 | Boarding Contract request | Owner or Stable | Counterparty | One horse, one hosting agreement | Bidirectional initiation | Contract term | End contract | Establishes hosting/custody, not ownership |
| 14 | Hosted-horse Service Request | Owner | Hosting Stable | One horse, one request | Owner → Stable | Request lifetime | Cancel | A request only — never automatic fulfilment |
| 15 | Provider preference | Any workspace | — | Informational | — | None | Change | **None** |
| 16 | Client/customer materialization | Provider workspace | — | Finance-local record | Inward | None | Archive | Billing identity inside one tenant only |
| 17 | Ownership (`horse_ownership`) | Owner | — | Economic/legal | — | None | Transfer (history retained) | Ownership rights; **not** universal record visibility |
| 18 | Custody / hosting | Hosting workspace | — | Physical possession | — | Admission → checkout | Checkout | Operational authority; **not** ownership |
| 19 | Community follow | Person | Tenant/person | Public feed | Outward | None | Unfollow | Public content only |
| 20 | Financial customer/payer relationship | Invoicing tenant | Payer | Invoice + payment objects | Inward | None | Cancel invoice | Tenant-local finance only |

**Canonical statement:** an accepted connection creates neither consent nor horse access. Consent creates no horse
access beyond its named resources. Horse access creates no ownership. Ownership creates no custody. Custody creates
no client status. Provider preference creates nothing at all.

## 15. Invitation vs Connection vs Consent vs Access

| Mechanism | Creates workspace membership? | Creates a relationship edge? | Grants data access? | Grants horse access? | Creates a service obligation? | Creates finance? |
|---|---|---|---|---|---|---|
| Membership invitation | Yes (on acceptance + identity verification) | No | Inside one workspace only | Via role | No | No |
| Workspace connection request | No | Yes | **No** | **No** | No | No |
| Consent grant | No | Requires an existing connection | Yes — named resources only | Only if horses are the named resource | No | No |
| `connection_horse_access` | No | Requires an existing connection | Per-horse only | Yes | No | No |
| `horse_owner_access_grants` | No | No | Owner-scoped | Yes | No | No |
| `owner_delegations` | No | No | Scope-bound | Scope-bound | No | No |
| `horse_shares` / `horse_share_packs` | No | No | Governed view | Yes | No | No |
| Owner claim token | Leads to an owner workspace | No | No | On claim | No | No |
| Public report / media share | No | No | One published object | No | No | No |
| Boarding Contract request | No | Yes (hosting) | Operational | Yes (custody) | Yes | Yes (invoicing basis) |
| Hosted-horse Service Request | No | No | Request payload | No | Request only | No |
| Provider preference | No | No | No | No | No | No |
| Client/customer materialization | No | No | No | No | No | Yes (tenant-local) |

These mechanisms are **not interchangeable**.

## 16. Connection Lifecycle

| Stage | Object / function | Notes |
|---|---|---|
| Request | `create_connection_request` | Records initiator tenant/user and recipient tenant, profile, email or phone; email normalized; `connection_type` = `b2b` / `b2c` / `employment`; **no account-type pair restriction** |
| Pending | `connections.status = pending` | Visible to both sides through the partner surfaces |
| Messaging | `connection_messages` | Thread bound to the connection |
| Rate limiting | `connection_rate_limits` | Guards request flooding |
| Acceptance | `accept_connection(_token)` | Creates the active edge and nothing else |
| Rejection | `reject_connection(_token)` | Terminal for that request |
| Expiration | `expire-stale-connections` Edge Function + `expires_at` | Automated stale expiry |
| Revocation | `revoke_connection(_token)` | Forward-looking |
| Re-request | New request required | A revoked or rejected edge is not reopened in place |
| Duplicate prevention | Unique active-partnership index (LEAST/GREATEST) | One active connection per tenant pair |
| Notifications | Connection lifecycle events | Meaningful coverage exists for this layer |
| Audit | `sharing_audit_log` (actor/target tenant scoped) | Connection and sharing events |

**Acceptance grants no consent, no horse access, no service relationship and no finance.**

## 17. Consent Lifecycle

| Attribute | Behavior |
|---|---|
| Dependency | Requires an existing connection (`_connection_id`) |
| Grantor | `grantor_tenant_id` — the tenant releasing data |
| Resource type | Required (`_resource_type`) |
| Resource IDs | Optional (`_resource_ids`) — narrows the grant to named records |
| Access level | `read` by default (`_access_level`) |
| Date window | `_date_from` / `_date_to` |
| Forward-only | `_forward_only` restricts the grant to records created after the grant |
| Excluded fields | `_excluded_fields` removes named fields from the projection |
| Expiry | `_expires_at` |
| Revocation | `revoke_consent_grant` — forward-looking, does not erase prior lawful records |
| Read path | `get_granted_data(_grant_id, _date_from, _date_to)` |
| Recipient view | Active grants only, filtered by connection and enforced by RLS |

Consent is **not** tenant-wide access. It is resource-typed, optionally record-scoped, optionally time-bound,
optionally field-excluded, and predominantly read-oriented.

## 18. Horse Access Layers

| Layer | Grantor | Recipient | Horse scope | Field scope | Read/write | Expiry | Revocation | Notification | Audit |
|---|---|---|---|---|---|---|---|---|---|
| `connection_horse_access` | Connected tenant | Connected tenant | Named horses | Full row | `read` / `readwrite` | **None (no expiry column)** | Delete-then-insert replacement of the whole set per connection | **None confirmed** | Not covered by a dedicated audit trail |
| `horse_owner_access_grants` | Horse Owner | Workspace | Owner-held horses | Grant-scoped | Scoped | Yes | Revoke | Partial | Partial |
| `owner_delegations` + `delegation_scopes` | Horse Owner | Delegate | Scope-bound | Scope-bound | Scoped | Yes | Revoke | Partial | `delegation_audit_log` |
| `horse_shares` | Horse-authoritative tenant | Recipient | One horse | Governed projection | Read | Yes | Revoke | Partial | `sharing_audit_log` |
| `horse_share_packs` | Horse-authoritative tenant | Recipient | Bundle | Governed projection | Read | Yes | Revoke | Partial | `sharing_audit_log` |
| `party_horse_links` | Tenant | Party (owner, trainer, vet, …) | One horse per role | Role-bound | Reference | None | Unlink | None | None |
| `horse_ownership` (+ `_history`) | System of record | — | One horse | Ownership fields | — | — | Transfer | Partial | `horse_ownership_history` |
| `boarding_contracts` / `boarding_admissions` | Owner + Stable | Stable | One horse | Operational | Operational | Contract/stay | End / checkout | Partial | `boarding_status_history` |
| Active hosting / housing | Stable | Stable | One horse | Placement | Operational | Stay | Checkout | Partial | Occupancy history |
| Public horse / report / media share | Publishing tenant | Token holder | One object | Published fields | Read | Token lifetime | Revoke (≤3600s residue on SharedMedia) | None | `sharing_audit_log` / `media_share_links` |
| `lab_horses` | Laboratory | Laboratory | Lightweight registry entry linked by microchip | Lab fields | Lab-local | None | Archive | None | `lab_events` |
| Clinic / Vet horse reference (`vet_*`) | Clinic | Clinic | Tenant-local | Clinical | Tenant-local | None | Archive | Partial | `vet_events` |
| Doctor patient relationship (`doctor_patients`) | Doctor | Doctor | Tenant-local | Clinical | Tenant-local | None | Archive | Partial | Partial |
| Academy booking horse reference | Academy | Academy | Tenant-local | Booking | Tenant-local | Booking | Cancel | None | None |
| Transport movement reference (`horse_movements`) | Moving tenant | Moving tenant | One horse | Movement | Tenant-local | Movement | Cancel | Partial | Movement history |

**Recorded explicitly:** `connection_horse_access` is written by the frontend as a wholesale delete-then-insert per
connection, supports `read` / `readwrite` only, has **no expiry field**, and has **no confirmed revocation
notification**.

## 19. Ownership vs Custody vs Hosting

| Concept | Object | What it establishes | What it does **not** establish |
|---|---|---|---|
| Ownership | `horse_ownership`, `horse_ownership_history` | Economic and legal ownership, including joint percentages | Universal record visibility; custody; client status |
| Hosting / custody | `boarding_contracts` → `boarding_admissions` | The right and duty of a workspace to hold and care for a horse | Ownership; authority over the owner's other horses |
| Placement | Housing units / occupancy | Physical location inside the hosting workspace | Custody outside that workspace |
| Movement | `horse_movements`, `incoming_horse_movements` | Location and custody change | A transport provider relationship |
| Client status | Finance client record | Who is billed | Ownership, custody or access |
| Connection | `connections` | A relationship edge | Ownership, custody, access or client status |

Ownership does not automatically grant universal record visibility. Custody does not create ownership. A connection
creates neither.

## 20. Provider Discovery and Preference

Provider discovery currently relies on **public profiles and directory surfaces** plus the generic connection
foundation. There is no matching, bidding, availability or assignment engine.

Provider preference is classified `provider-preference-only`. It is **informational**. Recording a preference does
not: bind the provider, create a connection, create consent, grant horse access, create an order, create an invoice,
schedule a service, generate fulfilment, or notify the provider.

| Step | Implemented | Notes |
|---|---|---|
| Provider directory / public profile | Yes | Discovery surface |
| Search / filter | Partial | Directory-level |
| Connection request to provider | Yes | Generic |
| Record preferred / default provider | Yes | Informational only |
| Owner-selected provider | Yes (informational) | No binding effect |
| Stable-selected provider | Yes (informational) | No binding effect |
| Referring provider | No | No referral object |
| Provider acceptance / rejection | No | No assignment object |
| Provider change / history | Partial | No governed provider-selection audit |

## 21. Current Pair Mini-Dossiers

Each of the 45 current unique cross-type pairs has a mini-dossier below. Materially implemented pairs are expanded
further in §22.

#### P01 — Stable ↔ Veterinary Clinic

| Field | Finding |
|---|---|
| Pair ID | P01 |
| Relationship purpose | Clinical escalation and veterinary service supply to a hosting Stable. |
| A → B initiation | Stable may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| B → A initiation | Veterinary Clinic may send a generic connection request to Stable. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P02 — Stable ↔ Laboratory

| Field | Finding |
|---|---|
| Pair ID | P02 |
| Relationship purpose | Diagnostic testing ordered by a Stable and fulfilled by a Laboratory. |
| A → B initiation | Stable → Laboratory: supported through the paths described below. |
| B → A initiation | Laboratory → Stable: supported only where stated; not assumed symmetric. |
| Current UI | Stable-side lab request and sample creation surfaces; Laboratory-side requests, submissions, samples, results and report surfaces; `lab_requests_stable_view` for the requester projection. |
| Current backend | `lab_requests`, `lab_submissions`, `lab_samples`, `lab_services`, `lab_results`, `lab_events`, `lab_horses`, `lab_report_shares`, `lab_result_shares`. |
| Connection | Generic `connections` (`b2b`) is the relationship carrier; the Laboratory request path itself is requester-tenant generic and does not depend on a bespoke Stable-only edge. |
| Consent | `consent_grants` optional; laboratory access is predominantly request-scoped rather than consent-scoped. |
| Horse access | Horse identity crosses through `lab_horses` (lightweight registry keyed on microchip) rather than direct access to the canonical `horses` row. |
| Client/customer relationship | Laboratory materializes the requesting Stable as a client record for its own catalog/pricing purposes. |
| Service / request / order | Full request → submission → sample → result object chain exists. |
| Data visible to A | Stable sees its own requests and released results through the requester projection. |
| Data visible to B | Laboratory sees only the horse and request payload supplied with the request, not the Stable's wider operational data. |
| Record ownership | Laboratory owns the request, sample and result records; the Stable holds a projection and any generated invoice line references. |
| Notifications | Request-layer laboratory events have partial notification support; final-result delivery lacks a complete governed notification lifecycle. |
| Finance A → B | Generic finance only — the Stable can raise its own internal or rebilled invoice. |
| Finance B → A | No cross-tenant invoice issuance from Laboratory to Stable is implemented. |
| Revocation | Connection revocation is forward-looking; issued results, reports and token shares persist. |
| Retained history | Requests, samples, results, events and issued report shares are retained after termination. |
| First complete workflow | Stable raises a laboratory request and receives a finalized result. |
| First incomplete workflow | Cross-tenant settlement of the laboratory fee. |
| First dead end | Laboratory cannot issue an invoice into the Stable workspace; billing is reconstructed manually. |
| Integration maturity | `operational-partial` |
| Commercial statement | May be presented as a working diagnostic-ordering integration. It must not be presented as a settled commercial marketplace. |
| Confidence / evidence | High — dedicated schema objects and both-side UI verified. |

#### P03 — Stable ↔ Training Academy

| Field | Finding |
|---|---|
| Pair ID | P03 |
| Relationship purpose | Training/lesson supply and shared arena or horse usage. |
| A → B initiation | Stable may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| B → A initiation | Training Academy may send a generic connection request to Stable. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P04 — Stable ↔ Equine Pharmacy

| Field | Finding |
|---|---|
| Pair ID | P04 |
| Relationship purpose | Medication and consumable procurement for stabled horses. |
| A → B initiation | Stable may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| B → A initiation | Equine Pharmacy may send a generic connection request to Stable. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P05 — Stable ↔ Horse Transport

| Field | Finding |
|---|---|
| Pair ID | P05 |
| Relationship purpose | Horse pickup, delivery and transfer between locations. |
| A → B initiation | Stable may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| B → A initiation | Horse Transport may send a generic connection request to Stable. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P06 — Stable ↔ Horse Auction

| Field | Finding |
|---|---|
| Pair ID | P06 |
| Relationship purpose | Consignment, pre-sale preparation and post-sale hand-over. |
| A → B initiation | Stable may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| B → A initiation | Horse Auction may send a generic connection request to Stable. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P07 — Stable ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P07 |
| Relationship purpose | Hosting, boarding, care delivery, reporting and billing of an owner's horse. |
| A → B initiation | Stable → Horse Owner: supported through the paths described below. |
| B → A initiation | Horse Owner → Stable: supported only where stated; not assumed symmetric. |
| Current UI | Owner-facing hosted-horses surface; Stable-side boarding contracts, admissions, housing, movement and service-request surfaces; owner claim and invitation surfaces. |
| Current backend | `boarding_contracts`, `boarding_admissions`, `boarding_status_history`, `horse_ownership`, `horse_ownership_history`, `horse_owner_access_grants`, `owner_delegations`, `delegation_scopes`, `delegation_audit_log`, `owner_claim_requests`, `owner_claim_events`, `service_requests`, `service_request_events`, `horse_movements`. |
| Connection | Generic connection plus a dedicated owner-claim/invite path; `connection_type` `b2c` applies. |
| Consent | Owner-side authority flows primarily through `horse_owner_access_grants` and `owner_delegations` rather than through `consent_grants`. |
| Horse access | Horse-scoped; hosting is established by an approved boarding contract and admission, not by connection. |
| Client/customer relationship | The Owner materializes as a finance client of the Stable. |
| Service / request / order | Boarding Contract request → approval → arrival → admission → housing → checkout; plus hosted-horse Service Requests. |
| Data visible to A | The Stable sees the owner's horse identity, ownership and contract terms. |
| Data visible to B | The Owner sees a curated RPC projection of hosted-horse state. Boarding, housing and movement have no explicit release gate; selected internal operational changes may surface through the projection and through movement notifications. |
| Record ownership | The Stable owns operational records; the Owner owns ownership records; neither automatically owns the other's. |
| Notifications | Hosted-horse Service Requests have notification support; boarding-contract lifecycle notification coverage is incomplete; owner invitations may use email-only paths. |
| Finance A → B | Stable invoices Owner — implemented within the Stable's tenant-local finance, including statements and payment allocation. |
| Finance B → A | No Owner → Stable invoice path. |
| Revocation | Contract end and admission checkout close hosting forward-only; grants and delegations can be revoked; invoices, payments and history persist. |
| Retained history | Contracts, admissions, movements, invoices, payments and ownership history are all retained. |
| First complete workflow | Boarding contract request → approval → admission → housing placement → invoice → payment. |
| First incomplete workflow | Governed owner-visibility release control over boarding, housing and movement records. |
| First dead end | There is no per-record owner-visible approval, release actor, release timestamp or release audit for operational records. |
| Integration maturity | `operational-partial` |
| Commercial statement | May be presented as a working hosting-and-billing relationship. It must not be presented as having explicit owner-visibility release governance. |
| Confidence / evidence | High — dedicated schema, both-side UI and finance path verified. |

#### P08 — Stable ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P08 |
| Relationship purpose | Independent trainer engagement on stabled horses. |
| A → B initiation | Stable may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Stable. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P09 — Stable ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P09 |
| Relationship purpose | Independent veterinary attendance on stabled horses. |
| A → B initiation | Stable → Independent Veterinarian: supported through the paths described below. |
| B → A initiation | Independent Veterinarian → Stable: supported only where stated; not assumed symmetric. |
| Current UI | Partner configuration surface with per-horse access selection; Doctor-side patient and consultation surfaces. |
| Current backend | `connections`, `connection_horse_access`, `doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_services`. |
| Connection | Generic `connections` (`b2b`) required first. |
| Consent | `consent_grants` available but not bound to the doctor workflow. |
| Horse access | `connection_horse_access` grants read or readwrite on selected horses. Rows are wholesale-replaced (delete-then-insert) per connection, carry no expiry column, and have no confirmed revocation notification. |
| Client/customer relationship | No automatic client materialization between the two workspaces. |
| Service / request / order | No bound Stable → Doctor consultation request lifecycle exists. |
| Data visible to A | Stable sees nothing of the Doctor's internal records unless the Doctor shares them. |
| Data visible to B | Doctor sees the specific horses granted through `connection_horse_access`. |
| Record ownership | The Doctor owns consultations and prescriptions; the Stable owns its operational records. |
| Notifications | Connection events notify; horse-access replacement does not. |
| Finance A → B | Generic finance only. |
| Finance B → A | Generic finance only. |
| Revocation | Horse access can be replaced or emptied; effect is forward-looking; the Doctor's records persist. |
| Retained history | Consultations, prescriptions and any generated invoices are retained. |
| First complete workflow | Stable grants a Doctor scoped access to selected horses. |
| First incomplete workflow | A governed request → acceptance → visit → report → billing lifecycle. |
| First dead end | After access is granted there is no request object to initiate or track an attendance. |
| Integration maturity | `horse-access-foundation-only` |
| Commercial statement | May be presented as scoped horse sharing with an independent vet. Must not be presented as a veterinary service marketplace. |
| Confidence / evidence | High. |

#### P10 — Veterinary Clinic ↔ Laboratory

| Field | Finding |
|---|---|
| Pair ID | P10 |
| Relationship purpose | Clinician-ordered diagnostics fulfilled by a Laboratory. |
| A → B initiation | Veterinary Clinic → Laboratory: supported through the paths described below. |
| B → A initiation | Laboratory → Veterinary Clinic: supported only where stated; not assumed symmetric. |
| Current UI | Clinic-side ordering surfaces reuse the generic requester path; Laboratory-side request, sample and result surfaces are identical to those used for Stable requesters. |
| Current backend | `lab_requests`, `lab_submissions`, `lab_samples`, `lab_results`, `lab_events`, `lab_horses`. |
| Connection | Generic `connections` (`b2b`). The requester field on the laboratory request chain is tenant-generic, so a Clinic can order independently of any Stable. |
| Consent | Optional `consent_grants`; not required by the request path. |
| Horse access | Horse identity crosses via `lab_horses`. |
| Client/customer relationship | The Laboratory materializes the Clinic as a client for catalog and pricing. |
| Service / request / order | Request → submission → sample → result exists and is traced independently of Stable mediation. |
| Data visible to A | Clinic sees its own requests and released results. |
| Data visible to B | Laboratory sees only the submitted request payload. |
| Record ownership | Laboratory owns request/sample/result; the Clinic holds a projection. |
| Notifications | Request-layer partial; final-result delivery incomplete. |
| Finance A → B | Generic finance only. |
| Finance B → A | No cross-tenant invoice issuance. |
| Revocation | Forward-looking; issued results persist. |
| Retained history | Requests, samples, results and events retained. |
| First complete workflow | Clinic raises a laboratory request and receives a finalized result without Stable involvement. |
| First incomplete workflow | Cross-tenant billing of the clinician-ordered test. |
| First dead end | Laboratory cannot invoice the Clinic across tenants. |
| Integration maturity | `operational-partial` |
| Commercial statement | May be presented as clinician-ordered diagnostics. Must not be presented as settled commercially. |
| Confidence / evidence | High — generic requester path verified on live schema. |

#### P11 — Veterinary Clinic ↔ Training Academy

| Field | Finding |
|---|---|
| Pair ID | P11 |
| Relationship purpose | Clinical support for academy horses and riders. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| B → A initiation | Training Academy may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P12 — Veterinary Clinic ↔ Equine Pharmacy

| Field | Finding |
|---|---|
| Pair ID | P12 |
| Relationship purpose | Prescription issuance and pharmacy fulfilment. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| B → A initiation | Equine Pharmacy may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P13 — Veterinary Clinic ↔ Horse Transport

| Field | Finding |
|---|---|
| Pair ID | P13 |
| Relationship purpose | Patient transfer to and from the clinic. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| B → A initiation | Horse Transport may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P14 — Veterinary Clinic ↔ Horse Auction

| Field | Finding |
|---|---|
| Pair ID | P14 |
| Relationship purpose | Pre-sale veterinary examination and certification. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| B → A initiation | Horse Auction may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P15 — Veterinary Clinic ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P15 |
| Relationship purpose | Direct owner-requested clinical care and record access. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Horse Owner. No pair-specific initiation object exists. |
| B → A initiation | Horse Owner may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | Consent primitives exist (`consent_grants`, `get_granted_data`) but no dedicated service, visit-request or record-exchange lifecycle exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Grantor issues a scoped consent grant and the recipient reads governed data. |
| First incomplete workflow | Service request, delivery, reporting and settlement. |
| First dead end | Consent exists with no domain workflow to consume it. |
| Integration maturity | `consent-foundation-only` |
| Commercial statement | May be presented as governed data sharing only, never as a care-delivery relationship. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P16 — Veterinary Clinic ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P16 |
| Relationship purpose | Clinical clearance and fitness advice for trained horses. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P17 — Veterinary Clinic ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P17 |
| Relationship purpose | Referral and escalation between an independent vet and a clinic. |
| A → B initiation | Veterinary Clinic may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Veterinary Clinic. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P18 — Laboratory ↔ Training Academy

| Field | Finding |
|---|---|
| Pair ID | P18 |
| Relationship purpose | Performance or health testing for academy horses. |
| A → B initiation | Laboratory may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| B → A initiation | Training Academy may send a generic connection request to Laboratory. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P19 — Laboratory ↔ Equine Pharmacy

| Field | Finding |
|---|---|
| Pair ID | P19 |
| Relationship purpose | Consumable/reagent supply and medication-related testing. |
| A → B initiation | Laboratory may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| B → A initiation | Equine Pharmacy may send a generic connection request to Laboratory. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P20 — Laboratory ↔ Horse Transport

| Field | Finding |
|---|---|
| Pair ID | P20 |
| Relationship purpose | Specimen or horse transport to the Laboratory. |
| A → B initiation | Laboratory may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| B → A initiation | Horse Transport may send a generic connection request to Laboratory. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P21 — Laboratory ↔ Horse Auction

| Field | Finding |
|---|---|
| Pair ID | P21 |
| Relationship purpose | Pre-sale diagnostic testing and disclosure. |
| A → B initiation | Laboratory may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| B → A initiation | Horse Auction may send a generic connection request to Laboratory. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P22 — Laboratory ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P22 |
| Relationship purpose | Owner receipt and viewing of diagnostic results. |
| A → B initiation | Laboratory → Horse Owner: supported through the paths described below. |
| B → A initiation | Horse Owner → Laboratory: supported only where stated; not assumed symmetric. |
| Current UI | Public shared-report route (`SharedLabReport`) and shared-media route; no owner-side ordering surface. |
| Current backend | `lab_report_shares`, `lab_result_shares`, `lab_results`, `media_share_links`. |
| Connection | Not required for token viewing; a generic connection is possible but grants nothing additional. |
| Consent | Not used on this edge. |
| Horse access | Token-scoped access to a specific published report or result. |
| Client/customer relationship | No client relationship materializes. |
| Service / request / order | No owner-initiated request path exists. |
| Data visible to A | Laboratory sees nothing of the Owner workspace. |
| Data visible to B | Owner sees only the published report content exposed by the token. |
| Record ownership | Laboratory owns the result; the Owner receives a token view, not an authoritative copy. |
| Notifications | No governed owner-notification lifecycle for final results. |
| Finance A → B | No financial integration. |
| Finance B → A | No financial integration. |
| Revocation | Share revocation is forward-looking; already issued SharedMedia signed URLs may remain valid for up to 3600 seconds. |
| Retained history | The result persists in the Laboratory; the share record persists as history. |
| First complete workflow | Laboratory publishes a report and the Owner views it through the token route. |
| First incomplete workflow | Owner-initiated ordering and payment. |
| First dead end | The Owner has no route to request a test or pay a Laboratory. |
| Integration maturity | `public-token-only / view-only` |
| Commercial statement | May be presented as owner report delivery. Must not be presented as a direct-to-owner laboratory service. |
| Confidence / evidence | High. |

#### P23 — Laboratory ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P23 |
| Relationship purpose | Trainer-initiated or trainer-visible testing. |
| A → B initiation | Laboratory may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Laboratory. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P24 — Laboratory ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P24 |
| Relationship purpose | Independent-vet-ordered diagnostics fulfilled by a Laboratory. |
| A → B initiation | Laboratory → Independent Veterinarian: supported through the paths described below. |
| B → A initiation | Independent Veterinarian → Laboratory: supported only where stated; not assumed symmetric. |
| Current UI | Independent-vet ordering reuses the same generic requester surfaces; Laboratory side is unchanged. |
| Current backend | `lab_requests`, `lab_submissions`, `lab_samples`, `lab_results`, `lab_events`, `lab_horses`, `doctor_consultations`. |
| Connection | Generic `connections` (`b2b`). |
| Consent | Optional; not required by the request path. |
| Horse access | Horse identity crosses via `lab_horses`. |
| Client/customer relationship | The Laboratory materializes the Doctor as a client. |
| Service / request / order | Request → submission → sample → result exists and is traced independently of Stable mediation. |
| Data visible to A | Laboratory sees the submitted payload only. |
| Data visible to B | Doctor sees own requests and released results; interpretation is recorded in the Doctor's own consultation records. |
| Record ownership | Laboratory owns the result; the Doctor owns the interpretation. |
| Notifications | Request-layer partial; result delivery incomplete. |
| Finance A → B | No cross-tenant invoice issuance. |
| Finance B → A | Generic finance only. |
| Revocation | Forward-looking. |
| Retained history | Requests, results and consultations retained. |
| First complete workflow | Doctor orders a test and receives a finalized result. |
| First incomplete workflow | Cross-tenant billing between Laboratory and Doctor. |
| First dead end | No settlement path in either direction. |
| Integration maturity | `operational-partial` |
| Commercial statement | May be presented as independent-vet diagnostics ordering. Not a settled commercial channel. |
| Confidence / evidence | High. |

#### P25 — Training Academy ↔ Equine Pharmacy

| Field | Finding |
|---|---|
| Pair ID | P25 |
| Relationship purpose | Medication and supplement procurement for academy horses. |
| A → B initiation | Training Academy may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| B → A initiation | Equine Pharmacy may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P26 — Training Academy ↔ Horse Transport

| Field | Finding |
|---|---|
| Pair ID | P26 |
| Relationship purpose | Transport of academy horses to events or facilities. |
| A → B initiation | Training Academy may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| B → A initiation | Horse Transport may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P27 — Training Academy ↔ Horse Auction

| Field | Finding |
|---|---|
| Pair ID | P27 |
| Relationship purpose | Sourcing or disposal of academy horses. |
| A → B initiation | Training Academy may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| B → A initiation | Horse Auction may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P28 — Training Academy ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P28 |
| Relationship purpose | Owner booking of lessons, sessions and training programmes. |
| A → B initiation | Training Academy → Horse Owner: supported through the paths described below. |
| B → A initiation | Horse Owner → Training Academy: supported only where stated; not assumed symmetric. |
| Current UI | Session and booking surfaces; owner-facing booking entry. |
| Current backend | `academy_sessions`, `academy_bookings`, `academy_booking_consumption`. |
| Connection | Generic connection (`b2c`) or direct booking; no dedicated relationship object. |
| Consent | Not used on this edge. |
| Horse access | Booking references a horse; no dedicated cross-tenant horse-access grant. |
| Client/customer relationship | Owner may materialize as a finance client of the Academy. |
| Service / request / order | Booking exists; the session lifecycle lacks a governed status progression. |
| Data visible to A | Academy sees the booking and the referenced horse. |
| Data visible to B | Owner sees the booking; there is no governed progress, attendance or outcome projection. |
| Record ownership | Academy owns sessions, bookings and consumption records. |
| Notifications | No complete governed notification lifecycle for booking or session events. |
| Finance A → B | Generic finance only — Academy may invoice the Owner tenant-locally. |
| Finance B → A | No Owner → Academy invoice path. |
| Revocation | Cancellation is not a governed cross-tenant lifecycle. |
| Retained history | Bookings and consumption records are retained. |
| First complete workflow | Owner books a session and the Academy records consumption. |
| First incomplete workflow | Session completion, progress reporting and settlement. |
| First dead end | No governed session status transition or owner-facing outcome record. |
| Integration maturity | `request-only` |
| Commercial statement | May be presented as owner booking intake. Must not be presented as a delivered training programme lifecycle. |
| Confidence / evidence | Medium-High. |

#### P29 — Training Academy ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P29 |
| Relationship purpose | Engagement of an independent trainer by an academy. |
| A → B initiation | Training Academy may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P30 — Training Academy ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P30 |
| Relationship purpose | Veterinary support for academy horses and programmes. |
| A → B initiation | Training Academy may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Training Academy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P31 — Equine Pharmacy ↔ Horse Transport

| Field | Finding |
|---|---|
| Pair ID | P31 |
| Relationship purpose | Delivery of dispensed medication. |
| A → B initiation | Equine Pharmacy may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| B → A initiation | Horse Transport may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P32 — Equine Pharmacy ↔ Horse Auction

| Field | Finding |
|---|---|
| Pair ID | P32 |
| Relationship purpose | Medication disclosure or restriction at sale. |
| A → B initiation | Equine Pharmacy may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| B → A initiation | Horse Auction may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P33 — Equine Pharmacy ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P33 |
| Relationship purpose | Direct owner purchase of medication. |
| A → B initiation | Equine Pharmacy may send a generic connection request to Horse Owner. No pair-specific initiation object exists. |
| B → A initiation | Horse Owner may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P34 — Equine Pharmacy ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P34 |
| Relationship purpose | Trainer procurement of supplements or medication. |
| A → B initiation | Equine Pharmacy may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P35 — Equine Pharmacy ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P35 |
| Relationship purpose | Prescription routing and dispensing. |
| A → B initiation | Equine Pharmacy may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Equine Pharmacy. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P36 — Horse Transport ↔ Horse Auction

| Field | Finding |
|---|---|
| Pair ID | P36 |
| Relationship purpose | Movement of horses to and from auction premises. |
| A → B initiation | Horse Transport may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| B → A initiation | Horse Auction may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P37 — Horse Transport ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P37 |
| Relationship purpose | Owner-initiated transport of an owned horse. |
| A → B initiation | Horse Transport may send a generic connection request to Horse Owner. No pair-specific initiation object exists. |
| B → A initiation | Horse Owner may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P38 — Horse Transport ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P38 |
| Relationship purpose | Movement of horses under a trainer's programme. |
| A → B initiation | Horse Transport may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P39 — Horse Transport ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P39 |
| Relationship purpose | Movement associated with veterinary attendance. |
| A → B initiation | Horse Transport may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Horse Transport. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P40 — Horse Auction ↔ Horse Owner

| Field | Finding |
|---|---|
| Pair ID | P40 |
| Relationship purpose | Consignment, bidding, sale and ownership transfer. |
| A → B initiation | Horse Auction may send a generic connection request to Horse Owner. No pair-specific initiation object exists. |
| B → A initiation | Horse Owner may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No auction lifecycle object exists (no listing, bid, settlement or transfer object in the live schema). The workspace type exists for onboarding only. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. |
| First incomplete workflow | Listing, examination, sale, settlement and ownership transfer. |
| First dead end | The Auction workspace has no domain surface to receive or emit work. |
| Integration maturity | `placeholder` |
| Commercial statement | Auction must be presented as an onboarding placeholder only. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P41 — Horse Auction ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P41 |
| Relationship purpose | Trainer sourcing or presenting horses at sale. |
| A → B initiation | Horse Auction may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No auction lifecycle object exists (no listing, bid, settlement or transfer object in the live schema). The workspace type exists for onboarding only. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. |
| First incomplete workflow | Listing, examination, sale, settlement and ownership transfer. |
| First dead end | The Auction workspace has no domain surface to receive or emit work. |
| Integration maturity | `placeholder` |
| Commercial statement | Auction must be presented as an onboarding placeholder only. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P42 — Horse Auction ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P42 |
| Relationship purpose | Veterinary examination in the sale context. |
| A → B initiation | Horse Auction may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Horse Auction. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No auction lifecycle object exists (no listing, bid, settlement or transfer object in the live schema). The workspace type exists for onboarding only. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. |
| First incomplete workflow | Listing, examination, sale, settlement and ownership transfer. |
| First dead end | The Auction workspace has no domain surface to receive or emit work. |
| Integration maturity | `placeholder` |
| Commercial statement | Auction must be presented as an onboarding placeholder only. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P43 — Horse Owner ↔ Independent Trainer

| Field | Finding |
|---|---|
| Pair ID | P43 |
| Relationship purpose | Direct owner engagement of an independent trainer. |
| A → B initiation | Horse Owner may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| B → A initiation | Independent Trainer may send a generic connection request to Horse Owner. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair; only generic connection primitives and tenant-local domain modules. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Connection request → acceptance. |
| First incomplete workflow | Everything after acceptance: consent, horse access, service request, delivery, finance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `connection-foundation-only` |
| Commercial statement | May be presented as a connectable relationship only. Must not be presented as an operating service integration. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P44 — Horse Owner ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P44 |
| Relationship purpose | Direct owner engagement of an independent veterinarian. |
| A → B initiation | Horse Owner may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Horse Owner. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | Horse-scoped access exists, but no bound service request or delivery lifecycle exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | Scoped per-horse access is granted and honoured. |
| First incomplete workflow | Request, acceptance, delivery, reporting and settlement. |
| First dead end | Access is granted with no request object to initiate work. |
| Integration maturity | `horse-access-foundation-only` |
| Commercial statement | May be presented as scoped horse sharing only. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

#### P45 — Independent Trainer ↔ Independent Veterinarian

| Field | Finding |
|---|---|
| Pair ID | P45 |
| Relationship purpose | Veterinary support for a trainer's horses. |
| A → B initiation | Independent Trainer may send a generic connection request to Independent Veterinarian. No pair-specific initiation object exists. |
| B → A initiation | Independent Veterinarian may send a generic connection request to Independent Trainer. No pair-specific initiation object exists. |
| Current UI | Partner/connection surfaces only. No pair-specific screen. |
| Current backend | `connections`, `connection_messages`, `connection_rate_limits`, optionally `consent_grants` and `connection_horse_access`. No pair-specific domain table exists in the live schema. |
| Connection | Generic `connections` (type-agnostic; `connection_type` is `b2b` / `b2c` / `employment` and does not constrain participant account types). |
| Consent | `consent_grants` available; not bound to any pair-specific workflow. |
| Horse access | `connection_horse_access` available; not bound to any pair-specific workflow. |
| Client/customer relationship | No automatic cross-tenant client materialization. |
| Service / request / order | No dedicated service, request or order object exists for this pair. |
| Data visible to A | Nothing beyond public profile data and anything explicitly granted. |
| Data visible to B | Nothing beyond public profile data and anything explicitly granted. |
| Record ownership | Each workspace retains sole ownership of its own records. |
| Notifications | Connection lifecycle events only. No pair-specific notification coverage. |
| Finance A → B | No current financial integration (generic tenant-local finance only). |
| Finance B → A | No current financial integration (generic tenant-local finance only). |
| Revocation | Connection, consent and horse-access revocation are available and forward-looking. |
| Retained history | Connection records, audit rows and any tenant-local records persist after termination. |
| First complete workflow | None. No pair-specific workflow completes. |
| First incomplete workflow | Every stage after connection acceptance. |
| First dead end | An accepted connection with no destination workflow for this pair. |
| Integration maturity | `no-current-direct-integration` |
| Commercial statement | Must not be presented as an operating integration. Only generic connection foundations exist. |
| Confidence / evidence | High — negative evidence from live-schema object census; no pair-specific table or RPC exists. |

## 22. Material Pair Deep Dossiers

The seven materially implemented or partially implemented pairs receive the expanded treatment below, in addition to
their mini-dossiers in §21.

### 22.1 Stable ↔ Laboratory — `operational-partial`

This is the strongest dedicated cross-account integration in the platform.

- **Requester model.** The laboratory request chain is *requester-tenant generic*. `lab_requests` /
  `lab_submissions` are not Stable-specific; a Stable, a Clinic or an Independent Veterinarian all use the same path.
  This is why §22.3 and §22.4 exist as independent integrations rather than Stable-mediated variants.
- **Object chain.** `lab_requests` (container-level) → `lab_submissions` → `lab_samples` → `lab_services` /
  `lab_request_services` → `lab_results` → report objects. `lab_events` records the lifecycle.
- **Result return path.** Results are returned to the requester through the requester projection
  (`lab_requests_stable_view`) and, for external audiences, through `lab_report_shares` / `lab_result_shares` and the
  public shared-report route.
- **Request-scoped vs connection-scoped access.** Laboratory access to horse data is bound to the *request payload*,
  not to a standing connection grant. The Laboratory does not gain access to the Stable's wider horse registry.
- **Canonical horse vs `lab_horses`.** The Laboratory operates on a lightweight `lab_horses` registry linked by
  microchip rather than on the canonical `horses` row. Identity crossing is therefore by reference, not by shared row.
- **Reports and token shares.** Published reports may be shared onward by token; the token is the only mechanism that
  reaches a party outside the request.
- **Finance.** No cross-tenant invoice issuance exists. The Laboratory cannot raise an invoice inside the Stable
  workspace, and the Stable cannot pay the Laboratory through the platform. Each side records tenant-local finance.
- **Verdict.** `operational-partial`.

### 22.2 Stable ↔ Horse Owner — `operational-partial`

- **Ownership.** `horse_ownership` (+ history) is authoritative and independent of hosting.
- **Boarding Contract request.** Either side may initiate; states include `pending_stable` / `pending_owner`.
  Approval establishes the hosting agreement.
- **Admission and hosting.** Approval → arrival → `boarding_admissions` → housing placement. `boarding_status_history`
  records progression.
- **Hosted-horse projection.** The Owner sees hosted horses through a curated RPC projection, not through direct
  table access.
- **Service Requests.** `service_requests` / `service_request_events` allow the Owner to ask the hosting Stable for
  work. A request is never automatic fulfilment: it does not create a laboratory request, a vet visit, a movement
  record or an invoice.
- **Owner visibility.** Governed by curated projection and field omission — see §26 for the binding decision.
- **Invoices and statements.** The Stable invoices the Owner tenant-locally, with horse-level attribution, payment
  sessions, allocations and statements.
- **End / revocation.** Contract end and admission checkout close hosting forward-only. Owner access grants and
  delegations may be revoked. Invoices, payments, movements and ownership history persist.
- **Verdict.** `operational-partial`, with incomplete release governance.

### 22.3 Veterinary Clinic ↔ Laboratory — `operational-partial`

A Clinic can request laboratory work **independently of any Stable**, because the requester field on the laboratory
request chain is tenant-generic. The result is returned through the same shared object chain. There is no
cross-tenant finance on this edge. Verdict: `operational-partial`.

### 22.4 Laboratory ↔ Independent Veterinarian — `operational-partial`

An Independent Veterinarian uses the same generic requester path and receives results into the Doctor projection,
where interpretation is recorded in `doctor_consultations`. No complete cross-tenant billing exists in either
direction. Verdict: `operational-partial`.

### 22.5 Stable ↔ Independent Veterinarian — `horse-access-foundation-only`

A generic connection is established first; `connection_horse_access` then grants read or readwrite access to selected
horses; `doctor_patients` provides the Doctor-side patient foundation. There is **no bound Stable → Doctor
consultation request lifecycle** — no request object, no acceptance, no scheduling, no governed report return, and no
settlement. Verdict: `horse-access-foundation-only`.

### 22.6 Laboratory ↔ Horse Owner — `public-token-only` / `view-only`

Directionally separated: **Lab → Owner** is `public-token-only` (published report/result viewed through a token
route); **Owner → Lab** is `no-current-direct-integration` (no ordering route, no payment route). Already issued
SharedMedia signed URLs may remain valid for up to 3600 seconds after revocation. Verdict:
`public-token-only` / `view-only`.

### 22.7 Training Academy ↔ Horse Owner — `request-only`

The Owner can submit a booking; `academy_sessions`, `academy_bookings` and `academy_booking_consumption` are
tenant-local to the Academy. The session lifecycle lacks a governed status progression, there is no owner-facing
progress or outcome projection, and settlement is tenant-local generic finance. Verdict: `request-only`.

## 23. Multi-Party Service Chains

**None of the nominated chains is currently end-to-end complete.**

| # | Chain | Edges proven | Breaks at | Payer / payee reality | Maturity |
|---|---|---|---|---|---|
| C01 | Owner → Stable → Laboratory | All three edges exist as real objects | Owner-facing terminal visibility is curated projection, not governed release; no cross-tenant settlement | Owner pays Stable tenant-locally; Stable ↔ Lab settlement is manual | Strongest chain; incomplete |
| C02 | Owner → Stable → Clinic | Owner→Stable proven; Stable→Clinic connection only | Stable → Clinic service request | No cross-tenant settlement | Incomplete |
| C03 | Owner → Stable → Doctor | Owner→Stable proven; Stable→Doctor horse access only | No consultation request object | No cross-tenant settlement | Incomplete |
| C04 | Owner → Stable → Transport | Owner→Stable proven; Stable→Transport connection only | No transport order object | No settlement | Incomplete |
| C05 | Stable → Clinic → Laboratory | Stable→Clinic connection only; Clinic→Lab proven | First edge | No settlement | Incomplete |
| C06 | Stable → Doctor → Laboratory | Stable→Doctor horse access only; Doctor→Lab proven | First edge | No settlement | Incomplete |
| C07 | Clinic → Laboratory → Owner | Clinic→Lab proven; Lab→Owner token only | Owner edge is token-only, ungoverned | No settlement | Incomplete |
| C08 | Doctor → Laboratory → Owner | Doctor→Lab proven; Lab→Owner token only | Owner edge is token-only | No settlement | Incomplete |
| C09 | Doctor → Pharmacy → Owner | Prescription exists (`doctor_prescriptions`, tenant-local) | Pharmacy edge — no dispensing/fulfilment object | None | Broken at provider edge |
| C10 | Clinic → Pharmacy → Owner | Prescription tenant-local | Pharmacy edge | None | Broken at provider edge |
| C11 | Stable → Transport → Clinic | Movement primitives tenant-local | Transport edge — no carrier acceptance object | None | Broken at provider edge |
| C12 | Stable → Transport → Laboratory | Movement primitives tenant-local | Transport edge; no specimen chain-of-custody handoff | None | Broken at provider edge |
| C13 | Owner → Transport → Stable | No owner-initiated transport route | First edge | None | Broken at provider edge |
| C14 | Owner → Transport → Clinic | No owner-initiated transport route | First edge | None | Broken at provider edge |
| C15 | Auction → Owner → Transport | No auction lifecycle object | First edge | None | Broken at provider edge |
| C16 | Auction → Clinic → Laboratory | No auction lifecycle object; Clinic→Lab proven | First edge | None | Broken at provider edge |
| C17 | Academy → Trainer → Owner | Connection primitives only | Academy → Trainer engagement object | None | Broken at first edge |
| C18 | Stable → Farrier → Owner | — | Farrier type does not exist | — | `planned` |
| C19 | Owner → Professional Rider → Academy | — | Professional Rider type does not exist | — | `planned` |
| C20 | Jockey → Clinic → Laboratory | — | Jockey type does not exist | — | `planned` |
| C21 | Professional Rider → Pharmacy | — | Type does not exist; no pharmacy lifecycle | — | `planned` |
| C22 | Jockey → Pharmacy | — | Type does not exist; no pharmacy lifecycle | — | `planned` |

Pharmacy, Transport and Auction chains break at their dedicated provider edge in every case.

## 24. Record Ownership and Provenance

| Record | Creator | Authoritative owner | Downstream parties receive |
|---|---|---|---|
| Laboratory request | Requester tenant (Stable / Clinic / Doctor) | Laboratory (once submitted) | Requester projection |
| Laboratory sample | Laboratory | Laboratory | Reference |
| Laboratory result | Laboratory | Laboratory | Projection or token view |
| Result interpretation | Doctor / Clinic | Interpreting workspace | Nothing automatic |
| Prescription | Doctor / Clinic | Issuing workspace | Nothing — no fulfilment edge |
| Boarding contract | Owner + Stable | Both parties to the agreement | Each sees its own side |
| Admission / housing / movement | Stable | Stable | Owner sees a curated projection |
| Service request | Owner | Owner (request) / Stable (handling) | Event trail |
| Invoice / payment | Issuing tenant | Issuing tenant | Nothing cross-tenant |
| Ownership record | Owner | Owner | Hosting workspace sees contract-scoped facts |
| Published report / media | Publishing tenant | Publishing tenant | Token view |

**Producing workspaces retain authoritative record ownership. Downstream parties receive projections, references,
snapshots or token views — never automatically authoritative copies.**

## 25. Cross-Account Data Visibility

| Surface | Enforcement layer | Notes |
|---|---|---|
| Horse identity / microchip / breed | RLS + RPC projection | Crosses to Laboratory only as `lab_horses` reference |
| Ownership and owner identity | RLS | Contract-scoped disclosure to the hosting workspace |
| Custodian | RLS | Tenant-local |
| Boarding contract | RLS | Both parties to the contract |
| Admission | RLS + RPC projection | Owner sees a curated projection |
| Housing unit | RPC projection / field omission | **No release gate** |
| Movement | RPC projection + notifications | **No release gate**; notifications may surface selected internal changes |
| Laboratory requests | RLS | Requester and Laboratory only |
| Laboratory preliminary results | RLS + status gating | Not released until finalized |
| Laboratory final results | RLS + publication-style flag + token share | Publication-style flag exists in Laboratory flows |
| Clinical records (`vet_*`) | RLS | Tenant-local |
| Doctor records / consultations | RLS + publication-style flag | Release flag exists in Doctor flows |
| Prescriptions | RLS | Tenant-local; no cross-tenant route |
| Service requests | RLS + events | Owner and hosting Stable |
| Internal notes / staff comments | RLS | Tenant-local |
| Provider preference | RLS | Tenant-local, informational |
| Invoices / payments / statements | RLS | Tenant-local |
| Documents / media | RLS + signed URL | Signed URLs may survive revocation ≤3600s |
| Staff and provider identity | RLS | Tenant-local |

No sensitive cross-account surface was proven to rely on **frontend filtering alone**. The residual exposure risk is
not frontend filtering but the **absence of an explicit release gate** on boarding, housing and movement (§26).

## 26. Owner-Visibility Governance Decision (binding)

**Current state:** `partially implemented — curated-RPC projection`

**Target state:** `explicit owner-visibility release governance`

Current owner-facing visibility is limited through curated RPC projections, selected field omission, and selected
publication-style flags in some Laboratory and Doctor flows. **This provides partial protection.** It is a useful
protective implementation, and it must not be described as completely unsafe.

**It does not, however, constitute a complete explicit release-governance model, and curated projection is not the
intended final governance model.**

Boarding, Housing and Movement do not currently have a proven equivalent of:

- internal-only state;
- owner-visible approval;
- approved-for-release state;
- release actor;
- release timestamp;
- release audit history;
- versioned owner snapshot;
- withdrawal / correction lifecycle.

Internal Stable movement may surface to the Owner through the Hosted Horses projection, movement notifications, and
current owner-facing state projections.

Therefore the approved owner rule remains **incompletely implemented**: internal operational changes must not
automatically become owner-visible without governed release control.

The future release mechanism is deliberately **not designed or implemented in this document**.

## 27. Cross-Account Finance

- Finance is primarily **tenant-local**.
- Generic Finance availability does **not** prove pair-level financial integration.
- **No proven cross-tenant invoice issuance lifecycle exists.**
- No proven automatic provider-payable generation across tenants.
- No proven platform-commission lifecycle.
- No proven cross-account split execution driven by service chains.
- No refund or payment-reversal lifecycle exists.

`payment_splits` classification: **dormant/shared financial foundation — no current ecosystem settlement or
platform-commission workflow.** It must not be described as implemented commission support.

### Directional cross-account finance matrix

| Pair | A invoices B | B invoices A | Classification |
|---|---|---|---|
| P01 Stable ↔ Clinic | No | No | no current financial integration |
| P02 Stable ↔ Lab | No cross-tenant issuance | No cross-tenant issuance | generic finance only |
| P03 Stable ↔ Academy | No | No | no current financial integration |
| P04 Stable ↔ Pharmacy | No | No | no current financial integration |
| P05 Stable ↔ Transport | No | No | no current financial integration |
| P06 Stable ↔ Auction | No | No | no current financial integration |
| P07 Stable ↔ Owner | Yes (tenant-local) | No | Stable-mediated rebilling / generic finance only |
| P08 Stable ↔ Trainer | No | No | no current financial integration |
| P09 Stable ↔ Doctor | No | No | no current financial integration |
| P10 Clinic ↔ Lab | No cross-tenant issuance | No cross-tenant issuance | generic finance only |
| P11 Clinic ↔ Academy | No | No | no current financial integration |
| P12 Clinic ↔ Pharmacy | No | No | no current financial integration |
| P13 Clinic ↔ Transport | No | No | no current financial integration |
| P14 Clinic ↔ Auction | No | No | no current financial integration |
| P15 Clinic ↔ Owner | No | No | no current financial integration |
| P16 Clinic ↔ Trainer | No | No | no current financial integration |
| P17 Clinic ↔ Doctor | No | No | no current financial integration |
| P18 Lab ↔ Academy | No | No | no current financial integration |
| P19 Lab ↔ Pharmacy | No | No | no current financial integration |
| P20 Lab ↔ Transport | No | No | no current financial integration |
| P21 Lab ↔ Auction | No | No | no current financial integration |
| P22 Lab ↔ Owner | No | No | no current financial integration |
| P23 Lab ↔ Trainer | No | No | no current financial integration |
| P24 Lab ↔ Doctor | No cross-tenant issuance | No cross-tenant issuance | generic finance only |
| P25 Academy ↔ Pharmacy | No | No | no current financial integration |
| P26 Academy ↔ Transport | No | No | no current financial integration |
| P27 Academy ↔ Auction | No | No | no current financial integration |
| P28 Academy ↔ Owner | Yes (tenant-local) | No | generic finance only |
| P29 Academy ↔ Trainer | No | No | no current financial integration |
| P30 Academy ↔ Doctor | No | No | no current financial integration |
| P31 Pharmacy ↔ Transport | No | No | no current financial integration |
| P32 Pharmacy ↔ Auction | No | No | no current financial integration |
| P33 Pharmacy ↔ Owner | No | No | no current financial integration |
| P34 Pharmacy ↔ Trainer | No | No | no current financial integration |
| P35 Pharmacy ↔ Doctor | No | No | no current financial integration |
| P36 Transport ↔ Auction | No | No | no current financial integration |
| P37 Transport ↔ Owner | No | No | no current financial integration |
| P38 Transport ↔ Trainer | No | No | no current financial integration |
| P39 Transport ↔ Doctor | No | No | no current financial integration |
| P40 Auction ↔ Owner | No | No | no current financial integration |
| P41 Auction ↔ Trainer | No | No | no current financial integration |
| P42 Auction ↔ Doctor | No | No | no current financial integration |
| P43 Owner ↔ Trainer | No | No | no current financial integration |
| P44 Owner ↔ Doctor | No | No | no current financial integration |
| P45 Trainer ↔ Doctor | No | No | no current financial integration |

## 28. Multi-Party Billing and Settlement

| Scenario | Implemented | Only theoretically possible | Notes |
|---|---|---|---|
| Owner pays Stable; Stable pays Laboratory | Owner→Stable leg only | Stable→Lab leg | No cross-tenant issuance |
| Owner pays Laboratory directly | No | Yes | No owner ordering route |
| Stable pays Clinic and rebills Owner | Rebilling is tenant-local manual composition | Cross-tenant leg | No provider payable across tenants |
| Doctor invoices Owner directly | Tenant-local only | Cross-tenant | No route |
| Pharmacy invoices Stable or Owner | No | Yes | No pharmacy lifecycle |
| Auction charges seller and buyer | No | Yes | No auction lifecycle |
| Transport invoices Auction / Stable / Owner | No | Yes | No transport lifecycle |
| Academy pays Trainer | No | Yes | No engagement object |
| Platform commission or split | No | `payment_splits` exists but is dormant | Not commission support |

Duplicate-billing prevention across tenants is **not implemented**, because no cross-tenant billing exists to
duplicate. Within a tenant, invoice item attribution and boarding-period tracking prevent duplicate charging.
VAT is layered (tenant → service → invoice). Refund/reversal is absent. Statements are tenant-local.

## 29. Cross-Account Notifications

| Event class | Coverage | Notes |
|---|---|---|
| Connection request / acceptance / rejection / expiry / revoke | Meaningful support | Strongest notification layer |
| Hosted-horse Service Request | Supported | Owner ↔ Stable |
| Movement / admission | Partial | May surface selected internal operational change to the Owner |
| Laboratory request-layer events | Partial | Request submission and progress |
| Laboratory final result | **No complete governed lifecycle** | Delivery is projection/token based |
| Invitations | Email-only paths in places | Not a full in-app lifecycle |
| Ownership change | Email-only paths in places | Partial |
| Consent grant / revoke | **None** | Notification gap |
| Boarding Contract lifecycle | Incomplete | Gap |
| Horse-access grant / replacement / revoke | **None confirmed** | Gap |
| Provider preference | **None** | Provider is never notified |
| Clinic / Doctor / Academy / Pharmacy / Transport / Auction pair events | **No complete governed lifecycles** | Gap |
| Invoice / payment | Tenant-local | No cross-tenant notification |
| Public share | Partial | Audit exists; notification does not |

Each notification carries a source event, sender workspace identity, recipient, channel, in-app record and
localization; push and email availability vary by event family.

## 30. Revocation and Post-Revocation Visibility

| Mechanism | Future access | Current in-flight access | Finalized records | Invoices / payments | Snapshots | Audit |
|---|---|---|---|---|---|---|
| Invitation revoke | Blocked | n/a | n/a | n/a | n/a | Retained |
| Connection revoke | Blocked | Blocked on next read | Retained | Retained | Retained | Retained |
| Consent revoke | Blocked | Blocked on next read | Retained | Retained | Retained | Retained |
| Horse-access revoke / replacement | Blocked | Blocked on next read | Retained | Retained | Retained | **Not covered** |
| Delegation revoke | Blocked | Blocked | Retained | Retained | Retained | `delegation_audit_log` |
| Ownership transfer | Reassigned | n/a | Retained | Retained | Retained | `horse_ownership_history` |
| Public share revoke | Blocked | **SharedMedia signed URLs may remain valid up to 3600 seconds** | Retained | n/a | Retained | Retained |
| Boarding contract end / checkout | Hosting closed | n/a | Retained | Retained | Retained | `boarding_status_history` |
| Membership removal | Blocked | Blocked | Retained | Retained | Retained | Retained |

Revocation is generally **forward-looking**. Connection revocation does not delete authoritative records. Consent
revocation does not erase prior lawful records. Horse-access revocation blocks future governed access but does not
erase history. Reconnecting or regranting requires a new current relationship.

## 31. Transitive Authority and Privilege Leakage

Connection, consent and horse-access checks are **single-edge**. No tested relationship automatically grants A access
to C through B.

| # | Tested chain | Result |
|---|---|---|
| T01 | Stable → Laboratory → Clinic | Blocked in testing |
| T02 | Horse Owner → Stable → Doctor | Blocked in testing |
| T03 | Horse Owner → Stable → Laboratory | Blocked in testing |
| T04 | Clinic → Laboratory → Horse Owner | Blocked in testing |
| T05 | Doctor → Laboratory → Stable | Blocked in testing |
| T06 | Academy → Trainer → Horse Owner | Blocked in testing |
| T07 | Auction → Clinic → Laboratory | Blocked in testing |
| T08 | Transport → Stable → Horse Owner | Blocked in testing |

**Canonical wording:** *No transitive authority was demonstrated in the tested relationship chains. One residual
security-verification question remains concerning resource-ID expansion inside `get_granted_data`.*

That residual is recorded for separate Skill 05 (RLS / access enforcement) investigation. This document does **not**
claim that all transitive access is conclusively impossible.

## 32. Cross-Tenant RLS and RPC Authority

| Object | RLS | Write path | Validation observed |
|---|---|---|---|
| `connections` | Enabled | RPC-only (`create_connection_request`, `accept_connection`, `reject_connection`, `revoke_connection`) | Actor, tenant, token, duplicate-partnership index |
| `connection_messages` | Enabled | Scoped writes | Connection membership |
| `connection_rate_limits` | Enabled | System | Rate control |
| `consent_grants` | Enabled | RPC-only (`create_consent_grant`, `revoke_consent_grant`) | Connection dependency, grantor tenant, resource scope |
| `connection_horse_access` | Enabled | **Direct frontend delete + insert** | Connection scope; no expiry; no notification |
| `sharing_audit_log` | Enabled | System/trigger | Actor and target tenant scoping |
| `horse_shares` / `horse_share_packs` | Enabled | Scoped | Horse authority |
| `horse_owner_access_grants` | Enabled | Scoped | Owner authority |
| `owner_delegations` / `delegation_scopes` | Enabled | Scoped | Owner authority; audited |
| `owner_claim_requests` / `owner_claim_events` | Enabled | RPC + token | Identity verification |
| `party_horse_links` | Enabled | Scoped | Tenant scope |
| `horse_ownership` / `horse_ownership_history` | Enabled | Scoped + history trigger | Ownership authority |
| `boarding_contracts` / `boarding_admissions` / `boarding_status_history` | Enabled | RPC + scoped | Tenant + horse scope |
| `service_requests` / `service_request_events` | Enabled | Scoped | Owner ↔ hosting Stable |
| Laboratory objects (`lab_requests`, `lab_submissions`, `lab_samples`, `lab_results`, `lab_events`, `lab_horses`, share objects) | Enabled | RPC + scoped | Requester tenant, lab tenant, request scope |
| Doctor objects (`doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_services`) | Enabled | Scoped | Tenant-local |
| Vet objects (`vet_visits`, `vet_treatments`, `vet_medications`, `vet_events`, `vet_followups`) | Enabled | Scoped | Tenant-local |
| Academy objects (`academy_sessions`, `academy_bookings`, `academy_booking_consumption`) | Enabled | Scoped | Tenant-local |
| Client / token objects (`media_share_links`, report shares) | Enabled | RPC + token | Token scope; signed-URL TTL |
| Finance objects with cross-tenant relevance (`invoices`, `invoice_items`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `payment_splits`) | Enabled | RPC-only for state-changing paths | Tenant, actor, idempotency, advisory locks; `search_path` hardened on finance functions |

Broad `anon` table-level `SELECT` grants exist on several tables (for example `connections`, `lab_results`) and are
**neutralized by RLS**. They are recorded as **defense-in-depth debt**, not as a proven live leak.

## 33. Audit and History Coverage

| Domain | Audit foundation | Gap |
|---|---|---|
| Sharing | `sharing_audit_log` | — |
| Delegation | `delegation_audit_log` | — |
| Ownership | `horse_ownership_history` | — |
| Connection lifecycle | Triggers + audit | — |
| Service Requests | `service_request_events` | — |
| Laboratory samples / results | `lab_events` | — |
| Boarding | `boarding_status_history` | — |
| Document lifecycle | Document events | — |
| Consent changes | — | **No complete audit coverage** |
| `connection_horse_access` replacement | — | **No audit and no notification** |
| Provider selection | — | **No audit** |
| Cross-account finance chains | — | **No orchestration audit** (no chains exist to audit) |

## 34. Planned-Type Integration Readiness

All 33 planned-involving pairs are registered in §12 and are classified `planned`. No planned relationship is
currently operational.

| Planned type | Required integration foundation | Blocker |
|---|---|---|
| Farrier | `tenant_type` value; visit/cycle scheduling object; per-horse access; hoof-record ownership; tenant-local finance; connection + service notifications; forward-looking revocation; AR/EN + mobile surfaces | No enum value; no scheduling or service-delivery lifecycle object |
| Professional Rider | `tenant_type` value; engagement/assignment object per horse and event; per-horse access; ride-record ownership; finance; notifications; revocation; AR/EN + mobile | No enum value; no engagement lifecycle object |
| Jockey | `tenant_type` value; race-booking object with licence-bound assignment; per-horse access; ride-record ownership; finance; notifications; revocation; AR/EN + mobile | No enum value; no booking lifecycle object |

Reusable current foundations for all three: `connections`, `consent_grants`, `connection_horse_access`, tenant-local
Finance, and the notification framework.

## 35. Failure, Dead-End and Recovery Register

| # | Pair / chain | Failure | Frontend result | Backend result | Recovery |
|---|---|---|---|---|---|
| F01 | Most pairs | Accepted connection with no destination workflow | Partner appears connected; no action available | Edge row exists | None required; feature gap |
| F02 | Stable ↔ Doctor | Horse access granted with no request object | Access visible; nothing to initiate | Access rows exist | Out-of-band coordination |
| F03 | Owner ↔ Lab | No owner ordering route | No entry point | — | Order through a Stable, Clinic or Doctor |
| F04 | Any provider pair | Provider preference does not notify or bind | Preference saved silently | Informational row | Manual contact |
| F05 | Stable ↔ Lab | Provider cannot invoice requester across tenants | No cross-tenant invoice UI | No object | Manual invoice in each tenant |
| F06 | Owner ↔ Stable | Internal operational change surfaces without governed release | Owner sees projected state | Projection returns it | Governed release model required (§26) |
| F07 | Any share | Signed URL survives revocation ≤3600s | Link still works | TTL not revocable | Wait out TTL |
| F08 | Consent | Revocation and grant emit no notification | Silent | Row updated | Manual communication |
| F09 | Horse access | Delete-then-insert replacement loses no history because none is kept | Silent | Rows replaced | Audit foundation required |
| F10 | Academy ↔ Owner | Booking has no governed completion | Booking stays open-ended | No status transition | Manual closure |
| F11 | Pharmacy / Transport / Auction chains | Chain breaks at the provider edge | No provider surface | No lifecycle object | Out-of-platform handling |
| F12 | Multi-party chains | Chain breaks at one edge and the rest cannot proceed | Partial progress | Partial records | Manual continuation |

## 36. Test-Coverage Findings

| Workflow area | Unit | Component | Integration | SQL | Authorization / RLS | E2E | Verdict |
|---|---|---|---|---|---|---|---|
| Connection lifecycle (all directions) | — | — | — | — | — | — | Absent |
| Consent lifecycle | — | — | — | — | — | — | Absent |
| Horse access layers | — | — | — | — | — | — | Absent |
| Ownership / custody | — | — | — | — | — | — | Absent |
| Stable ↔ Owner | — | — | — | — | — | — | Absent |
| Stable ↔ Lab | — | — | — | — | — | — | Absent |
| Clinic ↔ Lab / Doctor ↔ Lab | Partial (lab invoice draft RPC cutover) | — | — | — | — | — | Near-absent |
| Owner ↔ Clinic / Owner ↔ Doctor | — | — | — | — | — | — | Absent |
| Transport / Pharmacy / Academy ↔ Trainer | — | — | — | — | — | — | Absent |
| Provider preference | — | — | — | — | — | — | Absent |
| Multi-party chains | — | — | — | — | — | — | Absent |
| Revocation | — | — | — | — | — | — | Absent |
| Transitive access | — | — | — | — | — | — | Absent |
| Cross-account finance | Present (finance unit + SQL harnesses) | — | — | Present | — | — | Finance-scoped only |
| Notifications | — | — | — | — | — | — | Absent |
| Audit | — | — | — | — | — | — | Absent |

Existing automated coverage is finance-scoped. **Cross-account authority has no automated coverage.**

## 37. Arabic, English, RTL and Mobile Findings

- Account-type labels and partner identity render bilingually; stacked bilingual identity is the standard.
- **Weakest surfaces:** requester-vs-provider direction labels, pair-specific empty states, and invoice
  issuer/recipient labelling in cross-account contexts.
- Connection status, consent scope and expiry wording must preserve exact scope meaning in Arabic; a scope label that
  is clear in English but ambiguous in Arabic is a boundary risk, not a cosmetic one.
- Multiple workspace identities and multi-party chain progress have no dedicated mobile representation.
- Numerals are Western 0–9; time is 12-hour with صباحًا / مساءً in Arabic and AM/PM in English; currency follows the
  tenant currency model.
- No visual redesign is proposed by this document.

## 38. Ecosystem Risk and Contradiction Register

| ID | Category | Pair / chain | Direction | Backend object | Finding | Impact | Severity | Active blocker | Commercial blocker | Security | Privacy | Finance | Notification | Destination | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| X-01 | visibility/privacy gap | Stable ↔ Owner | Stable → Owner | boarding / housing / movement projections | Owner visibility is curated-RPC projection with no explicit release governance | Internal operational change may surface without governed release | High | No | Yes | Low | High | No | Yes | Owner-visibility release governance workstream | High |
| X-02 | notification gap | multiple | both | notification triggers | Consent, boarding lifecycle, horse access and most pair events have no governed notification | Silent authority and state changes | Medium | No | Partial | Low | Medium | No | Yes | Notification governance workstream | High |
| X-03 | finance gap | all provider pairs | both | invoices / payment objects | No cross-tenant invoice issuance or settlement | Providers cannot bill through the platform | High | No | Yes | No | No | Yes | No | Cross-account finance workstream | High |
| X-04 | test gap | all cross-account | both | — | No automated cross-account authority coverage | Regressions undetected | Medium | No | No | Yes | Yes | Partial | Partial | QA/release workstream | High |
| X-05 | authority gap | cross-tenant tables | — | `anon` SELECT grants | Broad `anon` table grants neutralized by RLS | Defense-in-depth debt only | Low | No | No | Yes | Low | No | No | Skill 05 hardening | High |
| X-06 | revocation gap | any share | outward | `media_share_links` | SharedMedia signed URLs may remain valid ≤3600s after revocation | Short post-revocation residue | Medium | No | No | Yes | Yes | No | No | Sharing hardening | High |
| X-07 | incomplete integration | all provider pairs | both | provider preference | Preference produces no operational assignment | Users may assume a provider was engaged | Medium | No | Yes | No | No | No | Yes | Provider assignment workstream | High |
| X-08 | incomplete integration | most pairs | both | `connections` | Generic connections with no destination workflow | Connected but inoperable | Medium | No | Yes | No | No | No | No | Per-pair lifecycle workstreams | High |
| X-09 | audit gap | consent | — | `consent_grants` | No complete consent-change audit | Authority changes untraceable | Medium | No | No | Yes | Yes | No | Yes | Audit coverage workstream | High |
| X-10 | audit gap | horse access | — | `connection_horse_access` | Delete-then-insert replacement with no audit and no notification | Access changes untraceable and silent | Medium | No | No | Yes | Yes | No | Yes | Audit coverage workstream | High |
| X-11 | transitive-access risk | consent chains | — | `get_granted_data` | Residual question on resource-ID expansion scope | Unverified boundary | Medium | No | No | Yes | Yes | No | No | Skill 05 investigation | Medium |
| X-12 | finance gap | platform | — | `payment_splits` | Dormant shared foundation, no settlement or commission workflow | Architectural ambiguity | Low | No | No | No | No | Yes | No | Finance architecture decision | High |
| X-13 | commercial-overclaim risk | Pharmacy / Transport / Auction / Trainer | both | — | Workspace types exist without provider lifecycles | Overclaim in sales material | High | No | Yes | No | No | No | No | Commercial governance | High |

Severity reflects impact, not mere incompleteness.

## 39. Current Integration Maturity Verdicts

| Verdict | Pairs |
|---|---|
| `end-to-end-integrated` | **None** |
| `operational-partial` | Stable ↔ Laboratory; Stable ↔ Horse Owner; Veterinary Clinic ↔ Laboratory; Laboratory ↔ Independent Veterinarian |
| `horse-access-foundation-only` | Stable ↔ Independent Veterinarian; Horse Owner ↔ Independent Veterinarian |
| `consent-foundation-only` | Veterinary Clinic ↔ Horse Owner |
| `public-token-only` / `view-only` | Laboratory ↔ Horse Owner (directionally separated) |
| `request-only` | Training Academy ↔ Horse Owner |
| `placeholder` | Auction ↔ Horse Owner; Auction ↔ Independent Trainer; Auction ↔ Independent Veterinarian |
| `connection-foundation-only` | Stable ↔ Clinic; Stable ↔ Academy; Stable ↔ Pharmacy; Stable ↔ Transport; Stable ↔ Trainer; Clinic ↔ Doctor; Lab ↔ Academy; Lab ↔ Trainer; Academy ↔ Trainer; Owner ↔ Trainer; plus all same-type pairs except Owner ↔ Owner |
| `not-applicable` | Horse Owner ↔ Horse Owner (as a workspace connection) |
| `no-current-direct-integration` | All remaining current pairs listed in §10 |
| `planned` | All 33 planned-involving pairs |

## 40. Future Security and Remediation Destinations

Recorded as destinations only; nothing is remediated by this document.

1. **Skill 05 (RLS / access enforcement)** — confirm `get_granted_data` cannot expand requested resource IDs beyond
   the grantor tenant and grant scope.
2. **Finance architecture** — determine whether `payment_splits` will remain unused, support provider settlements, or
   support a future platform-commission model.
3. Owner-visibility release governance design.
4. Cross-account notification governance.
5. Consent and horse-access audit coverage.
6. Cross-account automated test coverage.
7. `anon` grant narrowing (defense-in-depth).
8. Signed-URL revocation residue.

Neither residual question is resolved by assumption in this document.

## 41. Scope Boundaries

This document does not: design or implement the owner-visibility release mechanism; remediate `get_granted_data`;
implement payment splits or commission logic; modify application source, migrations, generated types, database
objects, RLS, functions, triggers, permissions, account-type enums, routes, navigation, capabilities, connections,
consent, horse access, owner visibility, provider preference, notifications, finance or Community; or supersede any
accepted baseline document.

## 42. Final Canonical Statement

Dayli Horse is documented as **10 current implemented account/workspace types**, **3 planned account/workspace
types** and **13 approved target account/workspace types**, forming a many-to-many ecosystem of **45 current unique
cross-type pairs**, **90 current directional relationship paths**, 10 same-type relationship assessments, 78 total
target unique pairs and **33 planned-involving pairs**.

No current pair is `end-to-end-integrated`. The strongest current integrations are `operational-partial`. Generic
connection primitives are type-agnostic and prove connectability, never operability. Owner visibility is
`partially implemented — curated-RPC projection`, which is protective but is **not** the intended final governance
model; the target remains `explicit owner-visibility release governance`. No transitive authority was demonstrated in
the tested relationship chains, with one residual `get_granted_data` verification question outstanding.
