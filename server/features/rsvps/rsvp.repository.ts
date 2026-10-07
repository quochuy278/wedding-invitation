import "server-only";

import { now } from "@/shared/utils/date";
import { generateId } from "@/shared/utils/id";
import type { CreateRsvpInput, Rsvp } from "./rsvp.types";

// Demo storage only. Replace this module with a database implementation later.
const rsvps: Rsvp[] = [];

export const rsvpRepository = {
  async findMany(): Promise<Rsvp[]> {
    return [...rsvps];
  },

  async create(input: CreateRsvpInput): Promise<Rsvp> {
    const id: string = generateId();
    const createdAt: string = now().toISOString();
    const rsvp: Rsvp = {
      id,
      ...input,
      createdAt,
    };

    rsvps.push(rsvp);

    return rsvp;
  },
};
