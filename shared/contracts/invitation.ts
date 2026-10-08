export type InvitationWishDto = {
  id: string;
  content: string;
  createdAt: string;
};

export type InvitationCodeValidationDto = {
  isValid: boolean;
};

export type ValidateInvitationCodeInput = {
  code: string;
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

export const invitationPaginationDefaults = {
  page: 1,
  pageSize: 5,
  maxPageSize: 100,
} as const;

export type InvitationListParams = {
  page: number;
  pageSize: number;
};

export type InvitationListItemDto = {
  id: string;
  code: string;
  guestName: string;
  phoneNumber: string | null;
  status: string;
  guestCount: number;
  updatedAt: string;
};

export type InvitationListDto = {
  items: InvitationListItemDto[];
  pagination: InvitationListParams & {
    totalItems: number;
    totalPages: number;
  };
  summary: {
    totalInvitations: number;
    acceptedInvitations: number;
    acceptedGuests: number;
    pendingInvitations: number;
  };
};
