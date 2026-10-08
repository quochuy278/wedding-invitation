export const invitationCodeLength = 6;
export const invitationCodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const invitationCodeInputPattern = "^[a-zA-Z0-9]*$";

export function normalizeInvitationCode(value: string): string {
  // Uppercase ASCII letters only: Unicode lookalikes must not become valid codes.
  return value.trim().replace(/[a-z]/g, (character) => character.toUpperCase());
}

export function isInvitationCode(value: string): boolean {
  return value.length === invitationCodeLength && /^[A-Z0-9]+$/.test(value);
}

export function isInvitationCodeInput(value: string): boolean {
  return value.length <= invitationCodeLength && /^[A-Z0-9]*$/.test(value);
}
