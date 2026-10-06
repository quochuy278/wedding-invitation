export const apiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api",
  timeout: 15_000,
};
