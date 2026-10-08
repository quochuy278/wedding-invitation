# Invitation tickets

Guests open `/ticket/[code]` through “Xem vé mời” on the invitation page. The server loads the current invitation from PostgreSQL and displays the guest name, event time in the venue's saved time zone, full address and structured access details, personal message, six-character code, expiry and QR. Guests can download the QR PNG. Invalid, expired or soft-deleted invitations and soft-deleted guests receive the existing not-found page. Backend failures use the existing error page and retry action.

`GET /api/invitations/[code]/ticket/qr` serves the current signed PNG as an attachment, using the same active-invitation rules and public lookup rate limit. It uses `no-store`, `no-referrer` and `nosniff`; missing invitations return 404 and backend errors return 503. The native same-origin download link avoids relying on a data-URL download.

## Signed QR

The QR contains a compact `WIT1.<code>.<expiry-in-base36>.<signature>` token rather than a URL or the six-character code alone. The expiry preserves the database timestamp's millisecond precision. The signature is HMAC-SHA256 over the complete payload and the internal invitation ID. Its signing key is derived from the server-only `AUTH_SECRET` with a ticket-specific domain, separate from admin JWT signing. No new environment variable or SQL migration is needed. Rotating `AUTH_SECRET` invalidates existing ticket signatures; reopening a valid invitation generates its current QR.

For an unchanged invitation and secret, the QR is deterministic across reloads. Changing the code, expiry or internal identity invalidates the previous token. Tokens from expired or soft-deleted invitations or soft-deleted guests fail verification against the current database. Ticket tokens cannot act as admin access or refresh tokens.

`invitationTicketService.verify(qrValue)` provides read-only verification for the later scanner: parse the untrusted lookup code, load an active invitation, then compare the complete payload and signature using a constant-time signature comparison. No token is trusted before this check. This phase adds no scanner screen, verification HTTP endpoint or check-in write. Invitation status, RSVP and wishes behavior remain unchanged.

Signing prevents inventing or modifying an authentic QR. A copy or screenshot of a real QR has the same valid token. Detecting repeated entry requires an authenticated scanner and an atomic check-in record in the next phase. Knowledge of the invitation's code grants access to its ticket under the existing guest access model.

QR images are generated locally with [node-qrcode](https://github.com/soldair/node-qrcode), with a white quiet zone and black modules. No QR generation service receives the token or guest information. Ticket metadata disables indexing and sets `no-referrer`.

## Verification

Unit tests cover token stability, tampering, identity and deadline binding, secret rotation, exact expiry, admin-token separation, and decoding the actual generated PNG back to its complete token. Database integration tests cover real issuance and verification, expiry changes, soft deletion, code reuse, real ticket rendering, navigation links, download attributes and contact-data exclusion. Run `pnpm test`, `AUTH_TEST_BASE_URL=http://localhost:3000 pnpm test:integration`, `pnpm exec tsc --noEmit`, `pnpm check` and `pnpm build`.
