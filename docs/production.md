# Production deployment

The Production environment of Vercel project `wedding-invitation-dev` serves
`https://thiepcuoihuy.vercel.app`. The previous domain
`https://thiep-cuoi-huy.vercel.app` redirects to this canonical origin.
Preview keeps its existing branch URL and
development database. Production uses Supabase project
`yrsxejjpqgwmapbgsqxv` (Wedding Invitation Production).

Database URLs and the independent Production `AUTH_SECRET` are stored as Secret
environment variables in Vercel. `AUTH_ORIGIN` and `APP_URL` match the canonical
Production HTTPS origin; `NEXT_PUBLIC_API_BASE_URL` remains `/api`. The configured
Brevo sender, Brevo API key and Geoapify API key are shared with Preview.

The runtime uses the transaction pooler on port 6543 with `pgbouncer=true`,
`sslmode=verify-full` and
`sslrootcert=certificates%2Fsupabase-prod-ca.crt`. Prisma CLI uses the session
pooler on port 5432 with `sslmode=require`, `sslaccept=strict` and
`sslcert=certificates%2Fsupabase-prod-ca.crt`. Run migration commands from the
repository root with the Production connection variables provided securely.

`certificates/supabase-prod-ca.crt` is the public
[Supabase Root 2021 CA certificate](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt).
Next.js explicitly includes it in server bundles so the PostgreSQL driver can
verify the pooler's certificate at runtime. It contains no credentials.

`pnpm build` generates Prisma Client before building Next.js, including when a
Vercel dependency cache skips the install hook. Deployments do not run database
migrations automatically. The four repository migrations were applied during
Production setup. RLS and revoked API-role grants on the six application/history
tables follow the existing deployment described in
[the security review](security-review-2026-10-09.md). The server's PostgreSQL role
continues to access the tables through Prisma.

Production starts with no guests, invitations, venues or administrator accounts.
The owner chose to create a new Production administrator later; no Preview users
or guest data were copied. Use the interactive `pnpm admin:create` procedure in
[the authentication guide](auth.md) with Production connection variables.

## Daily database health check

The `database-health` entry under `schedules` in `vercel.json` calls
`GET /api/cron/database-health` once per day at 06:00 UTC. Vercel activates this
schedule in Production and leaves it inactive by default in Preview. On Hobby,
Vercel starts it within the 15-minute scheduling window.

Set these server-only Secret environment variables in Vercel Production:

- `CRON_SECRET`: a random value of at least 32 characters. Vercel automatically
  sends it as `Authorization: Bearer <CRON_SECRET>`.
- `KEEP_ALIVE_DATABASE_URL`: the Development database's transaction-pooler URL,
  with the same connection and TLS settings used by Preview. It must point to
  `plhydlyvfrhwrwajvcgy`, while the existing Production `DATABASE_URL` continues
  to point to `yrsxejjpqgwmapbgsqxv`.

The endpoint runs a read-only `SELECT 1` through Prisma against both databases
independently. Each check uses a dedicated single-connection pool, five-second
connection/query/statement timeouts, and disconnects in `finally`. It does not
use the application's shared pool or modify application data. Missing or invalid
scheduler credentials return `401` before any database access. Responses are never
cached. `/api/health` remains the public application liveness check.

Authorized responses contain `{ data: { status, timestamp, databases } }`, where
`databases.primary` is the Production runtime database and
`databases.development` is the additional Development connection. Each is `ok`,
`unavailable`, or `unconfigured`. Both must be `ok` for HTTP `200`; a failed or
missing connection produces HTTP `503` after still checking the other database.
Responses and logs contain no connection strings or raw driver errors.

Deploy after changing the configuration or secrets. In the Vercel project, open
**Schedules**, select `database-health`, and choose **Run Schedule** to verify
its execution. With the Vercel CLI authenticated and linked to the project, run
`vercel schedules invoke database-health`.
A paused Supabase project must first be restored from the Supabase dashboard;
this endpoint cannot resume an already-paused project. Daily queries create
database activity but do not guarantee exemption from Free-plan inactivity
pausing. See [Supabase availability](https://supabase.com/docs/guides/deployment/going-into-prod#availability)
and [Vercel schedule management](https://vercel.com/docs/schedules/manage).

`pnpm test` includes the cron authentication, configuration, independent failure,
and response/privacy cases. `pnpm test:integration` additionally runs real Prisma
checks using the configured `DATABASE_URL`, including an unreachable secondary
database and a stalled connection timeout. It creates no health-check fixtures.
Set `DATABASE_HEALTH_TEST_BASE_URL` to an isolated running server and provide its
`CRON_SECRET` to also enable the HTTP regression test. That server must have both
database URLs configured; the test checks authentication, repeated successful
probes, private response headers, and unsupported methods.
