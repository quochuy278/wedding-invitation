export const guestResponseLimits = {
  // PostgreSQL Int storage bound; there is no separate business limit on group size.
  maxGuestCount: 2_147_483_647,
  maxWishLength: 500,
} as const;

export type Attendance = "yes" | "no";

export type CreateRsvpInput = {
  code: string;
  attendance: Attendance;
  guestCount: number;
};

export type Rsvp = {
  id: string;
  code: string;
  guestName: string;
  attendance: Attendance;
  guestCount: number;
  updatedAt: string;
};

export type CreateWishInput = {
  code: string;
  content: string;
};
