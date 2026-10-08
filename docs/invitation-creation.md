# Venue and invitation creation

Admins create venues at `/dashboard/addresses/new`, review them at `/dashboard/addresses`, then select a saved venue at `/dashboard/invitations/new`. A venue can be reused by multiple invitations. Venue links preselect its ID in the invitation form.

## Address data

`address_text` remains the manually entered full address. Structured fields never replace it: `address_line_1`, `address_line_2`, `location_type`, `postal_code`, `city`, `region`, `country`, `instructions`, `floor`, `entrance`, `latitude`, and `longitude`.

New venues require a name, full address, first address line, location type, postal code, city, country, event date/time, and IANA time zone. Other fields are optional. Postal codes and floors are strings, preserving values such as `00123`, `B1`, and `3A`. Postal codes are not checked against a country-specific registry.

Coordinates are optional, supplied together, finite, and bounded to latitude ±90 and longitude ±180. The database also enforces the pair and range constraints. No geocoding or geographic verification runs in this version.

`event_at` stores the instant; `event_time_zone` stores the venue's chosen time zone. The browser initially suggests its zone, which the admin can change. The form converts local event time using that zone and rejects nonexistent local times during daylight-saving transitions. Public invitations format the event in the saved venue time zone. Legacy venues without one use `Asia/Ho_Chi_Minh`, matching the previous invitation template.

Both migrations are additive. Existing address text, event times, and invitations remain intact; new venue fields are nullable in the database for legacy compatibility. Apply with `pnpm db:deploy`, then regenerate the client with `pnpm db:generate`.

## API

`GET /api/addresses` returns `{ data: { items: AddressDto[] } }`, ordered by creation time descending and ID descending. The small wedding venue collection is returned together for selection.

`POST /api/addresses` accepts the camelCase address fields above, including an ISO `eventAt` with a time zone and an `eventTimeZone`. It returns `{ data: AddressDto }` with status 201.

`POST /api/invitations` accepts:

```json
{
  "guestName": "Nguyễn Văn An",
  "email": "an@example.com",
  "phoneNumber": null,
  "addressId": "saved-venue-id",
  "expiresAt": "2027-06-01T11:00:00.000Z",
  "personalMessage": "Hẹn gặp bạn ở sảnh Hoa Sen!"
}
```

Name, valid email, an existing venue, and a future deadline are required. Phone and personal message are optional. Email is trimmed and lowercased. Contact uniqueness follows the existing user schema: duplicate email or phone returns 409, including when it belongs to an admin or a soft-deleted guest. This version does not change or reuse existing guest accounts.

Guest creation and invitation creation share a transaction. The guest has level 1 and no password; the invitation has a generated unique code, `pending` status, and guest count 0 until attendance is recorded. An invalid venue, duplicate contact, or expired deadline leaves no partial guest/invitation. The deadline is independent of the venue event time.

Creation returns `{ data: CreatedInvitationDto }` with status 201. Every endpoint requires a current admin session. POST also requires the trusted origin used by auth mutations. Invalid input returns 400 with field details, missing admin access returns 401, untrusted origin returns 403, and unexpected backend failures return 503. Responses use `Cache-Control: no-store` and `Vary: Cookie`.

## Frontend and email

Axios services and React Query hooks load venues and create records. Successful mutations invalidate the matching list cache. Protected creation requests support one auth refresh/retry; public invitation code endpoints keep their refresh exclusion.

The form shows server field errors, loading states, an empty venue state, and a retry button for venue loading. Successful invitation creation displays its real code and offers preview/copy-link actions. `/invitation/[code]` loads the persisted guest, venue, event time, and personal message; invalid, expired, or deleted invitations show the existing not-found page.

This version stores the guest email and invitation only. It does not send email, create an email queue, or mark anything as sent. The UI states this explicitly. Prototype guest-group and maximum-guest controls were removed because the existing model has no corresponding fields; `guest_count` is an attendance count, not an invitation capacity.

RSVP and wishes submission behavior is unchanged.

## Verification

Run `pnpm test`, `AUTH_TEST_BASE_URL=http://localhost:3000 pnpm test:integration` against a running development server, `pnpm exec tsc --noEmit`, `pnpm check`, and `pnpm build`. Integration fixtures use unique identities and delete only their own records.
