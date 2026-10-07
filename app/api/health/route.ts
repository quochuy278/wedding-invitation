import { now } from "@/shared/utils/date";

export function GET() {
  const timestamp: string = now().toISOString();
  return Response.json({
    data: {
      status: "ok",
      timestamp,
    },
  });
}
