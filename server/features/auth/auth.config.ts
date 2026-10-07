import "server-only";

export type AuthConfig = {
  secret: Uint8Array;
  issuer: string;
  accessLifetimeSeconds: number;
  sessionLifetimeSeconds: number;
};

export function getAuthConfig(): AuthConfig {
  const secret: string | undefined = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes. See docs/auth.md.");
  }
  return {
    secret: new TextEncoder().encode(secret),
    issuer: "wedding-invitation",
    accessLifetimeSeconds: 15 * 60,
    sessionLifetimeSeconds: 7 * 24 * 60 * 60,
  };
}

export function hasTrustedOrigin(request: Request): boolean {
  const origin: string | null = request.headers.get("origin");
  const configuredOrigin: string | undefined = process.env.AUTH_ORIGIN;
  if (
    !origin ||
    origin === "null" ||
    (!configuredOrigin && process.env.NODE_ENV === "production")
  ) {
    return false;
  }
  try {
    const trustedOrigin: string = new URL(configuredOrigin ?? request.url).origin;
    return origin === trustedOrigin && request.headers.get("sec-fetch-site") !== "cross-site";
  } catch {
    return false;
  }
}
