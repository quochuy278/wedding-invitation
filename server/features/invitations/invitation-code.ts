import "server-only";

import { randomInt } from "node:crypto";
import { invitationCodeAlphabet, invitationCodeLength } from "@/shared/utils/invitation-code";

function randomCodeCharacter(): string {
  return invitationCodeAlphabet[randomInt(invitationCodeAlphabet.length)];
}

export const invitationCodeGenerator = {
  generate(): string {
    return Array.from({ length: invitationCodeLength }, randomCodeCharacter).join("");
  },
};
