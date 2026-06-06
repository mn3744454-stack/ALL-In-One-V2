
# B2.5e Implementation Plan — Contracts Document System

This is a single coherent execution with internal stages. The full report (Section 19) will be delivered after implementation. Below is the concise plan you asked for before I touch code.

## Skills applied (and why)

- **01 Launch Controller** — aggregator for the release scope.
- **02 Feature Depth** — templates/documents are real, not stubs; Training/Reproduction truthfully labeled "template-ready, workflow not connected".
- **03 Workflow Completeness** — full lifecycle: draft → sent → approved/rejected → archived, with event log.
- **04 Tenant Isolation** + **05 RLS Safety** — every new table tenant-scoped; document visibility via boarding `connections` for owner-side; no cross-tenant leakage.
- **06 API/RPC Hardening** — atomic SECURITY DEFINER RPCs for publish-version, freeze-snapshot+send, approve, reject, clone.
- **07 TS/React** — hooks + typed JSON model shared with viewer.
- **08 Schema/Migration Safety** — new tables only; no edits to `boarding_contracts` columns; nullable FK link.
- **09 Design System** — semantic tokens only; reuse shadcn primitives.
- **10 UX Flow** — Templates and Documents tabs inside `/dashboard/contracts`; type filter; clear empty/locked states.
- **11 Content Truth** — "Approval / اعتماد", "Snapshot / نسخة ثابتة"; never "legal signature".
- **12 Bilingual/RTL** — JSON carries `dir` and bilingual fields; logical CSS only.
- **16 Customer Mgmt** — owner-side reviewer = owner tenant on the linked boarding contract's `connection`.
- **22 Internal Permissions** — 13 new `contracts.*` permission keys integrated with `has_permission()`.
- **23 Reliability** — react-query invalidation on lifecycle events.
- **24 Mobile/PWA** — viewer is mobile-first; editor warns on small screens but doesn't break.
- **25 QA** — QA map delivered in final report.
- **26 Skill Network Governance** — no Skill artifact edits.

**Skill 19 Billing** — display contract prices/plan values inside variables only; no invoices, ledger, or payments are touched.

## Architecture decisions

- Reuse the Tiptap stack already installed for the B2.5d.3 prototype (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`). No new package installs unless a build break appears.
- Reuse the prototype's JSON shape (`src/contracts/prototype/contractDocTypes.ts`) → promote into `src/contracts/docModel/` as the production source of truth. Prototype route stays but imports from the promoted module.
- Viewer (`ContractDocumentViewer`) stays pure-JSON, no Tiptap dependency — exactly as proved in the prototype.
- Boarding ↔ document linkage via nullable `boarding_contract_id` on `contract_documents` (no changes to `boarding_contracts`).

## Schema (one migration)

Tables (all tenant-scoped, with full GRANT block + RLS + triggers):

1. `contract_templates` — family record per tenant.
2. `contract_template_versions` — immutable on publish; one current `published` per template enforced by partial unique index.
3. `contract_documents` — instance with `document_json` (editable) + `snapshot_json` (immutable after send); nullable `boarding_contract_id`, `recipient_tenant_id` (owner side).
4. `contract_document_events` — audit trail.

Enums: `contract_type` (boarding/training/reproduction/custom), `contract_template_status`, `contract_document_status`, `contract_document_event_type`.

## RLS (Level 3 on all four tables)

- Templates / versions: visible & writable only to members of `tenant_id` with the matching `contracts.templates.*` permission via `has_permission()`. No anon. No cross-tenant.
- Documents: visible to (a) stable side = `tenant_id` members with `contracts.documents.view`, **or** (b) `recipient_tenant_id` members **only when** `status IN ('sent_for_review','approved','rejected','archived')`. Owner side is read-only on body; approve/reject goes through RPC.
- Events: visible to anyone who can see the parent document.
- All mutations go through SECURITY DEFINER RPCs that re-check permissions and connection eligibility.

## Permissions (13 new keys, seeded into `permission_definitions`)

`contracts.templates.{view,create,edit,publish,archive}`,
`contracts.documents.{view,create,edit,send,approve,reject,archive,export}`.

Manager role baseline auto-grants per existing memory rule (all except `admin.permissions.delegate`).

## RPCs (atomic)

Templates: `create_contract_template`, `save_contract_template_draft`, `publish_contract_template_version`, `archive_contract_template`, `clone_contract_template`.

Documents: `create_contract_document_from_template`, `create_contract_document_blank`, `save_contract_document_draft`, `send_contract_document_for_review` (freeze snapshot + resolve variables + insert event + status flip — all in one tx; rejects if any required variable is missing), `approve_contract_document`, `reject_contract_document`, `archive_contract_document`, `clone_contract_document_as_template`.

Boarding bridge: `link_contract_document_to_boarding_contract` (sets `boarding_contract_id` + `recipient_tenant_id` = owner tenant of that contract; validates membership).

## Frontend

New tabs in `/dashboard/contracts` (top-level switch, not inside Boarding tab):
- **Contracts** (existing tab content — Boarding list, unchanged)
- **Templates** — list, type filter, status badge, create/edit/publish/clone/archive
- **Documents** — list, filters, lifecycle actions, snapshot viewer, event history

New routes (kept inside `/dashboard/contracts` URL space):
- `/dashboard/contracts/templates/:id/edit` — Tiptap editor (desktop-first)
- `/dashboard/contracts/templates/:id/preview` — viewer with sample data
- `/dashboard/contracts/documents/:id` — viewer + lifecycle actions + event log
- `/dashboard/contracts/documents/:id/edit` — Tiptap editor for draft only

Boarding integration:
- In existing `BoardingContractDetailsSheet`, add an **"Contract Document / مستند العقد"** section with actions: **Generate from template** / **View document** (when linked). No change to existing actions/approval gates.

Print/export:
- "Print / طباعة" button on viewer triggers a print-friendly route (`?print=1`) with `@media print` styles. No PDF library added; residual flagged.

## Files (high level)

New:
- `supabase/migrations/<ts>_contracts_document_system.sql`
- `src/contracts/docModel/{types.ts,renderViewer.tsx,sampleData.ts,variables.ts}`
- `src/contracts/editor/{ContractDocumentEditor.tsx,variableNodes.ts,toolbar.tsx}` (promoted from prototype)
- `src/contracts/templates/{TemplatesTab.tsx,TemplateList.tsx,TemplateFormDialog.tsx,useContractTemplates.ts}`
- `src/contracts/documents/{DocumentsTab.tsx,DocumentList.tsx,DocumentViewerPage.tsx,DocumentEditorPage.tsx,DocumentEventLog.tsx,useContractDocuments.ts}`
- `src/contracts/boarding/BoardingContractDocumentSection.tsx`
- `src/pages/{ContractTemplateEditorPage,ContractDocumentEditorPage,ContractDocumentViewerPage}.tsx`

Edited:
- `src/pages/DashboardContracts.tsx` — add Templates/Documents top tabs
- `src/contracts/types/boarding/BoardingContractDetailsSheet.tsx` — add document section
- `src/App.tsx` — add new routes (auth-protected)
- `src/i18n/locales/{en,ar}.ts` — new strings
- `src/contracts/prototype/contractDocTypes.ts` — re-export from promoted module (keeps prototype working)

## What will NOT change

- `boarding_contracts` schema and all existing boarding RPCs/RLS/UI.
- B2.4 owner hosted horses.
- B3 / lab / vet / billing / HR / breeding operational flows.
- Existing ViewSwitcher / details sheet actions and confirmations.
- `breeding_contracts` is **not** auto-surfaced under Reproduction templates.

## Known residuals (flagged up front)

- Contract PDF hardening (real PDF generation lib).
- Legal e-signature.
- Version diff / amendment UI.
- Training & Reproduction operational workflows.
- Shared cross-tenant contracts data model (still deferred).

## Stop conditions actively checked

I will halt and report instead of pushing forward if: (a) Tiptap install/build breaks, (b) a safe RLS expression for owner-side document visibility cannot be written against existing `connections` / `boarding_contracts`, (c) `boarding_contracts` would need column changes, (d) any existing Boarding flow regresses.

---

**Scale note (honest):** this is a large, multi-stage change — migration + 13 permissions + ~10 RPCs + editor/viewer/template/document UI + boarding bridge. I will execute it in one coherent pass but it will take many tool calls and the migration will require your approval before any code that depends on the new schema can land. After you approve this plan I will start with the migration.
