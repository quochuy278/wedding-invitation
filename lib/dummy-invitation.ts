export type InvitationScheduleEvent = {
  time: string;
  title: string;
  description: string;
  icon: "champagne" | "dinner" | "cake";
};

export type InvitationData = {
  id: string;
  groom: string;
  bride: string;
  date: string;
  displayDate: string;
  rsvpDeadline: string;
  venue: { name: string; street: string; city: string; mapUrl: string };
  schedule: readonly InvitationScheduleEvent[];
  dressColors: readonly { name: string; className: string }[];
};

export const dummyInvitation: InvitationData = {
  id: "demo",
  groom: "Huy",
  bride: "Phụng",
  date: "2026-09-19",
  displayDate: "19.09.2026",
  rsvpDeadline: "20.08.2026",
  venue: {
    name: "Nhà hàng Hoàng Gia",
    street: "Số 12 Nguyễn Du, Quận 1,",
    city: "TP. Hồ Chí Minh",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=12+Nguyen+Du+Quan+1+Ho+Chi+Minh",
  },
  schedule: [
    {
      time: "17:30",
      title: "Đón khách",
      description: "Chào đón bạn đến chung vui cùng chúng mình.",
      icon: "champagne",
    },
    {
      time: "18:00",
      title: "Khai tiệc",
      description: "Cùng nhau thưởng thức những món ăn ngon và những khoảnh khắc đáng nhớ.",
      icon: "dinner",
    },
    {
      time: "21:00",
      title: "Kết thúc dự kiến",
      description: "Cảm ơn bạn đã là một phần trong ngày đặc biệt này.",
      icon: "cake",
    },
  ],
  dressColors: [
    { name: "Đỏ rượu", className: "bg-[#7a1026]" },
    { name: "Hồng đất", className: "bg-[#bd7780]" },
    { name: "Hồng đào", className: "bg-[#e9bdb0]" },
    { name: "Kem", className: "bg-[#e5d6be]" },
    { name: "Nâu nhạt", className: "bg-[#b99579]" },
  ],
};
