# Security review — 2026-10-09

Reviewed commit: `9c505253b91ad9a124c2f2a15ca338305576f80e`.

Scope: public invitation access, invalid codes and failures, guest/admin separation,
admin sessions, QR tickets, RSVP, response headers, integration secrets and
production dependency advisories. The intended guest experience remains access
by invitation code without a login.

Verification combined source review, bounded requests against an isolated local
production server, mocked database failures, read-only PostgreSQL permissions
metadata, and `pnpm audit --prod --json`.
The server's email key was disabled. One temporary RSVP was created only in that
server's demo memory; stopping the server discarded it. No application code,
database records or deployment settings were changed by this review.
Hosting/WAF rules, deployed HTTPS headers, Supabase Data API exposure settings,
backups and provider account permissions were not available for verification.

## Remediation progress

### Fix 1 — completed in Supabase and approved

Project: `Wedding-invitation` (`plhydlyvfrhwrwajvcgy`). Permissions were enforced
directly using Supabase MCP `execute_sql`, without adding a migration.

- Revoked all table privileges from `anon`, `authenticated` and `PUBLIC` on
  `users`, `sessions`, `addresses`, `invitations`, `wishes` and `_prisma_migrations`.
- Enabled RLS on all six tables without public policies. The server's `postgres`
  role remains the owner with `BYPASSRLS`; no guest login requirement was added.
- Revoked automatic table and sequence grants for objects created by `postgres`
  in `public`. Other object owners and function defaults were not changed. There
  are currently no functions in `public`; review grants for any future RPC.
- The initial Prisma migration approach was removed at the user's request. Its
  file, test file, README/package edits and database history entry were reverted.
  `prisma migrate status` confirms the four existing migrations are up to date.

MCP verification confirmed no effective table or column privileges for either
API role. All 48 direct SELECT/INSERT/UPDATE/DELETE attempts across the six tables
were rejected with SQLSTATE `42501`. A new table/sequence created inside a
rolled-back transaction received no API-role grants; no test tables remain.
Five temporary database security checks also passed, including RLS denial with
temporarily restored CRUD grants; their test file was then removed as requested.
The existing 46 unit tests and 24 Prisma integration tests passed. Thirteen HTTP
integration tests were skipped because no HTTP test server was configured.

Supabase Security Advisor reports no ERROR or WARN notices. Its six
[`RLS Enabled No Policy` INFO notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
are intentional: these tables are used through server-side Prisma, and API roles
must have no row access. Data API enablement remains unverified; this fix denies
those roles regardless of whether that API is enabled.

These are project settings managed directly through MCP. Reapply and verify them
when provisioning a new database; repository migrations do not reproduce them.
The user approved this fix on 2026-10-09. Further fixes use separate commits and
require user review before each push.

### Fix 2 — completed and approved

Fix 1's security record was committed and pushed as `d7ec193` before starting
this change. A root `proxy.ts` now applies the existing public invitation limiter
before every invitation page, ticket page and `/api/invitations/:code` request,
including validation and nested QR downloads. RSC and prefetch requests are
included, with no client-controlled header exclusions. API-handler counters were
removed so public requests count once in the Proxy runtime; no state is shared
between Proxy and rendering runtimes. Admin list/create endpoints remain outside
this public guard.

The budget remains 60 requests per 60 seconds for the resolved client identity.
Changing codes or entry points does not reset it. Exhaustion returns `429` with
`Retry-After`, `Cache-Control: no-store` and `Referrer-Policy: no-referrer` before
the page/service can query the database or generate a QR.

Verification:

- `pnpm test`: 50 passing tests, including matcher coverage, a shared cross-path
  budget, forged forwarding headers and recovery after the window expires.
- `pnpm build`: successful production build and TypeScript checks.
- Biome checks for changed code and package scripts: passed.
- Dedicated HTTP regression against an isolated `next start` server: passed.
  API, invitation, ticket and QR reads of its valid fixture returned `200`.
  Sixty mixed requests exhausted one budget, and all five entry points returned
  `429` afterward, including RSC/prefetch and forged subrequest headers.
  Another verified client identity could still read the fixture, the homepage
  returned `200`, and the protected admin list still returned `401` without auth.
  Its database fixture was removed; no email/geocoding providers were called.

This resolves the page/API coverage gap. Counters are still process-local and
unverified client identity falls back to a shared bucket; the separate deployment
limitation in finding 3 remains. The user approved packing and pushing this fix
on 2026-10-09. Fix 3 (public demo RSVP writes) remains pending while the requested
public guest-token review is completed.

## Existing protections

- Codes are six ASCII letters/digits, generated using `node:crypto.randomInt`.
  Uniqueness is enforced by the database. Incorrectly formatted lookup codes
  return no invitation before querying the database.
- Missing, expired or deleted invitations and invitations belonging to deleted
  users are excluded by the same repository filter. Public lookups do not return
  a different invitation as a fallback.
- The homepage stops navigation on invalid codes, missing invitations and network
  errors. Network/server errors are presented separately from invalid codes.
- Public invitation DTOs exclude guest email, phone, password hashes, role and
  sessions. They intentionally include the guest name, venue, personal message,
  status and wishes. Public API results use `Cache-Control: no-store`.
- Invitation pages specify `noindex` and `nofollow`. Invitation responses have
  `no-referrer`; ticket pages also include a no-referrer metadata policy.
- A Guest row (`level = 1`) is a recipient/contact record. Creation does not issue
  a login session or password. Login requires an active Admin (`level = 0`) with
  a matching Argon2id password. Session authorization checks current role,
  deletion, expiry and revocation in the database.
- Admin pages and protected APIs check authorization on the server. Admin write
  endpoints validate the request origin. Production auth cookies use HttpOnly,
  Secure, SameSite=Lax and `__Host-` names. Refresh tokens rotate atomically and
  only their hashes are stored. JWT audience and algorithm checks are explicit.
- Ticket signatures bind the code, database invitation ID and expiry using HMAC.
  Verification checks current invitation availability. An admin session is
  required for the scanner verification API.
- Guest values are rendered as React text; the HTML email escapes dynamic values.
  External service URLs are fixed HTTPS origins and provider requests have
  timeouts. `.env` is ignored by Git; no public integration key was found.

## Findings and remediation order

### 0. Highest priority: broad Supabase API-role grants with RLS disabled

Status: resolved by Fix 1 above. The following describes the original audit result.

Read-only database metadata confirmed that `users`, `sessions`, `invitations`,
`addresses` and `wishes` have RLS disabled. Both `anon` and `authenticated` have
schema USAGE and broad table privileges, including SELECT, INSERT, UPDATE and
DELETE. Effective privilege checks also confirmed reads of `users` and `sessions`
and updates of `users`.

If the Data API exposes this schema, a caller with its applicable API key can
bypass the Next.js handlers and their code checks, admin authorization and DTO
filters. This could expose contact details and password/refresh hashes, and allow
modification of users, roles and invitations. No remote Data API exploit was
attempted and its enabled/exposed-schema settings remain unverified. The database
misconfiguration is confirmed; public exploitability is conditional on exposure.
The Supabase `anon` database role is separate from this application's Guest row.

For this Prisma-only backend, verify whether the Data API is needed. If unused,
disable it or remove these tables from exposed schemas. Revoke unnecessary API
role grants, address default privileges for future migrations and apply RLS to
any tables intentionally exposed. Verify that the server database role retains
its required access. See [Supabase API hardening](https://supabase.com/docs/guides/api/securing-your-api)
and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 1. High: public pages bypass the invitation lookup limiter

Status: resolved by Fix 2 above. The following describes
the original audit result.

Sources: `app/(public)/invitation/[id]/page.tsx:25`,
`app/(public)/ticket/[code]/page.tsx:21`,
`server/features/invitations/invitation.http.ts:17`.

The API calls `invitationRateLimit`, but invitation and ticket pages call their
services directly. In the local production test, the API returned `429` after its
budget was exhausted; both public pages still performed the same unknown-code
lookup and returned `404` without `Retry-After`. Ticket requests for existing
codes also generate a QR image.

This permits guessing and database/QR resource consumption through an unprotected
entry point. The 36-character alphabet and six-character length give
`36^6 = 2,176,782,336` possible codes, approximately 31 bits. This does not establish
that an invitation was compromised, but makes unrestricted guessing undesirable.

Apply protection before lookups/rendering to all invitation, ticket and QR paths,
including direct page and RSC requests. Keep short manual-entry codes only with
effective throttling. Consider a separate longer random secret for email links if
stronger resistance to guessing is required. The code remains a bearer secret;
requiring guest account registration is not necessary for this design.

### 2. High: the public demo RSVP write has no invitation authorization or limits

Sources: `app/api/rsvps/route.ts:16`,
`server/features/rsvps/rsvp.repository.ts:8` and `:24`.

An unauthenticated request with no invitation code or Origin was accepted with
`201`. The caller chooses the guest name. The endpoint has no rate limit or
explicit body-size limit, and appends indefinitely to a process-global array.

This permits forged demo RSVPs and unbounded memory growth. These entries are
demo data: the endpoint does not update the real `Invitation` record or its
attendance state. Disable the unused endpoint before deployment, or require a
valid, active invitation capability, derive its guest from the database, bound
request sizes, rate limit writes and prevent duplicate submissions.

### 3. Medium: the limiter is process-local and can block unrelated guests

Sources: `server/shared/http/rate-limit.ts:23` and `:45`.

Counters reset with the process and are not shared between instances. Without a
verified client-IP header, every visitor uses the same `shared` bucket. The local
configuration currently has no trusted-IP header configured. A caller can consume
the shared invitation budget, or the login client budget, affecting other visitors
on that process. A caller-controlled header would also defeat identity-based
limits if it were trusted without proxy enforcement.

Use hosting/edge limits covering all relevant paths and a proxy-verified client
identity. Verify that direct access cannot bypass that proxy. A single-process
limiter can remain an additional local guard.

### 4. Medium hardening: framing and other response headers are incomplete

Source: `next.config.ts:8`.

The isolated production homepage had no CSP, X-Frame-Options or nosniff header.
The config currently adds only the invitation referrer policy. No working XSS or
authenticated clickjacking exploit was demonstrated; SameSite cookies already
reduce cross-site iframe risk.

Add a framing policy such as CSP `frame-ancestors 'none'`, a compatible fallback
where needed, `X-Content-Type-Options: nosniff` and a suitable referrer policy.
Design a Next-compatible CSP rather than adding a policy that breaks its scripts.
Verify HTTPS and HSTS at the real hosting layer; an HTTP localhost test cannot
establish the deployed transport policy.

### 5. Dependency maintenance: six advisories, reachability varies

The production dependency graph reported three high and three moderate advisories,
with no critical advisory. These counts are package advisories, not six confirmed
exploitable application paths.

| Package installed | Advisory | Assessment for this application |
| --- | --- | --- |
| `next-intl@4.4.0` | [Open redirect](https://github.com/advisories/GHSA-8f24-v5vv-gm5j) | Requires its locale middleware with `localePrefix: 'as-needed'`. This app uses a fixed locale and has no such middleware. |
| `next-intl@4.4.0` | [Prototype pollution](https://github.com/advisories/GHSA-4c35-wcg5-mm9h) | Requires experimental message precompilation and attacker-controlled catalog keys. That feature is not configured; catalogs are local repository files. |
| `deepmerge-ts@7.1.5` | [Recursive-graph stack exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | Transitive through Prisma configuration tooling. No guest-controlled configuration/recursive object path was found. |
| `mysql2@3.15.3` | [Credential disclosure](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) | Transitive through Prisma. The app uses PostgreSQL with the pg adapter, not a MySQL connection. |
| `mysql2@3.15.3` | [Compressed-protocol DoS](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) | Same unused MySQL connection path. |
| `braces@3.0.3` | [Nested-pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Transitive through shadcn CLI/glob tooling. No guest-controlled glob pattern path was found. |

Upgrade compatible direct dependencies and their transitive packages, then rerun
the audit and checks. `next-intl >= 4.9.2` contains fixes for both listed issues.
Assess upstream upgrades before forcing incompatible dependency overrides.

### 6. Low: public database failures have no consistent API error wrapper

Sources: `app/api/invitations/[code]/route.ts:12`,
`app/api/invitations/validate/route.ts:24`.

Mocked database failures rejected from both handlers without a handled response.
The application does not grant access on failure; Next handles the server error
and the client maps HTTP 500/network failures to a service-unavailable message.
Add sanitized `503` JSON handling consistent with the existing protected APIs.
This is an error-handling gap, not a demonstrated authorization bypass or
production stack-trace disclosure.

## Guest and ticket trust boundaries

Possession of a valid code authorizes reading that invitation and generating its
ticket. It does not prove that the browser belongs to the invited email address.
Forwarding a link or copying a QR therefore shares that capability. Guest role
checks protect admin access but do not make a public invitation identity-bound.

The scanner currently verifies authenticity without recording check-in. A valid
copied ticket can be verified more than once. If admission must be single-use,
add an atomic check-in transition and an explicit already-used result. Until that
requirement exists, this is a limitation of the chosen ticket flow.

The validation endpoint's true/false response is an existence check, not an extra
authentication factor. Removing it would reduce duplicate requests, but the main
lookup still reveals existence. Throttling every entry point is the relevant
protection.

## Observed local production results

| Check | Result |
| --- | --- |
| Malformed code lookup | `404`, no-store and no-referrer; service mock confirmed zero database lookups |
| Malformed validation JSON / code format | `400 BAD_REQUEST` |
| Valid-format unknown code | `200`, `isValid: false` |
| Protected list/session APIs without cookies | `401` |
| Dashboard without cookies | `307` to `/login` |
| Login from an untrusted origin | `403` |
| Public demo RSVP without invitation authorization | `201` |
| API after lookup limit exhaustion | `429`, `Retry-After: 60` |
| Invitation and ticket pages after the same exhaustion | `404`, no rate-limit response |

Local environment origins are development HTTP origins. Set the canonical HTTPS
origins and verify edge rules when deploying; this review does not claim that a
remote deployment has the same configuration. `docs/auth.md` also still describes
new invitation codes as CUIDs; current code generates six-character codes.

## References

- [Supabase API hardening](https://supabase.com/docs/guides/api/securing-your-api): disable unused API exposure and restrict grants.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): grants without row policies can expose tables outside application handlers.
- [OWASP API resource consumption](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/): rate, payload and resource controls.
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): permission checks at each protected entry point.
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): bearer-token guessing and URL disclosure considerations, applied here by analogy to invitation capabilities.
- [OWASP clickjacking defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html): frame restrictions and the limits of SameSite cookies.
