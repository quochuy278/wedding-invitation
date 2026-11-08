import "server-only";

export class InvitationCreationError extends Error {
  constructor(
    public readonly reason:
      | "addressNotFound"
      | "contactConflict"
      | "duplicateInvitation"
      | "expiredDeadline",
    public readonly fields: string[],
  ) {
    super(reason);
    this.name = "InvitationCreationError";
  }
}
