export type Attendance = "yes" | "no";

export type Rsvp = {
  id: string;
  guestName: string;
  attendance: Attendance;
  guestCount: number;
  message: string | null;
  createdAt: string;
};

export type CreateRsvpInput = Pick<
  Rsvp,
  "guestName" | "attendance" | "guestCount" | "message"
>;
