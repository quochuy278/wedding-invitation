import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ScannerCameraResult,
  ScannerCameraStatus,
} from "@/components/admin/scanner-camera-feedback";
import messages from "@/messages/vi.json";
import type {
  InvitationTicketVerificationDto,
  VerifiedInvitationTicketDto,
} from "@/shared/contracts/invitation-ticket";

const labels = messages.Admin.scan;
const invitation: VerifiedInvitationTicketDto = {
  code: "TEST01",
  guestName: "Khách thử nghiệm",
  status: "attended",
  guestCount: 2,
  expiresAt: "2027-01-02T00:00:00.000Z",
  address: {
    id: "test-venue",
    name: "Địa điểm thử nghiệm",
    addressText: "1 Đường thử nghiệm",
    addressLine1: null,
    addressLine2: null,
    locationType: null,
    postalCode: null,
    city: null,
    region: null,
    country: null,
    instructions: null,
    floor: null,
    entrance: null,
    latitude: null,
    longitude: null,
    eventAt: "2027-01-01T10:30:00.000Z",
    eventTimeZone: "Asia/Ho_Chi_Minh",
  },
};

test("a ready camera invites scanning without a loading spinner or success confirmation", () => {
  const markup = renderToStaticMarkup(
    <ScannerCameraStatus phase="scanning" label={labels.scanning} />,
  );
  assert.ok(markup.includes(labels.scanning));
  assert.ok(markup.includes('role="status"'));
  assert.ok(!markup.includes("animate-spin"));
  assert.ok(!markup.includes(labels.recordedTitle));
});

test("camera startup and server verification retain loading feedback without claiming success", () => {
  for (const phase of ["requesting", "verifying"] as const) {
    const markup = renderToStaticMarkup(
      <ScannerCameraStatus phase={phase} label={labels[phase]} />,
    );
    assert.ok(markup.includes(labels[phase]));
    assert.ok(markup.includes("animate-spin"));
    assert.ok(!markup.includes(labels.recordedTitle));
    assert.ok(!markup.includes(invitation.guestName));
  }
});

test("a recorded server result confirms check-in with the guest name and a motion-safe animation", () => {
  const markup = renderToStaticMarkup(
    <ScannerCameraResult
      result={{ isValid: true, checkIn: "recorded", invitation }}
      title={labels.recordedTitle}
    />,
  );
  assert.ok(markup.includes(labels.recordedTitle));
  assert.ok(markup.includes(invitation.guestName));
  assert.ok(markup.includes('role="status"'));
  assert.ok(markup.includes("bg-emerald-950"));
  assert.ok(markup.includes("motion-safe:animate-in"));
  assert.ok(!markup.includes("animate-spin"));
});

test("duplicate, unconfirmed and invalid tickets never display a new check-in success", () => {
  const cases: { result: InvitationTicketVerificationDto; title: string; color: string }[] = [
    {
      result: { isValid: true, checkIn: "alreadyAttended", invitation },
      title: labels.alreadyAttendedTitle,
      color: "bg-amber-950",
    },
    {
      result: { isValid: true, checkIn: "notConfirmed", invitation },
      title: labels.notConfirmedTitle,
      color: "bg-amber-950",
    },
    {
      result: { isValid: false, invitation: null },
      title: labels.invalidTitle,
      color: "bg-red-950",
    },
  ];
  for (const { result, title, color } of cases) {
    const markup = renderToStaticMarkup(<ScannerCameraResult result={result} title={title} />);
    assert.ok(markup.includes(title));
    assert.ok(markup.includes(color));
    assert.equal(markup.includes(invitation.guestName), result.isValid);
    assert.ok(!markup.includes(labels.recordedTitle));
    assert.ok(!markup.includes("bg-emerald-950"));
    assert.ok(!markup.includes("animate-in"));
  }
});
