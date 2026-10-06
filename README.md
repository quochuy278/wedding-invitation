This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Server/API structure

The example API keeps Next.js route handlers small and groups server code by feature:

```text
app/
  api/
    health/route.ts        # GET /api/health
    rsvps/route.ts         # GET, POST /api/rsvps
server/
  features/
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

The RSVP repository currently uses in-memory demo data, which resets whenever the
server process restarts and is not suitable for deployment. Replace only
`rsvp.repository.ts` when adding Prisma, Drizzle, or another database layer.

Try the API after running `pnpm dev`:

```bash
curl http://localhost:3000/api/health
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
