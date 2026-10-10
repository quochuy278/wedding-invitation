import "server-only";

import type { CreateWishInput } from "@/shared/contracts/guest-response";
import type { InvitationWishDto } from "@/shared/contracts/invitation";
import { wishRepository } from "./wish.repository";

type WishRecord = { id: string; content: string; created_at: Date };
function toWishDto(wish: WishRecord): InvitationWishDto {
  return { id: wish.id, content: wish.content, createdAt: wish.created_at.toISOString() };
}

export const wishService = {
  async list(code: string): Promise<InvitationWishDto[]> {
    return (await wishRepository.findMany(code)).map(toWishDto);
  },
  async create(input: CreateWishInput): Promise<InvitationWishDto | null> {
    const wish = await wishRepository.create(input);
    return wish ? toWishDto(wish) : null;
  },
};
