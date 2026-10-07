import "dotenv/config";

import { createInterface, type Interface } from "node:readline/promises";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/features/auth/password";
import { UserLevel } from "@/shared/contracts/auth";
import { now } from "@/shared/utils/date";

type ResolveSecret = (value: string) => void;
type RejectSecret = (reason: Error) => void;
type ResolveFlush = () => void;

function flushOutput(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise<void>((resolve: ResolveFlush): void => {
    stream.write("", resolve);
  });
}

function readSecret(label: string): Promise<string> {
  return new Promise<string>((resolve: ResolveSecret, reject: RejectSecret): void => {
    let value: string = "";
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.ref();
    process.stdin.resume();

    function finish(): void {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.unref();
      process.stdout.write("\n");
    }

    function onData(chunk: string): void {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else if (value.length < 1024) value += character;
      }
    }
    process.stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY) throw new Error("Run admin:create in an interactive terminal.");
  const prompt: Interface = createInterface({ input: process.stdin, output: process.stdout });
  let email: string;
  let fullName: string;
  let existing: User | null;
  try {
    email = (await prompt.question("Email: ")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new Error("Invalid email.");
    fullName = (await prompt.question("Full name: ")).trim();
    if (!fullName || fullName.length > 200)
      throw new Error("Full name must contain 1–200 characters.");
    existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existing) {
      if (existing.deleted_at)
        throw new Error("This user has been deleted. Restore it before granting access.");
      const confirmation: string = await prompt.question(
        "User exists. Grant admin access and replace password? [y/N]: ",
      );
      if (confirmation.trim().toLowerCase() !== "y") throw new Error("Cancelled.");
    }
  } finally {
    prompt.close();
  }
  const password: string = await readSecret("Password (at least 12 characters, hidden): ");
  const confirmation: string = await readSecret("Confirm password (hidden): ");
  if (password.length < 12 || password !== confirmation)
    throw new Error("Passwords must match and contain at least 12 characters.");
  const passwordHash: string = await hashPassword(password);
  if (existing) {
    const revokedAt: Date = now().toDate();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: { full_name: fullName, level: UserLevel.Admin, password_hash: passwordHash },
      }),
      prisma.session.updateMany({
        where: { user_id: existing.id, revoked_at: null },
        data: { revoked_at: revokedAt },
      }),
    ]);
  } else {
    await prisma.user.create({
      data: { full_name: fullName, email, level: UserLevel.Admin, password_hash: passwordHash },
    });
  }
  console.log("Admin account is ready.");
}

main()
  .catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : "Could not create admin account.");
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
    process.stdin.destroy();
    await Promise.all([flushOutput(process.stdout), flushOutput(process.stderr)]);
    // Windows terminal/loader handles can remain active after hidden input.
    process.exit(process.exitCode ?? 0);
  });
