# Keep Projects + Photos Persisted on Vercel (Full Logistics Cycle)

Right now, this app stores everything in browser localStorage, which means data is tied to one browser/device and can disappear if cache is cleared.

To keep project records and photos available for months, move storage to server-side services.

## Recommended setup (production-ready path)

- **Structured data** (projects, items, tiers): **Vercel Postgres**
- **Images/photos**: **Vercel Blob**
- **App hosting**: **Vercel**

This gives you persistent server storage so links stay valid across users and devices.

## Why this solves your requirement

- Projects remain accessible throughout the logistics cycle.
- Uploaded photos are stored in blob storage (not in local browser memory).
- Account managers and clients can revisit links later.
- Data survives browser refreshes/computer changes.

## Data model to create

Use four tables:

1. `projects`
   - `id` (uuid, pk)
   - `name`
   - `client`
   - `notes`
   - `created_at`
   - `updated_at`
   - `status` (draft, shared, approved, archived)

2. `items`
   - `id` (uuid, pk)
   - `project_id` (fk -> projects.id)
   - `name`
   - `short_description`
   - `material`
   - `size`
   - `logo`
   - `pre_production_sample_time`
   - `pre_production_sample_fee`
   - `packing_details`
   - `image_url` (Vercel Blob URL)
   - `sort_order`

3. `price_tiers`
   - `id` (uuid, pk)
   - `item_id` (fk -> items.id)
   - `qty`
   - `price_per_unit_ddp`
   - `production_plus_transit_time`

4. `project_access_tokens` (optional for share control)
   - `id` (uuid, pk)
   - `project_id` (fk -> projects.id)
   - `token_hash`
   - `expires_at`
   - `revoked_at`

## Route behavior to target

- `/admin/*` (already protected) = create/edit projects/items.
- `/q/:projectId` = view-only project page for stakeholders.
- Optional stricter share model: `/q/:projectId?token=<signed-token>`.

## Migration plan from current prototype

1. Keep existing UI.
2. Add API routes (or server actions) for:
   - create/update/list projects
   - create/update/delete items
   - create/update/delete tiers
3. Replace localStorage reads/writes in `lib/storage.ts` with server requests.
4. Update image upload flow:
   - upload file to Vercel Blob
   - store returned URL in `items.image_url`
5. Backfill old prototype projects if needed (one-time script).

## Retention and operations recommendations

- Keep projects for at least 18 months (or your policy window).
- Add `archived` status instead of deleting projects.
- Run weekly DB backup/export snapshots.
- Add audit fields (`updated_by`, `updated_at`) for quote traceability.

## Security recommendations

- Keep admin behind auth (already done with Basic Auth in this prototype).
- For real rollout, move admin to SSO (Okta/Azure AD/Google Workspace).
- Use signed/expiring project share links if client confidentiality requires it.

## Minimal implementation checklist

- [ ] Create Vercel Postgres database.
- [ ] Create Vercel Blob store.
- [ ] Add env vars in Vercel:
  - `POSTGRES_URL`
  - `BLOB_READ_WRITE_TOKEN`
  - `ADMIN_BASIC_AUTH_USERNAME`
  - `ADMIN_BASIC_AUTH_PASSWORD`
- [ ] Replace client-only storage helpers with server-backed data APIs.
- [ ] Switch image field from base64 string to blob URL.
- [ ] Add archive + retention behavior.

## Practical expectation

With this move, each project link can stay active and referenceable throughout the logistics lifecycle, and all uploaded photos remain available because they are stored in managed blob storage rather than browser local state.
