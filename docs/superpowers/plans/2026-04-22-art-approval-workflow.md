# Art Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready art approval workflow with standalone records, internal AM/designer collaboration, and client OTP-gated review outcomes for Approved and Changes Requested.

**Architecture:** Add a dedicated Art Approval domain (types, server data access, API routes, admin UI, and external review UI) on top of the existing Next.js + Supabase pattern already used for Projects. Use Supabase REST via service role for server operations, store files in Supabase Storage, and enforce client access with hashed link token + email allowlist + OTP challenge records before any decision action.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Supabase REST/Storage/Auth helpers, Tailwind CSS, Vitest.

---

## File Structure

### New files
- `db/add-art-approvals.sql`
- `lib/art-approvals/models.ts`
- `lib/server/art-approvals.ts`
- `lib/art-approvals/api.ts`
- `lib/art-approvals/validation.ts`
- `lib/art-approvals/otp.test.ts`
- `app/api/art-approvals/route.ts`
- `app/api/art-approvals/[approvalId]/route.ts`
- `app/api/art-approvals/[approvalId]/ready/route.ts`
- `app/api/art-approvals/[approvalId]/allowlist/route.ts`
- `app/api/art-approvals/[approvalId]/files/route.ts`
- `app/api/art-approvals/review/[token]/otp/request/route.ts`
- `app/api/art-approvals/review/[token]/otp/verify/route.ts`
- `app/api/art-approvals/review/[token]/decision/route.ts`
- `components/art-approvals/ArtApprovalForm.tsx`
- `components/art-approvals/ArtApprovalStatusBadge.tsx`
- `components/art-approvals/AllowlistEditor.tsx`
- `components/art-approvals/ReviewDecisionForm.tsx`
- `app/admin/art-approvals/[approvalId]/page.tsx`
- `app/review/[token]/page.tsx`

### Modified files
- `lib/api.ts`
- `lib/server/supabase-storage.ts`
- `app/admin/art-approvals/page.tsx`
- `components/AdminSidebar.tsx` (only if needed for active-state pattern updates)
- `package.json` (add explicit `test` script if missing)

### Responsibilities
- `models.ts` files hold DTOs and status unions.
- `lib/server/art-approvals.ts` centralizes Supabase CRUD, token hashing, OTP storage/verification, and status transitions.
- `app/api/art-approvals/**` owns request validation/authz for internal users and client review actions.
- `app/admin/art-approvals/**` and `components/art-approvals/**` own internal AM/designer UI.
- `app/review/[token]/page.tsx` owns external client OTP + decision UX.

---

### Task 1: Add database schema for art approvals

**Files:**
- Create: `db/add-art-approvals.sql`
- Modify: `db/supabase-schema.sql`
- Test: manual SQL execution in Supabase SQL editor

- [ ] **Step 1: Write migration SQL for new tables and indexes**

```sql
-- core approval table
create table if not exists public.art_approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  status text not null default 'draft',
  round integer not null default 1,
  optional_project_id uuid null,
  notes text null,
  review_token_hash text null,
  ready_for_client_at timestamptz null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_art_approvals_status on public.art_approvals(status);
create index if not exists idx_art_approvals_client on public.art_approvals(client_name);

create table if not exists public.art_approval_allowlisted_emails (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (art_approval_id, email)
);

create table if not exists public.art_approval_files (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  content_type text null,
  size_bytes bigint not null default 0,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.art_approval_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_art_approval_otp_lookup
  on public.art_approval_otp_challenges (art_approval_id, email, created_at desc);

create table if not exists public.art_approval_client_decisions (
  id uuid primary key default gen_random_uuid(),
  art_approval_id uuid not null references public.art_approvals(id) on delete cascade,
  round integer not null,
  decision_type text not null, -- approved | changes_requested
  verified_email text not null,
  typed_full_name text not null,
  comment text null,
  decided_at timestamptz not null default now()
);
```

- [ ] **Step 2: Add schema section to base schema file for fresh environments**

```sql
-- append references:
-- art_approvals, art_approval_allowlisted_emails, art_approval_files,
-- art_approval_otp_challenges, art_approval_client_decisions
```

- [ ] **Step 3: Run SQL in Supabase and verify creation**

Run in Supabase SQL editor: `db/add-art-approvals.sql`  
Expected: success with no missing table/extension errors.

- [ ] **Step 4: Commit**

```bash
git add db/add-art-approvals.sql db/supabase-schema.sql
git commit -m "feat: add art approval schema and indexes"
```

---

### Task 2: Add domain models and client API wrappers

**Files:**
- Create: `lib/art-approvals/models.ts`
- Create: `lib/art-approvals/api.ts`
- Modify: `lib/api.ts`
- Test: `lib/art-approvals/otp.test.ts` (imports types)

- [ ] **Step 1: Write failing type-level usage in a small test scaffold**

```ts
import { describe, expect, it } from "vitest";
import type { ArtApprovalStatus } from "./models";

describe("art approval model unions", () => {
  it("accepts approved and changes_requested statuses", () => {
    const a: ArtApprovalStatus = "approved";
    const b: ArtApprovalStatus = "changes_requested";
    expect(a).toBe("approved");
    expect(b).toBe("changes_requested");
  });
});
```

- [ ] **Step 2: Add model definitions**

```ts
export type ArtApprovalStatus =
  | "draft"
  | "with_designer"
  | "ready_for_client"
  | "approved"
  | "changes_requested";

export type ArtApprovalDecisionType = "approved" | "changes_requested";

export type ArtApproval = {
  id: string;
  title: string;
  clientName: string;
  status: ArtApprovalStatus;
  round: number;
  optionalProjectId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Add client fetch helpers**

```ts
export async function fetchArtApprovals(): Promise<ArtApproval[]> {
  const response = await fetch("/api/art-approvals", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load art approvals.");
  const body = (await response.json()) as { approvals: ArtApproval[] };
  return body.approvals;
}
```

- [ ] **Step 4: Export wrappers from `lib/api.ts`**

```ts
export {
  fetchArtApprovals,
  createArtApproval,
  updateArtApproval,
} from "@/lib/art-approvals/api";
```

- [ ] **Step 5: Run test and lint**

Run: `npm run test -- lib/art-approvals/otp.test.ts`  
Expected: PASS.

Run: `npm run lint`  
Expected: PASS (or existing unrelated warnings only).

- [ ] **Step 6: Commit**

```bash
git add lib/art-approvals/models.ts lib/art-approvals/api.ts lib/api.ts lib/art-approvals/otp.test.ts
git commit -m "feat: add art approval models and client api helpers"
```

---

### Task 3: Implement server-side art approval data layer

**Files:**
- Create: `lib/server/art-approvals.ts`
- Create: `lib/art-approvals/validation.ts`
- Modify: `lib/server/supabase-storage.ts`
- Test: `lib/art-approvals/otp.test.ts`

- [ ] **Step 1: Write failing OTP utility tests**

```ts
import { describe, expect, it } from "vitest";
import { hashOtpCode, verifyOtpCode } from "@/lib/server/art-approvals";

describe("otp helpers", () => {
  it("verifies matching otp", async () => {
    const hash = await hashOtpCode("123456");
    const ok = await verifyOtpCode("123456", hash);
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 2: Implement token/OTP hashing and validators**

```ts
import { createHash, timingSafeEqual } from "crypto";

export function hashReviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashOtpCode(otp: string): Promise<string> {
  return createHash("sha256").update(otp).digest("hex");
}

export async function verifyOtpCode(otp: string, storedHash: string): Promise<boolean> {
  const candidate = createHash("sha256").update(otp).digest("hex");
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
}
```

- [ ] **Step 3: Add CRUD and transition functions**

```ts
export async function createArtApprovalInSupabase(input: {
  title: string;
  clientName: string;
  notes?: string;
  optionalProjectId?: string;
  createdBy: string;
}) { /* insert into art_approvals and return mapped row */ }

export async function markArtApprovalReadyForClient(approvalId: string) { /* set status, token hash */ }
export async function saveClientDecision(input: {
  token: string;
  decisionType: "approved" | "changes_requested";
  verifiedEmail: string;
  typedFullName: string;
  comment?: string;
}) { /* write decision + transition status */ }
```

- [ ] **Step 4: Add storage upload helper for approval files**

```ts
export async function uploadArtApprovalFile(params: {
  approvalId: string;
  fileName: string;
  bytes: ArrayBuffer;
  contentType?: string;
}): Promise<{ storagePath: string }> { /* upload to art-approvals bucket path */ }
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- lib/art-approvals/otp.test.ts -v`  
Expected: PASS all OTP utility tests.

- [ ] **Step 6: Commit**

```bash
git add lib/server/art-approvals.ts lib/art-approvals/validation.ts lib/server/supabase-storage.ts lib/art-approvals/otp.test.ts
git commit -m "feat: implement art approval server data and otp utilities"
```

---

### Task 4: Build internal authenticated API routes

**Files:**
- Create: `app/api/art-approvals/route.ts`
- Create: `app/api/art-approvals/[approvalId]/route.ts`
- Create: `app/api/art-approvals/[approvalId]/ready/route.ts`
- Create: `app/api/art-approvals/[approvalId]/allowlist/route.ts`
- Create: `app/api/art-approvals/[approvalId]/files/route.ts`
- Test: manual API checks via browser and Network panel

- [ ] **Step 1: Write route handlers with auth guard pattern**

```ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { listArtApprovalsFromSupabase } from "@/lib/server/art-approvals";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const approvals = await listArtApprovalsFromSupabase();
  return NextResponse.json({ approvals });
}
```

- [ ] **Step 2: Add create/update, allowlist edit, ready-for-client, file upload handlers**

```ts
// POST /api/art-approvals/[approvalId]/allowlist
// body: { emails: string[] }
if (!Array.isArray(payload.emails) || payload.emails.length === 0) {
  return NextResponse.json({ error: "At least one email is required." }, { status: 400 });
}
```

- [ ] **Step 3: Validate status transition rules in API layer**

```ts
if (current.status === "approved") {
  return NextResponse.json({ error: "Approved records are read-only." }, { status: 409 });
}
```

- [ ] **Step 4: Verify with manual requests**

Run app: `npm run dev`  
Expected: routes return `401` when logged out and valid JSON when logged in.

- [ ] **Step 5: Commit**

```bash
git add app/api/art-approvals
git commit -m "feat: add internal art approval api routes"
```

---

### Task 5: Build external client OTP + decision API routes

**Files:**
- Create: `app/api/art-approvals/review/[token]/otp/request/route.ts`
- Create: `app/api/art-approvals/review/[token]/otp/verify/route.ts`
- Create: `app/api/art-approvals/review/[token]/decision/route.ts`
- Modify: `lib/server/art-approvals.ts`
- Test: `lib/art-approvals/otp.test.ts` and manual browser flow

- [ ] **Step 1: Add failing test for changes-requested comment requirement**

```ts
it("requires comment when decision is changes_requested", async () => {
  await expect(
    assertDecisionPayload({ decisionType: "changes_requested", comment: "" }),
  ).rejects.toThrow("Comment is required");
});
```

- [ ] **Step 2: Implement OTP request endpoint**

```ts
// validate token + allowlisted email
// generate 6-digit otp, store hashed with expiry
// send email (provider adapter) and return { ok: true }
```

- [ ] **Step 3: Implement OTP verify endpoint**

```ts
// compare submitted code with latest unexpired challenge
// mark consumed_at
// set signed httpOnly short-lived review cookie containing approvalId + email + round
```

- [ ] **Step 4: Implement decision endpoint**

```ts
if (payload.decisionType === "changes_requested" && !payload.comment?.trim()) {
  return NextResponse.json({ error: "Comment is required." }, { status: 400 });
}
if (!payload.typedFullName?.trim()) {
  return NextResponse.json({ error: "Full name is required." }, { status: 400 });
}
// require confirmation boolean, verify review cookie, persist decision
```

- [ ] **Step 5: Run targeted tests**

Run: `npm run test -- lib/art-approvals/otp.test.ts -v`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/art-approvals/review lib/server/art-approvals.ts lib/art-approvals/validation.ts lib/art-approvals/otp.test.ts
git commit -m "feat: add client otp and decision endpoints for art approvals"
```

---

### Task 6: Replace admin Art Approvals landing page

**Files:**
- Modify: `app/admin/art-approvals/page.tsx`
- Create: `components/art-approvals/ArtApprovalStatusBadge.tsx`
- Modify: `lib/art-approvals/api.ts`
- Test: browser UX check

- [ ] **Step 1: Build list page with load/create**

```tsx
const [approvals, setApprovals] = useState<ArtApproval[]>([]);
useEffect(() => { void loadApprovals(); }, []);
```

- [ ] **Step 2: Add quick-create form on page**

```tsx
<form onSubmit={handleCreate} className="card space-y-3">
  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
  <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
  <button className="btn-primary" disabled={saving}>{saving ? "Creating..." : "Create approval"}</button>
</form>
```

- [ ] **Step 3: Add list rows linking to detail page**

```tsx
<Link href={`/admin/art-approvals/${approval.id}`}>{approval.title}</Link>
<ArtApprovalStatusBadge status={approval.status} />
```

- [ ] **Step 4: Validate page manually**

Run: `npm run dev`  
Expected: can create and see art approval rows under `/admin/art-approvals`.

- [ ] **Step 5: Commit**

```bash
git add app/admin/art-approvals/page.tsx components/art-approvals/ArtApprovalStatusBadge.tsx lib/art-approvals/api.ts
git commit -m "feat: implement admin art approvals list and create flow"
```

---

### Task 7: Build admin art approval detail workflow

**Files:**
- Create: `app/admin/art-approvals/[approvalId]/page.tsx`
- Create: `components/art-approvals/ArtApprovalForm.tsx`
- Create: `components/art-approvals/AllowlistEditor.tsx`
- Modify: `lib/art-approvals/api.ts`
- Test: browser UX check

- [ ] **Step 1: Add failing interaction test notes (manual acceptance)**

```md
Given an approval in draft
When AM adds allowlist and clicks "Ready for client"
Then page shows ready status and reveals client link copy action.
```

- [ ] **Step 2: Implement detail page data load/update**

```tsx
const { approvalId } = useParams<{ approvalId: string }>();
const [approval, setApproval] = useState<ArtApprovalDetail | null>(null);
```

- [ ] **Step 3: Add allowlist editor and ready action**

```tsx
<AllowlistEditor emails={approval.allowlistedEmails} onSave={handleSaveAllowlist} />
<button className="btn-primary" onClick={handleMarkReady}>Mark ready for client</button>
```

- [ ] **Step 4: Add file upload section**

```tsx
<input type="file" multiple onChange={(e) => void handleUploadFiles(e.target.files)} />
```

- [ ] **Step 5: Verify end-to-end internal flow manually**

Run: `npm run dev`  
Expected: AM can edit metadata, upload files, manage allowlist, and generate copyable review URL.

- [ ] **Step 6: Commit**

```bash
git add app/admin/art-approvals/[approvalId]/page.tsx components/art-approvals/ArtApprovalForm.tsx components/art-approvals/AllowlistEditor.tsx lib/art-approvals/api.ts
git commit -m "feat: add admin art approval detail workflow"
```

---

### Task 8: Build client review page and decision UI

**Files:**
- Create: `app/review/[token]/page.tsx`
- Create: `components/art-approvals/ReviewDecisionForm.tsx`
- Modify: `lib/art-approvals/api.ts`
- Test: browser UX check

- [ ] **Step 1: Implement OTP request + verify steps in UI**

```tsx
if (stage === "email") { /* email input */ }
if (stage === "otp") { /* otp input */ }
if (stage === "review") { /* decision form */ }
```

- [ ] **Step 2: Implement decision form for two formal outcomes only**

```tsx
<select value={decisionType} onChange={...}>
  <option value="approved">Approved</option>
  <option value="changes_requested">Changes requested</option>
</select>
{decisionType === "changes_requested" && <textarea required />}
<input value={typedFullName} required />
<label><input type="checkbox" required /> I confirm this decision</label>
```

- [ ] **Step 3: Prevent duplicate submission after terminal status**

```tsx
if (approval.status === "approved" || approval.status === "changes_requested") {
  return <p>This review round is already completed.</p>;
}
```

- [ ] **Step 4: Manual acceptance**

Run: `npm run dev`  
Expected: external user can complete OTP and submit either Approved or Changes Requested with required fields.

- [ ] **Step 5: Commit**

```bash
git add app/review/[token]/page.tsx components/art-approvals/ReviewDecisionForm.tsx lib/art-approvals/api.ts
git commit -m "feat: add otp-gated client review and decision form"
```

---

### Task 9: Verification and hardening pass

**Files:**
- Modify: `package.json` (if `test` script missing)
- Modify: any touched files for lint/type fixes
- Test: full lint + targeted tests + smoke walkthrough

- [ ] **Step 1: Ensure scripts cover lint and tests**

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Run verification commands**

Run: `npm run lint`  
Expected: PASS.

Run: `npm run test -- lib/art-approvals/otp.test.ts`  
Expected: PASS.

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 3: Manual smoke checklist**

```md
- Admin can create/edit art approval
- Admin can add allowlisted emails
- Ready-for-client generates review link
- Client OTP works only for allowlisted emails
- Client can submit Approved with full name + confirm
- Client can submit Changes Requested only with required comment + full name + confirm
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: verify art approval workflow and clean up lint/build issues"
```

---

## Self-Review

### 1. Spec coverage
- Standalone approval entity: covered in Tasks 1, 2, 6, 7.
- OTP + allowlist gate: covered in Tasks 3 and 5.
- Formal outcomes Approved + Changes Requested: covered in Tasks 5 and 8.
- Typed full name + explicit confirmation: covered in Tasks 5 and 8.
- Round/revision handling and state transitions: covered in Tasks 3 and 5.
- Admin list/detail replacement of placeholder page: covered in Tasks 6 and 7.

### 2. Placeholder scan
- No `TODO`/`TBD` placeholders included in actionable steps.
- Commands and file paths are explicit.

### 3. Type and naming consistency
- Status and decision names are consistent across tasks:
  - Status: `draft`, `with_designer`, `ready_for_client`, `approved`, `changes_requested`
  - Decision: `approved`, `changes_requested`

