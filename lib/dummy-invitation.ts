export type InvitationScheduleEvent = {
  id: "guestWelcome" | "dinner" | "closing";
  time: string;
  icon: "champagne" | "dinner" | "cake";
};

export type InvitationData = {
  id: string;
  date: string;
  venue: { mapUrl: string };
  schedule: readonly InvitationScheduleEvent[];
};

export const dummyInvitation: InvitationData = {
  id: "demo",
  date: "2026-09-19",
  venue: {
    mapUrl: "https://www.google.com/maps/search/?api=1&query=12+Nguyen+Du+Quan+1+Ho+Chi+Minh",
  },
  schedule: [
    {
      id: "guestWelcome",
      time: "17:30",
      icon: "champagne",
    },
    {
      id: "dinner",
      time: "18:00",
      icon: "dinner",
    },
    {
      id: "closing",
      time: "21:00",
      icon: "cake",
    },
  ],
};
