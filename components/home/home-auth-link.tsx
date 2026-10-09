"use client";

import { ArrowUpRight, LayoutDashboard, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuthSession } from "@/hooks/use-auth";

export function HomeAuthLink() {
  const t = useTranslations("HomePage");
  const { session } = useAuthSession();
  const isAuthenticated = session !== null;
  const Icon = isAuthenticated ? LayoutDashboard : LockKeyhole;

  return (
    <Link
      href={isAuthenticated ? "/dashboard" : "/login"}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-wedding-wine/20 px-4 font-label text-xs text-wedding-wine transition-colors hover:border-wedding-wine/40 hover:bg-wedding-wine/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wedding-dusty-rose motion-reduce:transition-none sm:px-5"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {t(isAuthenticated ? "dashboard" : "adminLogin")}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
