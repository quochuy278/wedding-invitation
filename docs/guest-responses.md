# Guest attendance and wishes

The invitation page renders its current response and wishes from PostgreSQL.
Guests use two separate dialogs: attendance with a total attendee count, and a
wish form. Replies are attached to the invitation code; guest identity always
comes from the invitation's user. No guest name or user ID is accepted as identity
in a write request.

## Attendance

`POST /api/rsvps` accepts `{ code, attendance: "yes" | "no", guestCount }`.
Attending requires a positive integer including the invited guest. Declining
requires zero. The database's signed 32-bit integer capacity is the only upper
bound; there is no business limit of ten attendees.

The endpoint updates the existing invitation's `status` (`accepted` or `declined`)
and `guest_count` atomically. Repeating a request replaces the previous response;
it never adds another RSVP or accumulates counts. Unconfirmed/declined guests can
use the RSVP dialog. Once accepted, the primary action becomes “Xem thiệp” and
opens `/ticket/[code]`; accepted and attended guests no longer see the RSVP dialog.
Active RSVP writes remain possible until check-in, after which they return `409`
and cannot change either the `attended` status or guest count. A successful `{ data }` response contains
`id`, `code`, `guestName`, `attendance`, `guestCount`, and `updatedAt`.

Admin invitation list and overview counts come from the same stored status/count.
The browser mutation invalidates invitation and RSVP query caches. Reentering the
admin list/overview fetches fresh counts, including after a response from another
browser. `GET /api/rsvps` requires an active admin session and returns current
accepted/attended/declined responses, including expired invitations but excluding deleted
invitations and guests.

Admin scanning verifies the signed QR and atomically changes only `accepted` to
`attended`. Pending/declined invitations cannot check in. Repeated scans report
an existing check-in without another write or additional guests. Confirmed totals
include both accepted and attended invitations, so check-in never reduces RSVP
counts. See [invitation tickets](invitation-tickets.md) for the scanner contract.

## Wishes

`POST /api/wishes` accepts `{ code, content }`. Content is trimmed and must be
1–500 characters. The endpoint returns `{ data: { id, content, createdAt } }`.
Distinct wishes can be sent through the same invitation. Resending identical
trimmed content returns the existing wish, including simultaneous retries.

The write transaction locks the active invitation before looking for an existing
wish and inserting. It updates the invitation's modification time but does not
change attendance or the attendee count. Wishes can be sent regardless of the
guest's attendance choice. React renders their content as text.

The guest can expand their submitted wishes on their own invitation; reloads
read the persisted collection. The admin invitation list has a wish dialog per
guest. That dialog lazily calls `GET /api/wishes?code=ABC123`, which requires an
active admin session. Admins can read wishes for expired invitations. Other
invitations' wishes are never returned in a public invitation DTO.

## Availability and errors

Both POST endpoints require the existing temporary public `X-Api-Key` header,
checked before parsing or database access. This header is a client compatibility
gate, not guest authentication. Anyone holding an active invitation code and
the public header can respond for that invitation under the current access model.

The invitation must exist, be unexpired, and have no soft deletion on itself or
its guest. Eligibility is checked in the conditional database write. Invalid
fields/JSON or bodies larger than 4,096 characters return `400`; an unavailable
invitation returns `404`; an RSVP for an attended invitation returns `409`;
missing/wrong keys return `403`; storage failures return
a sanitized `503`. Responses use `Cache-Control: no-store` and
`Referrer-Policy: no-referrer`. No guest session is created.

Guest writes share the existing 60-request/minute Proxy budget with invitation
reads/pages; changing codes or paths does not renew the budget. Admin GET reads
are outside that budget and still require admin authentication. The existing
per-process limiter's multi-instance limitations remain unchanged.

Dialogs retain entered data on failures, show translated errors and disable
submitting/closing while a write is pending. Saved attendance is shown beside
the trigger; successful wishes appear in the guest's own history. No new tables,
columns, environment variables or migrations are required.

## Verification

`pnpm run test` covers parsing/count consistency, header enforcement before body
reads, malformed/oversized payloads, unavailable invitations, safe storage errors,
client headers and Proxy coverage. `tests/guest-responses.integration.test.ts`
creates isolated database fixtures and verifies replacement counts/global
summaries, wish persistence/deduplication, invitation isolation, and rejection of
expired/deleted invitations and deleted guests. Set `AUTH_TEST_BASE_URL` to an
isolated local server to include actual HTTP persistence and guest/admin access
checks. Each run removes only its own fixtures and sends no email.

For browser verification, `node --conditions=react-server --import tsx
tests/guest-response-preview.ts create` creates an isolated invitation and prints
its URL path. The `inspect` command reads only that fixture's stored response;
`check-in` verifies and checks in only that fixture using the backend ticket
service, and `expire` tests failures while a dialog is open. Always finish with `cleanup`,
which verifies fixture identity and deletes only its own wish/invitation/user/
address rows. Its metadata file is stored in the ignored `.next` directory.
