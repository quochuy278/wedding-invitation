export type InvitationWishDto = {
  id: string;
  content: string;
  createdAt: string;
};

export type InvitationDto = {
  id: string;
  code: string;
  status: string;
  guestCount: number;
  expiresAt: string;
  guest: {
    fullName: string;
  };
  address: {
    name: string;
    addressText: string;
    eventAt: string;
  };
  wishes: InvitationWishDto[];
};
