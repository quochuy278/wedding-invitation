# Public guest access and token review — 2026-10-09

Reviewed commit: `f34261f4cf0a6dfee73f2829234d69def8257775`, pushed to `master`
before this review. Scope: fetching invitations by code, guest credentials,
ticket tokens, expiry/revocation and separation from admin authorization.

Subsequent change: the user chose a temporary hardcoded shared guest API key.
Invitation fetch, validation and QR-download APIs now require `X-Api-Key`;
browser services supply it automatically. The key is publicly bundled and adds
no guest session or identity. Direct pages still open by code, and RSVP remains
a separate pending fix. The observations below describe the reviewed commit
before this header was added; see README for the current API contract.

## Conclusion

There is **no separate public guest token** in the current implementation.
The six-character invitation code itself is a bearer capability: anyone holding
it can read that invitation and obtain its signed ticket. Fetching/validating the
code creates no guest cookie, JWT or session record. This implements the intended
experience without guest login, but does not establish the viewer's identity.

The signed QR token protects ticket authenticity. It is not the credential used
to fetch an invitation. No admin access from a code or QR token was demonstrated.

## Current credentials and scope

| Credential | Purpose | Important boundary |
| --- | --- | --- |
| Invitation code: six A–Z/0–9 characters | Read one active invitation, its ticket and QR | Reusable/shareable until the database makes it unavailable |
| QR token: `WIT1.<code>.<expiry>.<signature>` | Verify ticket authenticity against the current invitation | Contains the readable invitation code; possession also reveals the public read capability |
| Admin access/refresh JWT cookies | Admin session and protected operations | Separate signed-token purposes and current database Admin/session checks |
| Separate guest token/session | Not implemented | No browser-specific guest authentication, expiry or revocation |

The application's Guest user level is a recipient/contact record. It is unrelated
to the Supabase `anon`/`authenticated` roles and does not create a login session.

## Fetch flow and source evidence

1. `hooks/queries/use-invitations.ts:54` validates the entered code, then fetches
   the full invitation. Validation returns only `{ isValid }`.
2. `services/invitations/invitation.service.ts:35` sends a GET to
   `/api/invitations/:code`. It adds no guest Authorization token. The shared Axios
   client enables cookies, but public handlers do not require an admin cookie.
3. `app/api/invitations/[code]/route.ts:4` calls `invitationService.getByCode` and
   returns the DTO. There is no token issuance or guest-session exchange.
4. `server/features/invitations/invitation.service.ts:86` normalizes and validates
   the code. `invitation.repository.ts:77` requires a future expiry and excludes
   deleted invitations and deleted recipients.
5. `app/(public)/invitation/[id]/page.tsx:22` calls the same service directly.
   Opening the page does not require first visiting the homepage or validation
   API. `proxy.ts:4` applies the lookup limit before all public entry points.
6. `invitation-ticket.service.ts:14` generates a signed QR after code lookup.
   `invitation-ticket.token.ts:17` puts the code in its readable payload. The admin
   scanner verifies its signature and current database availability.

The public DTO contains the invitation ID/code, status, guest count, expiry,
personal message, guest name, venue details/coordinates and wishes. It excludes
guest email/phone, passwords, user level and sessions. The internal invitation ID
is not accepted as a replacement for the code.

## Confirmed behavior and limitations

- **Sharing/replay is allowed.** A copied code works on another browser/device.
  There is no per-browser guest logout or revocation. Expiring/deleting the
  invitation or recipient blocks subsequent requests. Rotating the code in the
  database invalidates the old code and old QR; no public rotation endpoint exists.
- **QR possession reveals the code.** Decoding a downloaded QR yielded the code,
  which fetched the complete public DTO without supplying its signature. Anyone
  who receives a ticket screenshot can therefore read its personal message and
  other public invitation fields. The signed ticket can also be copied; scanner
  verification currently does not record single-use check-in.
- **The code is a short secret.** Uniform cryptographic generation provides
  `36^6 = 2,176,782,336` possibilities, approximately 31 bits. The new guard covers
  pages/API/QR, but remains process-local; without a verified IP header the budget
  is shared by all visitors on that process. Hosting/edge enforcement is still
  needed for multiple instances. A first uncached homepage success normally uses
  validation, full DTO fetch and page navigation: three guarded requests.
- **The code appears in URLs.** It is present in email links, invitation/ticket
  paths, public DTOs and QR payloads. Invitation responses use `no-referrer`, and
  invitation/ticket pages specify `noindex, nofollow`; these reduce some leakage
  but do not remove browser history, copied links or hosting/access logs. No
  actual log disclosure was tested. `noindex` is not an authorization boundary.
- **Revocation affects future requests.** Data already rendered, downloaded or
  copied cannot be recalled by expiring the invitation. Browser-specific access
  cannot be revoked independently because there is no separate guest credential.
- **Guest writes need their own gate.** `POST /api/rsvps` remains the public demo
  write from the earlier audit, without invitation authorization. A new guest
  token would not secure that route unless the route actually requires it.

Missing guest JWT is not by itself an authorization bypass: the current contract
explicitly grants read access to code holders. Adding a JWT after validating the
same code would not stop guessing/sharing that code, especially while existing
code-only page/API/QR paths remain available.

## Verification

Thirty bounded HTTP checks passed against an isolated production `next start`
server on localhost. Two temporary Guest recipients/invitations were created;
only those fixtures were mutated and removed. Email/geocoding keys were disabled
in the test server, and no providers were called. No application code or database
permissions were changed by this review.

| Check | Observed result |
| --- | --- |
| Valid code without Cookie/Authorization | `200`, no `Set-Cookie`; expected public DTO fields |
| Same code from another browser identity | `200`, same invitation |
| Valid code with a bogus Bearer token | `200`; authorization derives from the code |
| Code validation | `200 { data: { isValid: true } }`, no token/cookie |
| Direct invitation/ticket/QR access | `200`, no preceding exchange required |
| Code decoded from signed QR | Fetches the full public invitation without its signature |
| Malformed/unknown code or internal invitation ID | `404`; a valid QR in Authorization does not override an unknown path code |
| Query parameters naming another invitation | Path code still selects only its own invitation |
| Code/QR as forged admin credentials | Protected session/lists/create/scanner return `401`; dashboard redirects to `/login` |
| Guest contact login | `401` |
| Expiry | Invitation API/page, ticket and QR return `404`; signed-ticket verification rejects it |
| Invitation/recipient soft deletion | Next invitation fetch returns `404` |
| Database code rotation | Old code returns `404`, new code works, old QR is rejected |
| Another active invitation after the above revocation checks | Remains independently readable |
| Guest session rows created / guest cookies issued | `0` / none |

Remote HTTPS, edge rules, production logs and deployed Data API settings were
outside this local verification. The earlier review already established that
database failures do not fall back to a different invitation; API error wrapping
is still a separate pending improvement.

## Recommended decision

For a read-only wedding invitation whose link may be forwarded, a separate guest
JWT is optional. Keep the code scoped to one invitation, its availability checks,
public DTO filtering and effective deployment limits. Treat the code and QR as
secrets and avoid logging them.

If browser-specific guest access or RSVP authorization is required, use a
dedicated guest exchange/session without requiring a guest account:

1. Exchange a valid code through a bounded, rate-limited POST for a credential
   scoped to that one invitation. Store it in an HttpOnly, Secure, SameSite cookie
   with a lifetime capped by the invitation expiry; keep it separate from admin
   authentication. An opaque random token can be simpler to revoke than a JWT.
2. Require that guest credential on the protected guest reads/writes and recheck
   invitation availability. Redirect to a URL without the original code. Leaving
   equivalent code-only endpoints open would preserve the original access path.
3. Derive RSVP identity from the authorized invitation, not caller-supplied guest
   names or another invitation ID. If a JWT is used, verify an explicit guest
   purpose/audience and never accept it as an admin token.
4. For stronger resistance to guessing email links, use a separate long random
   secret (at least 128 bits), while retaining a short code only as a controlled
   manual-entry path. A session issued from a six-character code does not increase
   the entropy of that initial exchange. Sharing either secret still shares access.

These are design recommendations, not implemented changes. They do not prove the
viewer owns the invited email address. The pending RSVP fix remains separate.

## Primary guidance

- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): random credentials, cookie properties, expiry and URL/log disclosure. Its authenticated-session guidance is applied by analogy; the current invitation code is a public bearer capability, not an admin session ID.
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): enforce object-scoped permission checks on every relevant request.
