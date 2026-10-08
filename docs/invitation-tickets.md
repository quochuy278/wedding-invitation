# Invitation tickets

Guests open `/ticket/[code]` through “Xem vé mời” on the invitation page. The server loads the current invitation from PostgreSQL and displays the guest name, event time in the venue's saved time zone, full address and structured access details, personal message, six-character code, expiry and QR. The page asks guests to present the live page, without a download action or screenshot-saving suggestion. Invalid, expired or soft-deleted invitations and soft-deleted guests receive the existing not-found page. Backend failures use the existing error page and retry action.

`GET /api/invitations/[code]/ticket/qr` continues to serve the current signed PNG as an attachment, using the same active-invitation rules and public lookup rate limit. It uses `no-store`, `no-referrer` and `nosniff`; missing invitations return 404 and backend errors return 503. It is no longer linked from the ticket page.

## Live presentation

The ticket enters gently, the decorative heart pulses, and a colored border rotates around a stationary QR. A small client component displays the device's current time in the venue's time zone, updated every second, alongside a moving dot and progress strip. Its timer pauses while the page is hidden and updates immediately on return; unmount releases the timer. Motion honors `prefers-reduced-motion`, while the clock continues to update. QR pixels and the white quiet zone stay stationary and unobstructed.

These are visual cues for the host to distinguish a live page from a still screenshot, not server authentication or screenshot prevention. The clock is local device time. The signed QR token still follows the existing invitation deadline; copies and screen recordings can still pass QR verification. Rejecting old screenshots in the backend requires short-lived rotating tokens, and rejecting repeated entry requires atomic check-in tracking.

## Signed QR

The QR contains a compact `WIT1.<code>.<expiry-in-base36>.<signature>` token rather than a URL or the six-character code alone. The expiry preserves the database timestamp's millisecond precision. The signature is HMAC-SHA256 over the complete payload and the internal invitation ID. Its signing key is derived from the server-only `AUTH_SECRET` with a ticket-specific domain, separate from admin JWT signing. No new environment variable or SQL migration is needed. Rotating `AUTH_SECRET` invalidates existing ticket signatures; reopening a valid invitation generates its current QR.

For an unchanged invitation and secret, the QR is deterministic across reloads. Changing the code, expiry or internal identity invalidates the previous token. Tokens from expired or soft-deleted invitations or soft-deleted guests fail verification against the current database. Ticket tokens cannot act as admin access or refresh tokens.

`invitationTicketService.verify(qrValue)` provides read-only verification: parse the untrusted lookup code, load an active invitation, then compare the complete payload and signature using a constant-time signature comparison. No token is trusted before this check. Invitation status, RSVP and wishes behavior remain unchanged.

Signing prevents inventing or modifying an authentic QR. A copy or screenshot of a real QR has the same valid token. Detecting repeated entry requires an atomic check-in record in a later phase. Knowledge of the invitation's code grants access to its ticket under the existing guest access model.

## Admin scanner

Admins open `/dashboard/scan` from the sidebar. `POST /api/invitation-tickets/verify` requires a current admin session and trusted origin, bounds the JSON body and QR value, and returns `{ data: { isValid, invitation } }`. Invalid, forged or inactive tokens return `isValid: false` and no guest data. Valid responses contain only the guest name, code, RSVP status/count, expiry and venue. All responses use `no-store`, `Vary: Cookie` and `no-referrer`; backend failures return 503. The client supports the existing single auth refresh/retry on this protected endpoint.

Camera access is enabled only in the mobile layout, using the existing shared breakpoint below 768 CSS pixels. Desktop layout disables the camera button and guards camera startup; switching to desktop stops an active or pending camera request. Image verification remains available on desktop. Camera access is requested only after pressing “Bật camera”, with video only and a preference for the rear camera. Mobile access requires HTTPS; `http://192.168.x.x` is not a secure context. Configure `AUTH_ORIGIN` to match the HTTPS origin used by the admin browser. Use a trusted HTTPS deployment or development tunnel; an untrusted certificate may still block the camera. Permission denial, missing/busy cameras and unsupported browsers offer clear recovery messages and an image alternative.

Frames are decoded locally with jsQR, capped at 960 pixels per dimension and sampled about six times per second. The scanner stops the media tracks on successful decode, cancellation, page hiding and unmount. Permission requests that resolve after cancellation release the late stream. Image scanning accepts PNG/JPEG/WebP up to 10 MB and 25 megapixels, decoding locally before sending only the QR text to the verification endpoint. Neither camera frames nor image files are uploaded.

The screen shows verified guest/venue details, invalid tickets, loading, error/retry and scan-next actions. Verification does not write attendance, alter RSVP, or reject repeated scans of a genuine token. Camera lifecycle tests use fake streams; a physical phone over HTTPS is still needed to validate its camera permissions and rear-camera behavior.

QR images are generated locally with [node-qrcode](https://github.com/soldair/node-qrcode), with a white quiet zone and black modules. No QR generation service receives the token or guest information. Ticket metadata disables indexing and sets `no-referrer`.

## Verification

Unit tests cover token stability, tampering, identity and deadline binding, secret rotation, exact expiry, admin-token separation, and decoding the actual generated PNG back to its complete token. Database integration tests cover real issuance and verification, expiry changes, soft deletion, code reuse, real ticket rendering, navigation links, download attributes and contact-data exclusion. Run `pnpm test`, `AUTH_TEST_BASE_URL=http://localhost:3000 pnpm test:integration`, `pnpm exec tsc --noEmit`, `pnpm check` and `pnpm build`.
