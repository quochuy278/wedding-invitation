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
