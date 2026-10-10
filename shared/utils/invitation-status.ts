export const confirmedInvitationStatuses = ["accepted", "attended"] as const;

export function isConfirmedInvitationStatus(status: string): boolean {
  return confirmedInvitationStatuses.some((confirmed) => confirmed === status);
}
