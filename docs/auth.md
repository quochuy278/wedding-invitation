# Authentication

`User` represents both guests and administrators. The database stores `level` as an integer; the code uses `UserLevel.Admin = 0` and `UserLevel.Guest = 1`. Existing users default to Guest. `password_hash` and `phone_number` are nullable. Only active, non-deleted Admin users with a valid Argon2id password hash can log in. A guest may also become an administrator while retaining their invitation.

## Local setup

1. Install dependencies with `pnpm install` (Argon2 and esbuild builds are explicitly allowed in `pnpm-workspace.yaml`).
2. Configure `DATABASE_URL` and `DIRECT_URL` in `.env`.
3. Run `pnpm auth:setup` to generate a cryptographically random, server-only signing key in the ignored `.env`. The script preserves an existing valid key and does not print it.
4. Run `pnpm db:deploy` and `pnpm db:generate`.
5. Run `pnpm admin:create` in an interactive terminal. Password input is hidden; no default admin credentials are shipped. Updating an existing user requires confirmation and revokes all of that user's existing sessions.
6. Start `pnpm dev` and sign in at `/login`.

## Sessions and routes

Access and refresh tokens are signed JWTs with separate audiences, fixed HS256 verification, issuer, expiry and CUID2 token IDs. The signing secret must contain at least 32 bytes. No password or password hash is included in JWTs. Access tokens last 15 minutes; sessions have a fixed maximum lifetime of 7 days. Refreshing does not extend this deadline.

Only the hash of the current refresh token is stored in `Session`. Rotation atomically replaces this hash. A valid signed refresh token for the same session that no longer matches is treated as reuse and revokes the session. A forged token cannot revoke another person's session. Cookies are HttpOnly, SameSite=Lax and use Secure and `__Host-` names in production. Tokens never enter localStorage or API response bodies.

| Route | Access |
| --- | --- |
| `POST /api/auth/login` | Email/password, trusted origin, rate limited |
| `POST /api/auth/refresh` | Refresh cookie, trusted origin |
| `POST /api/auth/logout` | Trusted origin; revokes current session |
| `GET /api/auth/session` | Valid access token, active session and current Admin level |
| `/dashboard`, `GET /api/rsvps` | Admin session checked on the server |
| Invitation validation/get, health, guest RSVP submission | Public |

Protected pages and API handlers must call `getAdminSession()` before reading protected data. Do not rely solely on a layout or a client UI check. Current user level, soft deletion, session expiry and revocation are checked in the database for every authorization. The Axios response interceptor refreshes on 401 and retries once. Requests in one tab share a refresh promise; the browser Web Locks API serializes refresh across tabs and checks whether another tab already refreshed. Auth session state lives in a Jotai atom and does not use the React Query cache. The signed tokens remain in HttpOnly cookies and are never exposed to client JavaScript. On browsers without Web Locks, simultaneous refresh from different tabs may revoke the session and require another login.

Client features pass request failures through `resolveApiError()`. The resolver prefers the typed API error code, falls back to a normalized code for known HTTP statuses, and safely handles network, malformed and non-Axios errors. UI translations use the shared `ApiErrors` namespace, so components do not parse Axios responses or duplicate status mappings.

`auth.service.ts` contains authentication and token lifecycle rules only. All Prisma reads and writes, persistence input mapping, active-session filters and atomic refresh rotation live in `auth.repository.ts`.

When opening `/dashboard` with an expired access token, its server check redirects to `/login`; login bootstrap restores a valid refresh session and returns to the dashboard. A revoked/expired session stays on login. Login does not expose Google, signup or password-reset flows.

## Guest invitation protection and deployment

Invitation endpoints remain public capability URLs: anyone holding a code can view its invitation. New codes use CUIDs; previously issued codes remain valid. Expired or soft-deleted invitations and invitations belonging to deleted users are excluded. Public DTOs exclude password hashes, user levels, contact details and sessions. Responses are not cached and invitation pages use `Referrer-Policy: no-referrer`.

There is a bounded, in-process burst guard: 60 invitation requests/minute per client, 30 login requests/15 minutes per client and 10 login requests/15 minutes per normalized email. Both invitation endpoints share their counter. This resets on restart and is **not** a shared limit across serverless instances. Production must also configure rate limiting at the hosting proxy/WAF for `/api/auth/login` and `/api/invitations/*`; no rate-limit table or Redis dependency is added.

Set `AUTH_ORIGIN` to the exact canonical HTTPS browser origin in production. Login, refresh and logout reject absent/null or different origins; no wildcard origins or permissive CORS are enabled. Keep `NEXT_PUBLIC_API_BASE_URL=/api` for this same-origin cookie flow.

Only set `TRUSTED_CLIENT_IP_HEADER` if your hosting proxy overwrites it with a single verified client IP and direct access to the app cannot bypass the proxy. Do not blindly trust a caller-supplied `X-Forwarded-For`. With no trusted header, all clients on one process share the client bucket. Match the edge policy to your deployment's verified IP source.

## Verification

`pnpm test` checks password verification, JWT expiry/tampering/audience, request origin validation, rate limiting and client refresh/retry behavior. `pnpm test:integration` uses the configured database to check login, permission changes, rotation/reuse/concurrency, revocation, expiry and guest invitation visibility; it creates unique temporary records and removes only those records in cleanup. Run integration checks against a development/test database. Set `AUTH_TEST_BASE_URL` to a running app (for example `http://localhost:3000`) to also exercise HTTP cookies, redirects and public/protected routes.
