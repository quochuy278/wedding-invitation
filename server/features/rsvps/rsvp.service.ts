import "server-only";

import { type RsvpRecord, rsvpRepository } from "./rsvp.repository";
import type { CreateRsvpInput, Rsvp } from "./rsvp.types";

function toRsvp(record: RsvpRecord): Rsvp {
  return {
    id: record.id,
    code: record.code,
    guestName: record.user.full_name,
    attendance: record.status === "accepted" ? "yes" : "no",
    guestCount: record.guest_count,
    updatedAt: record.updated_at.toISOString(),
  };
}

export const rsvpService = {
  async list(): Promise<Rsvp[]> {
    return (await rsvpRepository.findMany()).map(toRsvp);
  },

  async create(input: CreateRsvpInput): Promise<Rsvp | null> {
    const record = await rsvpRepository.create(input);
    return record ? toRsvp(record) : null;
  },
};
