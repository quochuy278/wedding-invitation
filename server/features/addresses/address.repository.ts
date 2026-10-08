import "server-only";

import type { Address, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export const addressRepository = {
  list(): Promise<Address[]> {
    return prisma.address.findMany({ orderBy: [{ created_at: "desc" }, { id: "desc" }] });
  },
  create(data: Prisma.AddressCreateInput): Promise<Address> {
    return prisma.address.create({ data });
  },
};
