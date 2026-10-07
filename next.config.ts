import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

type ResponseHeader = { key: string; value: string };
type HeaderRule = { source: string; headers: ResponseHeader[] };

const nextConfig: NextConfig = {
  async headers(): Promise<HeaderRule[]> {
    return [
      { source: "/invitation/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
