import type { AddressDto } from "./address";

export type VerifyInvitationTicketInput = { qrValue: string };

export type VerifiedInvitationTicketDto = {
  code: string;
  guestName: string;
  status: string;
  guestCount: number;
  expiresAt: string;
  address: AddressDto;
};

export type InvitationTicketVerificationDto =
  | { isValid: true; invitation: VerifiedInvitationTicketDto }
  | { isValid: false; invitation: null };
