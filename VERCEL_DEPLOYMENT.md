# Deploy to Vercel + Protect Admin Access

This project can be deployed on Vercel so account managers can share quote links without exposing `/admin` to clients.

## Is Vercel free?

Yes, Vercel has a **Hobby (free)** tier that is usually enough for prototypes and internal testing.

Typical free-tier fit for this prototype:
- one project deployment
- preview + production URLs
- basic team testing

If usage scales (more bandwidth, team controls, or compliance), you can move to Pro later.

## How to deploy

1. Push this repo to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Keep defaults for Next.js.
4. Add these Environment Variables:
   - `ADMIN_BASIC_AUTH_USERNAME`
   - `ADMIN_BASIC_AUTH_PASSWORD`
5. Deploy.

After deploy:
- Public quote links: `https://<your-domain>/q/<projectId>`
- Admin area: `https://<your-domain>/admin` (now protected by HTTP Basic Auth in production)

## What protects admin now?

`middleware.ts` blocks every `/admin/*` route unless correct Basic Auth credentials are provided.

Behavior:
- **Production + env vars set**: `/admin` requires username/password.
- **Production + env vars missing**: `/admin` returns server error (fails closed).
- **Local dev** (`NODE_ENV !== production`): admin remains open for convenience.

## “Custom links” for client sharing

For theoretical clients, send only:
- `https://<your-domain>/q/<projectId>`

Those links do **not** need admin credentials and will not expose `/admin` unless someone has both:
1) the `/admin` URL and 2) valid Basic Auth credentials.

## Optional hardening (next)

- Use a separate admin subdomain (`admin.yourdomain.com`) with same auth middleware.
- Add proper login (NextAuth/SSO) for account manager identity.
- Add role-based permissions and audit history.


## Long-term project retention (important)

The current prototype code stores records in browser localStorage, so it is not durable for multi-month logistics cycles by itself.

To keep projects and photos available long-term, implement the server storage plan in `VERCEL_PERSISTENCE.md` (Vercel Postgres + Vercel Blob).
