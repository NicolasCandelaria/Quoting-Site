# Art approval workflow — design spec (v1)

**Date:** 2026-04-16  
**Status:** Approved for implementation planning  
**Stack context:** Next.js 15, React, Supabase, Tailwind. Existing admin route placeholder: `app/admin/art-approvals/page.tsx`.

## 1. Goal

Enable **account managers** to run the company’s **art approval workflow** inside this application: create a standalone approval package, coordinate **designer** deliverables, send a **client** review link, and capture a **formal decision** with audit fields. Replace ad-hoc email + zip handoffs where this product owns the process.

## 2. Decisions (locked for v1)

| Topic | Decision |
|--------|----------|
| Client access | **No client accounts.** Access via **unguessable review link** plus **email OTP** sent only to **allowlisted** addresses. |
| Package anchoring | **Mostly standalone** `Art Approval` entity. **Optional** link to an existing **Project** (and optionally line/item) for reporting only—not required to create or complete a review. |
| Client outcomes | Two **formal** paths only: **Approved** and **Changes requested**. (No separate “hard reject” path in v1 unless product maps it to *Changes requested*.) |
| Approval attestation | **Verified email** (from OTP) + **typed full name** + explicit **“I approve”** confirmation + **timestamp**. Optional later: IP / user-agent for support. |
| Changes requested | Same OTP-verified email context; client submits **changes requested** with **required written feedback** (and attestation fields aligned with approve: **typed full name** + explicit confirmation control, e.g. **“Submit changes request”**) + **timestamp**. |
| Architecture | **Single-package + linear status machine** (Approach 1), with a **revision / round** counter or equivalent so AM/designer can iterate after *Changes requested* without full “published snapshot” versioning in v1. |

## 3. Non-goals (v1)

- Client login, SSO, or drawn signatures.  
- Third-party e-sign vendors (DocuSign, etc.).  
- Immutable published snapshots per revision (may be a v2 enhancement).  
- Automated email ingestion from forwarded threads (AM creates records in-app).

## 4. Roles and responsibilities

- **Account manager (internal):** Creates `Art Approval`, sets job metadata, **allowlisted client emails**, tracks status, marks **ready for client**, copies **client link**, monitors outcomes.  
- **Designer (internal):** Uploads artwork / files, completes **structured form fields** (mirror existing company art approval form as closely as practical in v1—exact field list to be captured during implementation from current template).  
- **Client (external):** Opens link → enters email → **OTP** → reviews assets and summary → chooses **Approved** or **Changes requested** and completes the corresponding attestation flow.

## 5. Status model (v1)

Statuses are linear with pragmatic branches; exact naming can match UI copy.

Suggested states:

1. **Draft** — AM creating package; not yet sent to designer or incomplete.  
2. **With designer** — Designer owns uploads / form completion.  
3. **Ready for client** — AM has released to client; **client link** is active; OTP gate enforced.  
4. **Approved** — Terminal; client chose **Approved**; record locked for client actions (internal may archive or clone for new round if business requires—product rule: prefer **new revision** vs editing terminal state).  
5. **Changes requested** — Client submitted **Changes requested**; package returns to internal work (**With designer** or **Draft** at AM discretion—implementation should pick one default transition, e.g. → **With designer**, AM can move back to **Draft** if needed).

**Revision / round:** Increment **round** (or `revision_number`) when returning from *Changes requested* to internal work and when re-sending to client, so history lists “Round 1, Round 2…” without full snapshot tables in v1.

## 6. Client access and security

- **Review token:** Cryptographically random, stored server-side; embedded in client URL path (e.g. `/review/<token>`—exact route TBD).  
- **Allowlist:** List of normalized email addresses on the `Art Approval`; only these addresses may request OTP for that token.  
- **OTP:** Time-limited code, rate-limited sends and attempts, single-use or short TTL per product standard.  
- **Session binding:** After OTP success, bind the browser session to **verified email** for subsequent **POST** actions (approve / changes requested).  
- **Forwarding:** Bare URL share is insufficient without OTP to an allowlisted inbox.

## 7. Data and storage (conceptual)

**Core tables (conceptual—not SQL in this spec):**

- `art_approvals` — metadata, status, round, optional `project_id` / `item_id`, review token hash (store **hash** of token, not plaintext), timestamps, owning AM user id, etc.  
- `art_approval_allowlisted_emails` — email, `art_approval_id`, normalization rules.  
- `art_approval_files` — storage object key, display name, size, mime, uploaded_by, created_at.  
- `art_approval_form_fields` — either JSON blob keyed by field id/version or normalized rows (implementation plan chooses based on form complexity).  
- `art_approval_otp_challenges` — hashed code, expiry, attempt counts, email attempted, etc.  
- `art_approval_client_decisions` — one row per decision event: `decision_type` ∈ {`approved`, `changes_requested`}, `verified_email`, `typed_full_name`, `client_comment` (nullable for approve; **required** for changes requested), `created_at`, optional IP/UA.

**Files:** Supabase Storage bucket(s) with RLS aligned to internal roles; client access to files only through **server-authorized** routes after OTP session validation (avoid public bucket URLs for artwork).

## 8. Admin UX

- Replace **Coming Soon** on `/admin/art-approvals` with **list** (filters: status, client name, AM, dates) and **detail** page with status actions, allowlist editor, designer checklist, file list, **copy client link**, decision timeline.  
- Clear visibility of **latest client decision** and **round**.

## 9. Client UX

- Steps: landing (enter email) → OTP entry → review (files + read-only summary of form) → **Approved** vs **Changes requested** → attestation screen per path → confirmation.  
- Copy should distinguish **Approve** vs **Request changes** so clients do not confuse outcomes.

## 10. Testing and acceptance (high level)

- Allowlist enforcement: non-allowlisted email cannot complete OTP.  
- OTP throttling and expiry behave correctly.  
- **Approved** requires typed full name + confirm; persists verified email + timestamp.  
- **Changes requested** requires comment + typed full name + confirm; persists verified email + timestamp.  
- Status transitions: **Ready for client** → terminal states; **Changes requested** returns work to internal state and increments **round** when re-sent (exact rule in implementation plan).  
- Unauthorized access to files without valid OTP session fails.

## 11. Open items for implementation plan (not blockers for this spec)

- Transactional email provider choice and Supabase integration (OTP delivery).  
- Exact field parity with the current PDF art approval form (field inventory).  
- Default internal status after *Changes requested* (**With designer** vs **Draft**) and whether AM must explicitly “re-open for client.”  
- Whether **Approved** / **Changes requested** rows are append-only if client acts twice in same round (should be prevented by UI + server rules).

## 12. Spec self-review (2026-04-16)

- **Placeholders:** Field inventory explicitly deferred to implementation plan; acceptable.  
- **Consistency:** Client outcomes are **Approved** + **Changes requested** only; both require formal attestation; **Changes requested** requires **required written feedback**—specified to mirror approve formality.  
- **Scope:** Single-package model + optional project link + OTP + two client paths; fits one implementation plan.  
- **Ambiguity resolved:** “Only approved/changes requested” interpreted as **two formal client paths**, not “approve only.”
