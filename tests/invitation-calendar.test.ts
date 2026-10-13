import assert from "node:assert/strict";
import test from "node:test";
import { invitationCalendarUrl } from "@/shared/utils/invitation-calendar";

const venue = {
  name: "Nhà hàng Sen & Hoa",
  addressText: "12 Nguyễn Du\nTP. Hồ Chí Minh, Việt Nam",
  addressLine2: "Sảnh Hoa Sen",
  eventAt: "2027-06-12T18:00:00+07:00",
  eventTimeZone: "Asia/Ho_Chi_Minh",
};
const eventText = {
  title: "Tiệc cưới Huy & Phụng",
  details: "Tầng: B1 · Lối vào: Cổng B\n\nĐi theo biển chỉ dẫn & gặp chúng mình nhé!",
};

test("Google Calendar receives the venue's exact instant, time zone and a three-hour event", () => {
  const calendarUrl = invitationCalendarUrl(venue, eventText);
  assert.ok(calendarUrl);
  const url = new URL(calendarUrl);
  assert.equal(url.origin + url.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("dates"), "20270612T110000Z/20270612T140000Z");
  assert.equal(url.searchParams.get("ctz"), "Asia/Ho_Chi_Minh");
  assert.equal(url.searchParams.get("text"), eventText.title);
  assert.equal(url.searchParams.get("details"), eventText.details);
  assert.equal(
    url.searchParams.get("location"),
    "Nhà hàng Sen & Hoa, 12 Nguyễn Du\nTP. Hồ Chí Minh, Việt Nam, Sảnh Hoa Sen",
  );
});

test("calendar dates follow each fetched venue and preserve duration across midnight and DST", () => {
  const cases = [
    {
      eventAt: "2027-06-12T23:30:00Z",
      eventTimeZone: "UTC",
      dates: "20270612T233000Z/20270613T023000Z",
    },
    {
      eventAt: "2027-03-28T01:30:00+01:00",
      eventTimeZone: "Europe/Berlin",
      dates: "20270328T003000Z/20270328T033000Z",
    },
  ];
  for (const { dates, ...event } of cases) {
    const calendarUrl = invitationCalendarUrl({ ...venue, ...event }, eventText);
    assert.ok(calendarUrl);
    const url = new URL(calendarUrl);
    assert.equal(url.searchParams.get("dates"), dates);
    assert.equal(url.searchParams.get("ctz"), event.eventTimeZone);
  }
});

test("legacy calendar venues use the invitation's existing time-zone fallback", () => {
  const calendarUrl = invitationCalendarUrl({ ...venue, eventTimeZone: null }, eventText);
  assert.ok(calendarUrl);
  assert.equal(new URL(calendarUrl).searchParams.get("ctz"), "Asia/Ho_Chi_Minh");
});

test("invalid event dates or time zones cannot create a guessed calendar event", () => {
  for (const invalid of [
    { eventAt: "" },
    { eventAt: "not-a-date" },
    { eventTimeZone: "not/a-timezone" },
  ]) {
    assert.equal(invitationCalendarUrl({ ...venue, ...invalid }, eventText), null);
  }
});
