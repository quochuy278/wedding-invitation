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
