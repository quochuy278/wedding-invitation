import "server-only";

type ErrorDetail = {
  field: string;
  message: string;
};

export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export function badRequest(message: string, details?: ErrorDetail[]) {
  return Response.json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        ...(details ? { details } : {}),
      },
    },
    { status: 400 },
  );
}
