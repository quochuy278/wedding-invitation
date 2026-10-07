import "dotenv/config";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/features/auth/password";
import { UserLevel } from "@/shared/contracts/auth";
import { generateId } from "@/shared/utils/id";

type PreviewCredentials = { userId: string; email: string; password: string };
const path: string = ".next/auth-preview.json";

async function main(): Promise<void> {
  if (process.argv[2] === "create") {
    const previewId: string = generateId();
    const email: string = `auth-preview-${previewId}@example.invalid`;
    const password: string = randomBytes(32).toString("base64url");
    const passwordHash: string = await hashPassword(password);
    const user: User = await prisma.user.create({
      data: {
        full_name: "Kiểm thử đăng nhập",
        email,
        level: UserLevel.Admin,
        password_hash: passwordHash,
      },
    });
    const credentials: PreviewCredentials = { userId: user.id, email, password };
    await mkdir(".next", { recursive: true });
    await writeFile(path, JSON.stringify(credentials), { mode: 0o600 });
    console.log("Temporary preview user created. Credentials are in the ignored .next directory.");
  } else if (process.argv[2] === "cleanup") {
    const fixture: PreviewCredentials = JSON.parse(
      await readFile(path, "utf8"),
    ) as PreviewCredentials;
    if (!/^auth-preview-[a-z0-9]+@example\.invalid$/.test(fixture.email))
      throw new Error("Unexpected fixture identity.");
    const user: User | null = await prisma.user.findFirst({
      where: { id: fixture.userId, email: fixture.email },
    });
    if (user) {
      await prisma.session.deleteMany({ where: { user_id: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await unlink(path);
    console.log("Temporary preview user and credentials removed.");
  } else {
    throw new Error("Expected create or cleanup.");
  }
}

main()
  .catch((error: unknown): void => {
    console.error(error instanceof Error ? error.name : "PreviewError");
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
