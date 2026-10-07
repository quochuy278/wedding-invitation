import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";

async function main(): Promise<void> {
  let source: string;
  try {
    source = await readFile(".env", "utf8");
  } catch (error: unknown) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    source = "";
  }
  const values: Record<string, string> = parse(source);
  if (values.AUTH_SECRET && Buffer.byteLength(values.AUTH_SECRET, "utf8") < 32) {
    throw new Error("Existing AUTH_SECRET is too short. Remove it and rerun auth:setup.");
  }
  if (!values.AUTH_SECRET) {
    source = source.replace(/^AUTH_SECRET=.*(?:\r?\n|$)/gm, "");
    source += `\nAUTH_SECRET="${randomBytes(48).toString("base64url")}"\n`;
  }
  if (!values.AUTH_ORIGIN) {
    source = source.replace(/^AUTH_ORIGIN=.*(?:\r?\n|$)/gm, "");
    source += 'AUTH_ORIGIN="http://localhost:3000"\n';
  }
  await writeFile(".env", source, { mode: 0o600 });
  console.log("Local auth configuration is ready.");
}

main().catch((error: unknown): void => {
  console.error(error instanceof Error ? error.message : "Auth setup failed.");
  process.exitCode = 1;
});
