# AML.1.b.1 — PLAN-LOCK Restoration (Scoped Build Turn)

## Preflight (already verified this turn, read-only)

- External source: `user-uploads://AML.1.b.1-PLAN-LOCK-FINAL-CORRECTED_1.md`
- Byte-exact SHA-256: `8d2b1cc1927d231e18237cb79132f1b703c96c91dabad111883a144d56f7dae8` — **MATCH** with the authoritative hash you supplied.
- Line count: 1,088.
- Target path `docs/aml_1_b_1/PLAN_LOCK.md` does not currently exist (would be a new file).

## Authorized scope

**Exactly one file write:** create `docs/aml_1_b_1/PLAN_LOCK.md`.

No other file created, edited, moved, deleted, or reformatted. No database call. No migration. No changes to `STAGE_06_EXECUTION_SPEC.md`. No Stage 3 / Stage 4 / Batch D.2 restoration. No D.3R. No D.4. No plan artifact beyond this one.

## Composition (byte-precise)

The composite file is built in exactly two segments concatenated in order, no silent editing of either:

1. **Segment 1 — Verified source body (bytes 1..end of upload).** Copied verbatim from the verified upload. No reflow, no header rewrite, no line-ending change, no trimming. Ends with the source file's final newline.
2. **Segment 2 — Post-PLAN-LOCK User Authority Addendum.** Appended below a clearly delimited fence. Contains only the already-approved U-1, U-2, U-3 locks + Batch D.2 identity confirmation + retained unavailable-artifact identifiers + the explicit `ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED` marker. Text is transcribed verbatim from the user's authorization message (§§2–7). No ordered adapter signatures invented. No historical body edits.

Addendum skeleton (verbatim transcription of the approved locks — no synthesis):

```text
================================================================
POST-PLAN-LOCK USER AUTHORITY ADDENDUM
Appended by scoped restoration build turn.
Source PLAN-LOCK body above is preserved byte-for-byte
(SHA-256 8d2b1cc1927d231e18237cb79132f1b703c96c91dabad111883a144d56f7dae8).
This addendum records approved user authority U-1, U-2, U-3
plus Batch D.2 identity confirmation and retained
unavailable-artifact identifiers. It does not alter the body.
================================================================

## U-1  Six canonical adapter identities
{verbatim §2 of authorization message, including the superseded
non-canonical list and the explicit note that ordered argument
lists are NOT authorized here}

## U-2  Twelve canonical payload-contract identities
{verbatim §3, including the twelve numbered identities and the
explicit prohibition on shared-schema shortcuts}

## U-3  Invoice-number helper and Saudi business-date policy
{verbatim §4, including the exact helper signature
_finance_invoice_number_next(uuid, text), the Asia/Riyadh
business-date derivation rules, and the explicit prohibitions}

## Ordered adapter arguments
ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED
{verbatim §5 prohibitions on p_invoice_number, p_extra jsonb,
caller-supplied totals/identities, and unproven arguments}

## Batch D.2 identity confirmation
{verbatim §6, including transcript SHA
064ab352b57875bf98cdbce66110ed1d6d6c673b63b58a098300212a7d5d24cd
and the pre/post spec hashes 947e111c… → f297d685…}

## Retained unavailable artifacts
- STAGE_3_CLOSURE_ARTIFACT_UNAVAILABLE
- STAGE_4_CLOSURE_ARTIFACT_UNAVAILABLE
- BATCH_D2_IDENTITY_CONFIRMED_EXTERNAL_SOURCE_NOT_YET_RESTORED
   (reclassified from BATCH_D2_ARTIFACT_UNVERIFIED per §7)
================================================================
END POST-PLAN-LOCK USER AUTHORITY ADDENDUM
================================================================
```

Every `{verbatim …}` region is replaced during the write with the exact text from your authorization message — no paraphrase, no reordering, no invention.

## Execution steps (build mode)

1. Recompute SHA-256 of `/mnt/user-uploads/AML.1.b.1-PLAN-LOCK-FINAL-CORRECTED_1.md`; abort if it is not `8d2b1cc1927d231e18237cb79132f1b703c96c91dabad111883a144d56f7dae8`.
2. Concatenate Segment 1 (byte-exact source) + Segment 2 (addendum built from verbatim §§2–7 of the authorization message) into `docs/aml_1_b_1/PLAN_LOCK.md`. Use a shell `cat` + heredoc redirection so Segment 1 is not touched by any editor. Exactly one repository file created.
3. Run `git status --porcelain` and confirm the only entry is `A  docs/aml_1_b_1/PLAN_LOCK.md`.
4. Compute and print: verified external-source SHA (recomputed), final composite line count (`wc -l`), byte count (`wc -c`), and SHA-256 of the final composite file.
5. Emit end-of-turn manifest with the eight confirmations required by §8 of your authorization.
6. Stop. No D.3R, no D.4, no spec edits, no DB access.

## Guarantees

- Only file changed: `docs/aml_1_b_1/PLAN_LOCK.md` (new).
- No `supabase--migration`, no DB tool of any kind, no source/config/permission edits, no other repo writes.
- Historical body preserved byte-for-byte; authority is added strictly by append.
- No ordered adapter signatures invented; `ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED` retained.
- U-1 / U-2 / U-3 present as verbatim transcriptions.

Approve to switch to build mode and execute exactly the steps above.
