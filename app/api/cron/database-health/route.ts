import { ApiErrorCode, type ApiErrorResponse } from "@/lib/api/types";
import { databaseHealthService } from "@/server/features/health/database-health.service";
import { ok } from "@/server/shared/http/api-response";

export const maxDuration = 30;

function cronError(code: ApiErrorCode, message: string, status: number): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  const headers: HeadersInit = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  return Response.json(body, { status, headers });
}

export async function GET(request: Request): Promise<Response> {
  const secret: string | undefined = process.env.CRON_SECRET;
  const authorization: string | null = request.headers.get("authorization");
  if (!secret?.trim() || authorization !== `Bearer ${secret}`) {
    return cronError(ApiErrorCode.Unauthorized, "A valid cron secret is required.", 401);
  }

  try {
    const result = await databaseHealthService.check();
    const status: number = result.status === "ok" ? 200 : 503;
    return ok(result, status);
  } catch {
    console.error("Database health request failed.");
    return cronError(ApiErrorCode.Unavailable, "Database health check is unavailable.", 503);
  }
}
