# Supabase Postgres + Vercel Blob Integration Readiness

This repository now includes server-side integration scaffolding so you can switch from localStorage to persistent cloud storage.

## What was added

- Supabase REST helpers for projects/items CRUD: `lib/server/supabase.ts`
- Vercel Blob upload helper: `lib/server/blob.ts`
- API routes:
  - `GET/POST /api/projects`
  - `GET /api/projects/:projectId`
  - `POST /api/projects/:projectId/items`
  - `PUT/DELETE /api/projects/:projectId/items/:itemId`
  - `POST /api/uploads`
- Supabase schema: `db/supabase-schema.sql`
- Environment template: `.env.example`

## Important current behavior

The existing UI still reads/writes via `lib/storage.ts` localStorage.
That means current screens still work as-is for prototype users.

The new API layer is ready, but not yet wired into the existing pages.

## Next wiring step (small)

1. Create a new client data adapter (e.g. `lib/storage-remote.ts`) that calls `/api/projects*`.
2. Update admin + quote pages to use async fetch-based methods instead of synchronous localStorage methods.
3. Update image flow to:
   - upload file to `POST /api/uploads`
   - store returned URL in DB instead of base64.

## Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` **server-only**.
- Do not expose service role key in `NEXT_PUBLIC_*` vars.
- Continue using admin Basic Auth (or upgrade to SSO when ready).
