import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/features/auth/password";
import { UserLevel } from "@/shared/contracts/auth";
import type { CreateUserInput, UserDto } from "@/shared/contracts/user";

export class UserContactConflict extends Error {}

export async function createUser(input: CreateUserInput): Promise<UserDto> {
  const contacts: Prisma.UserWhereInput[] = [
    { email: { equals: input.email, mode: "insensitive" } },
  ];
  if (input.phoneNumber) contacts.push({ phone_number: input.phoneNumber });
  const existing = await prisma.user.findFirst({ where: { OR: contacts }, select: { id: true } });
  if (existing) throw new UserContactConflict();
  const passwordHash =
    input.level === UserLevel.Admin && input.password ? await hashPassword(input.password) : null;
  try {
    const user = await prisma.user.create({
      data: {
        full_name: input.fullName,
        email: input.email,
        phone_number: input.phoneNumber,
        level: input.level,
        password_hash: passwordHash,
      },
      select: { id: true, full_name: true, email: true, phone_number: true, level: true },
    });
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      level: user.level,
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new UserContactConflict();
    throw error;
  }
}
