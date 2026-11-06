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
  personalMessage: string | null;
  guest: {
    fullName: string;
  };
  address: AddressDto;
  wishes: InvitationWishDto[];
};

export type InvitationTicketDto = {
  invitation: InvitationDto;
  qrValue: string;
  qrDataUrl: string;
};

export const invitationPaginationDefaults = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
} as const;

export const invitationTimeZoneHeader = "X-Time-Zone";
export const invitationAdminNoteMaxLength = 2000;

export type InvitationListParams = {
  page: number;
  pageSize: number;
  addressId?: string;
  status?: string;
  updatedFrom?: string;
  updatedTo?: string;
};

export type InvitationListItemDto = {
  id: string;
  code: string;
  guestName: string;
  phoneNumber: string | null;
  address: Pick<AddressDto, "name" | "addressText">;
  adminNote: string | null;
  status: string;
  guestCount: number;
  updatedAt: string;
  emailStatus: InvitationEmailStatus | null;
  emailError: string | null;
  canResendEmail: boolean;
};

export type UpdateInvitationNoteInput = { adminNote: string | null };

export type InvitationEmailStatus =
  | "pending"
  | "accepted"
  | "failed"
  | "unconfirmed"
  | "delivered"
  | "bounced";

export type InvitationListDto = {
  items: InvitationListItemDto[];
  pagination: Pick<InvitationListParams, "page" | "pageSize"> & {
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

export type CreateInvitationInput = {
  guestName: string;
  email: string;
  phoneNumber: string | null;
  addressId: string;
  expiresAt: string;
  personalMessage: string | null;
};

export type CreatedInvitationDto = {
  id: string;
  code: string;
  status: string;
  guestName: string;
  email: string;
  phoneNumber: string | null;
  address: AddressDto;
  expiresAt: string;
  personalMessage: string | null;
};

import type { AddressDto } from "./address";
