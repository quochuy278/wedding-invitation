import "dotenv/config";

import { readFile, unlink, writeFile } from "node:fs/promises";
import { prisma } from "@/server/db/prisma";
import { invitationCodeGenerator } from "@/server/features/invitations/invitation-code";
import { invitationTicketService } from "@/server/features/invitations/invitation-ticket.service";
import { generateId } from "@/shared/utils/id";

const path = ".next/guest-response-preview.json";
type Fixture = {
  invitationId: string;
  userId: string;
  addressId: string;
  email: string;
  code: string;
};

async function readFixture(): Promise<Fixture> {
  const fixture: Fixture = JSON.parse(await readFile(path, "utf8"));
  if (!/^guest-response-preview-[a-z0-9]+@example\.invalid$/.test(fixture.email)) {
    throw new Error("Not an isolated guest response fixture.");
  }
  const user = await prisma.user.findUnique({ where: { id: fixture.userId } });
  const invitation = await prisma.invitation.findUnique({ where: { id: fixture.invitationId } });
  if (
    user?.email !== fixture.email ||
    invitation?.user_id !== user.id ||
    invitation.address_id !== fixture.addressId
  ) {
    throw new Error("Fixture identity no longer matches.");
  }
  return fixture;
}

try {
  if (process.argv[2] === "create") {
    try {
      await readFile(path);
      throw new Error("Clean up the previous fixture first.");
    } catch (error: unknown) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    const fixture = await prisma.$transaction(async (database): Promise<Fixture> => {
      const address = await database.address.create({
        data: {
          name: "Địa điểm kiểm thử",
          address_text: "Địa chỉ kiểm thử flow",
          event_at: new Date(Date.now() + 30 * 86_400_000),
          event_time_zone: "Asia/Ho_Chi_Minh",
        },
      });
      const user = await database.user.create({
        data: {
          full_name: "Khách kiểm thử flow",
          email: `guest-response-preview-${generateId()}@example.invalid`,
        },
      });
      const invitation = await database.invitation.create({
        data: {
          code: invitationCodeGenerator.generate(),
          user_id: user.id,
          address_id: address.id,
          status: "pending",
          guest_count: 0,
          expires_at: new Date(Date.now() + 86_400_000),
          created_at: new Date(Date.now() + 3_600_000),
        },
      });
      return {
        invitationId: invitation.id,
        userId: user.id,
        addressId: address.id,
        email: user.email,
        code: invitation.code,
      };
    });
    await writeFile(path, JSON.stringify(fixture), { mode: 0o600 });
    console.log(`Isolated invitation fixture: /invitation/${fixture.code}`);
  } else {
    const fixture = await readFixture();
    if (process.argv[2] === "expire") {
      await prisma.invitation.update({
        where: { id: fixture.invitationId },
        data: { expires_at: new Date(Date.now() - 1000) },
      });
      console.log("Isolated invitation expired for testing.");
    } else if (process.argv[2] === "check-in") {
      const ticket = await invitationTicketService.getByCode(fixture.code);
      if (!ticket) throw new Error("Fixture ticket is unavailable.");
      const result = await invitationTicketService.verifyForAdmin(ticket.qrValue);
      console.log(JSON.stringify(result));
    } else if (process.argv[2] === "inspect") {
      const invitation = await prisma.invitation.findUniqueOrThrow({
        where: { id: fixture.invitationId },
        select: { status: true, guest_count: true, wishes: { select: { content: true } } },
      });
      console.log(JSON.stringify(invitation));
    } else if (process.argv[2] === "cleanup") {
      await prisma.$transaction([
        prisma.wish.deleteMany({ where: { invitation_id: fixture.invitationId } }),
        prisma.invitation.delete({ where: { id: fixture.invitationId } }),
        prisma.user.delete({ where: { id: fixture.userId } }),
        prisma.address.delete({ where: { id: fixture.addressId } }),
      ]);
      await unlink(path);
      console.log("Isolated guest response fixture removed.");
    } else {
      throw new Error("Use create, inspect, check-in, expire or cleanup.");
    }
  }
} finally {
  await prisma.$disconnect();
}
