# Quoting Site Prototype Rollout Plan

This guide turns the current app into a sharable prototype account managers can test with real workflows.

## 1) What is already built

The app already supports two core experiences:

- **Admin flow** (`/admin`): create projects, add project metadata, and manage quoted items including image upload, sizing, materials, and tier pricing.
- **Client flow** (`/q/:projectId`): ecommerce-style item grid with drill-down detail pages at `/q/:projectId/:itemId`.

That means you can run a realistic pilot immediately with light setup and no backend infrastructure.

## 2) Fast setup (local)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open:
   - Admin UI: `http://localhost:3000/admin`
   - Public quote page (after creating a project): `http://localhost:3000/q/<projectId>`

## 3) Convert this into a team-testable prototype

### A. Seed one realistic demo program

Have one account manager fill out:
- Program/client name
- Dates/timeline
- Notes/specs
- 5–10 sample items with:
  - image
  - concise summary text for card view
  - full specs in detail view
  - tier pricing
  - materials
  - sizing options

Use real language from their current quoting process so testers can validate usefulness, not just layout.

### B. Define two share links per program

For each pilot program, circulate:
- **AM editing link**: `/admin/projects/:projectId`
- **Client viewing link**: `/q/:projectId`

This keeps AM edits separate from client-facing review.

### C. Add a minimum data quality checklist

Before sharing any project link, confirm:
- all item cards have images
- short description fits card layout
- pricing tiers are complete and consistently formatted
- material/sizing fields are populated
- one person proofreads wording and numbers

### D. Run a 1-week pilot with 3 account managers

Ask each AM to:
1. Create one program from scratch.
2. Share the quote link with an internal stakeholder as if they were Mondelez.
3. Record friction points and missing fields.

Capture the same metrics for everyone:
- time to first complete project
- number of edits after first share
- % of items with complete tiers/material/sizing
- stakeholder clarity score (1–5)

## 4) Deployment options for link sharing

To test with real users, deploy the app so links are stable.

### Recommended (fastest): Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Build command: `npm run build`.
4. Start command: `npm run start` (or use Next.js default).
5. Share the generated URL with AMs.

### Alternate: Internal host

If your org prefers internal-only access:
- deploy in a container/VM,
- run `npm run build && npm run start`,
- put behind company SSO/VPN.

## 5) Prototype guardrails (important)

Because this is a prototype, set expectations clearly:

- Data may be overwritten/reset.
- Not intended for final legal/contract pricing yet.
- No promise of long-term storage until production architecture is approved.

Add a banner in AM kickoff docs so nobody assumes production guarantees.

## 6) Suggested next implementation steps (high ROI)

1. **Authentication + role split**
   - Admin-only pages protected
   - view-only client links
2. **Persistent database + object storage**
   - move from prototype storage to managed DB + blob storage
3. **Audit history**
   - who changed pricing/materials and when
4. **PDF/export snapshot**
   - one-click “send-ready” version for procurement review
5. **Approval status workflow**
   - Draft → Internal Review → Shared with Client → Finalized

## 7) Exact pilot script you can send account managers

Copy/paste this:

> We’re piloting a new quote-sharing tool. Please create one real program in the admin area, add at least 5 items with images/specs/pricing tiers, then share the generated client link with one internal stakeholder for feedback. Track anything unclear, slow, or missing. Goal: confirm this replaces our current quote packet workflow.

---

If you want, the next step is to convert this into a **production readiness checklist** (security, SSO, data model, permissions, backup, and go-live criteria).
