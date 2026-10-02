import "server-only";

import type { CreateRsvpInput, Rsvp } from "./rsvp.types";

// Demo storage only. Replace this module with a database implementation later.
const rsvps: Rsvp[] = [];

export const rsvpRepository = {
  async findMany(): Promise<Rsvp[]> {
    return [...rsvps];
  },

  async create(input: CreateRsvpInput): Promise<Rsvp> {
    const rsvp: Rsvp = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };

    rsvps.push(rsvp);

    return rsvp;
  },
};
