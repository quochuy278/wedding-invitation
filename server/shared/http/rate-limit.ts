import "server-only";

import { createHash } from "node:crypto";
import { now } from "@/shared/utils/date";

export type RateLimitPolicy = {
  namespace: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  expiresAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// A per-process burst guard. Deployments with multiple instances also need an edge rate limit.
const buckets: Map<string, RateLimitBucket> = new Map<string, RateLimitBucket>();

export function checkRateLimit(policy: RateLimitPolicy, identity: string): RateLimitResult {
  const currentTime: number = now().valueOf();
  const key: string = createHash("sha256").update(`${policy.namespace}:${identity}`).digest("hex");
  let bucket: RateLimitBucket | undefined = buckets.get(key);
  if (!bucket || bucket.expiresAt <= currentTime) {
    for (const [bucketKey, entry] of buckets) {
      if (entry.expiresAt <= currentTime) buckets.delete(bucketKey);
    }
    if (buckets.size >= 10000 && !bucket) return { allowed: false, retryAfterSeconds: 60 };
    const expiresAt: number = currentTime + policy.windowMs;
    bucket = { count: 0, expiresAt };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= policy.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt - currentTime) / 1000)),
  };
}

export function requestIdentity(request: Request): string {
  // Configure only a single-value IP header that the deployment proxy overwrites.
  const header: string | undefined = process.env.TRUSTED_CLIENT_IP_HEADER;
  const value: string | null = header ? request.headers.get(header) : null;
  return value && value.length <= 128 && !value.includes(",") ? value : "shared";
}
