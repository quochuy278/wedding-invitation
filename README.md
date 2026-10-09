This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Server/API structure

The example API keeps Next.js route handlers small and groups server code by feature:

```text
app/
  api/
    health/route.ts        # GET /api/health
    invitations/
      route.ts             # GET /api/invitations (admin, paginated)
      [code]/route.ts      # GET /api/invitations/:code
      validate/route.ts    # POST /api/invitations/validate
    rsvps/route.ts         # GET, POST /api/rsvps
shared/
  contracts/
    invitation.ts          # API DTO shared by server and future clients
server/
  features/
    invitations/
      invitation.repository.ts # Prisma query and public field selection
      invitation.service.ts    # Maps database records to the shared DTO
    rsvps/
      rsvp.types.ts        # Domain types
      rsvp.schema.ts       # Input validation
      rsvp.repository.ts   # Data access
      rsvp.service.ts      # Business logic
  shared/
    http/api-response.ts   # Shared HTTP response helpers
```

`route.ts` is the HTTP boundary. It parses the request and formats the response.
Feature services contain business rules, while repositories are the only modules
that should know how data is stored.

`GET /api/invitations?page=1&pageSize=5` requires an active admin session. Pagination
defaults to five records per page and supports up to 100. Invalid pagination
parameters return `400`; requests past the last page return the last page. The
`{ data }` response contains `items`, `pagination` (`page`, `pageSize`, `totalItems`,
`totalPages`) and `summary` (`totalInvitations`, `acceptedInvitations`,
`acceptedGuests`, `pendingInvitations`). Summary values cover the entire list.
Admin lists include expired invitations and exclude soft-deleted invitations and
users. `/dashboard/invitations` keeps the current page in client state; changing
the page changes the React Query key and fetches that API page without navigation
or URL changes. Reloading starts at page 1. The table shows the invitation's last
update date, rather than a response date.

`/dashboard` uses the same global summary and React Query cache as the first page
of the invitation list. Its cards show the total invitations, accepted invitations
and sum of guests from accepted invitations; the pending hint also uses the live
summary. Empty data displays zero, loading displays skeletons, and failed reads
display an error with retry instead of fabricated counts. Creating an invitation
invalidates the shared cache. The dashboard page and the list API each require an
active admin session.

Public invitation reads share a 60-request / 60-second burst budget at `proxy.ts`,
before route handling, database lookups or QR rendering. This includes
`/invitation/:code`, `/ticket/:code`, `/api/invitations/:code`, validation and QR
downloads, including RSC and prefetch requests. Switching paths or codes does not
renew the budget. Each request counts once; protected admin list/create routes
remain outside this public lookup guard.

Exhausted budgets return `429 RATE_LIMITED` with `Retry-After`, `Cache-Control:
no-store` and `Referrer-Policy: no-referrer`. Counters are local to each Proxy
process and reset on restart. Multiple instances require a hosting/edge limit.
Configure `TRUSTED_CLIENT_IP_HEADER` only when a trusted proxy overwrites it and
direct access cannot bypass that proxy. Without it, visitors share one local
budget. Guests can open invitation and ticket pages by code without login.

The invitation HTTP APIs additionally require the temporary shared
`X-Api-Key` header: `GET /api/invitations/:code`,
`POST /api/invitations/validate` and `GET /api/invitations/:code/ticket/qr`.
The hardcoded value and header are in `shared/contracts/guest-api.ts`; browser
invitation services attach the header automatically. Missing or incorrect keys
return `403 FORBIDDEN` before parsing bodies, querying the database or generating
QR images. Requests still count toward the lookup budget.

This key is public in the browser bundle and can be copied. It blocks API calls
that omit the header, but does not authenticate a guest or prevent code guessing
by someone who knows the key. Invitation availability and code checks still
apply. Direct invitation/ticket pages remain accessible by code; no guest session
or JWT is issued, and the key grants no admin access or RSVP authorization.
To rotate the temporary key, edit the shared constant and rebuild/deploy both
client and server together.

The HTTP regression test uses `INVITATION_RATE_LIMIT_TEST_BASE_URL` and
`INVITATION_RATE_LIMIT_TEST_IP_HEADER` against an isolated local production test
server. Its identity header must match that server's `TRUSTED_CLIENT_IP_HEADER`.
The test creates and removes its own database fixture without calling email or
geocoding providers.

The RSVP repository currently uses in-memory demo data, which resets whenever the
server process restarts and is not suitable for deployment. Replace only
`rsvp.repository.ts` when adding Prisma, Drizzle, or another database layer.

Try the API after running `pnpm dev`:

```bash
curl http://localhost:3000/api/health
# Copy the temporary value from shared/contracts/guest-api.ts first.
GUEST_API_KEY='<guestApiKey value>'
curl http://localhost:3000/api/invitations/INVITATION_CODE \
  -H "X-Api-Key: $GUEST_API_KEY"
curl -X POST http://localhost:3000/api/invitations/validate \
  -H "X-Api-Key: $GUEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"INVITATION_CODE"}'
curl http://localhost:3000/api/rsvps
curl -X POST http://localhost:3000/api/rsvps \
  -H "Content-Type: application/json" \
  -d '{"guestName":"An Nguyen","attendance":"yes","guestCount":2,"message":"See you!"}'
```

## Client API services

Axios and TanStack React Query are configured for browser-side API calls:

```text
lib/
  api/
    config.ts             # API base URL and request timeout
    client.ts             # Shared Axios instance
    types.ts              # Success and error response envelopes
  react-query/
    query-client.ts       # Query cache and default options
components/
  providers/
    query-provider.tsx    # React Query context, mounted in app/layout.tsx
services/
  rsvps/
    rsvp.types.ts         # Type-only exports of the existing API contract
    rsvp.service.ts       # GET and POST /api/rsvps via Axios
hooks/
  queries/
    use-rsvps.ts          # Query keys, list query, and create mutation
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `/api`, so `rsvpService.list()` calls
`/api/rsvps` on the current origin. Set it to an absolute API URL when using a
separate backend. Restart the dev server after changing it; production changes
require rebuilding because Next.js bundles public environment variables at build
time. The Axios request timeout is 15 seconds.

Services handle HTTP requests and return the data inside the API's `{ data }`
envelope. Hooks manage loading state, errors, and caching. Axios errors retain the
API response, available through `error.response?.data.error.message` when present.

The query defaults keep data fresh for 60 seconds, retry failed reads once, and
disable refetching on window focus. Mutations are not retried. Creating an RSVP
invalidates the RSVP list so active queries refresh after a successful submission.
The query client is reused in the browser and created separately for each server
render, following the [TanStack App Router setup](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).

Use the hooks inside a Client Component:

```tsx
"use client";

import { useCreateRsvp, useRsvps } from "@/hooks/queries/use-rsvps";

export function RsvpSummary() {
  const { data: rsvps, isPending, error } = useRsvps();
  const { mutate: createRsvp, isPending: isSubmitting } = useCreateRsvp();

  if (isPending) return <p>Loading...</p>;
  if (error) {
    return <p>{error.response?.data.error.message ?? error.message}</p>;
  }

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={() =>
        createRsvp({
          guestName: "An Nguyen",
          attendance: "yes",
          guestCount: 2,
          message: null,
        })
      }
    >
      Confirm attendance ({rsvps.length} responses)
    </button>
  );
}
```

The invitation UI still uses its current fixture. This scaffold starts API calls
only when a component uses a query hook or invokes a service. For each new feature,
add its types and service under `services/<feature>/` and its query/mutation hooks
under `hooks/queries/`.

## Invitation email

After an invitation is saved, the backend sends its guest an email directly through
the Brevo transactional HTTP API. Configure `BREVO_API_KEY`,
`BREVO_SENDER_EMAIL` (a verified Brevo sender), and `BREVO_SENDER_NAME` in `.env`.
Set `APP_URL` to the public HTTPS website origin for invitation links; local
development can fall back to `AUTH_ORIGIN`.

This small Next.js project deliberately does **not use the outbox pattern**.
Sending happens once in the creation request, after the database transaction
commits, with an eight-second provider timeout. If sending fails, the invitation
remains saved and the backend logs a sanitized error. There is no automatic retry
or guarantee of delivery if the process stops between saving and sending.

## Internationalization

The app uses `next-intl` with a fixed `vi` locale. Request configuration lives in
`i18n/request.ts`, and the root layout provides messages to both Server and Client
Components through `NextIntlClientProvider`.

All translation keys are written in English and all Vietnamese user-facing copy
lives in `messages/vi.json`. Keep code, comments, and documentation in English;
add new Vietnamese interface text to the locale file instead of hardcoding it in
components.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to self-host and optimize Playfair Display, Lora, and Montserrat. The Tailwind v4 theme in `app/globals.css` exposes the wedding palette and typography through semantic utilities such as `bg-primary`, `text-foreground`, `font-heading`, `font-body`, and `font-label`.

## Possible improvements

The current design tokens live in `app/globals.css`, which keeps the setup easy to discover while the application is small. If the design system grows or needs to be shared across multiple applications, move the palette, semantic tokens, typography, and dark-theme mappings into a dedicated file such as `styles/theme.css` and import it from `globals.css`.

Tailwind v4 uses CSS-first configuration, so this extraction should continue using `@theme` and `@theme inline` instead of introducing a JavaScript `tailwind.config` only for colors and fonts. Keep fixed brand primitives in `@theme`, and bridge theme-dependent semantic values from `:root` and `.dark` through `@theme inline`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
