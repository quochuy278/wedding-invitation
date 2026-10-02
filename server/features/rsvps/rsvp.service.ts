import "server-only";

import { rsvpRepository } from "./rsvp.repository";
import type { CreateRsvpInput } from "./rsvp.types";

export const rsvpService = {
  list() {
    return rsvpRepository.findMany();
  },

  create(input: CreateRsvpInput) {
    // Business rules such as duplicate checks or sending email belong here.
    return rsvpRepository.create(input);
  },
};
