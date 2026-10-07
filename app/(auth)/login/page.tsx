import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PaperTexture } from "@/components/invitation/invitation-decorations";
import { LoginForm } from "@/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LoginPage");

  return {
    title: t("metadataTitle"),
    description: t("description"),
  };
}

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const couple = useTranslations("Invitation.couple");

  return (
    <div className="relative isolate flex min-h-svh w-full flex-col overflow-clip bg-[#fbf7ef]">
      <PaperTexture />
      <header className="px-6 pt-6 md:px-10 md:pt-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md font-label text-xs text-muted-foreground transition-colors hover:text-wedding-wine focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wedding-dusty-rose motion-reduce:transition-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("backHome")}
        </Link>
      </header>

      <main className="flex w-full flex-1 items-center justify-center px-6 pt-6 pb-12 md:px-10 md:pt-8 md:pb-16">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            aria-label={t("brandAriaLabel")}
            className="mx-auto mb-8 flex w-fit flex-col items-center gap-3 rounded-sm text-wedding-wine outline-offset-4 focus-visible:outline-2 focus-visible:outline-wedding-dusty-rose"
          >
            <span
              className="relative block h-14 w-12 font-heading text-[42px] leading-none"
              aria-hidden="true"
            >
              <span>{couple("groom").charAt(0)}</span>
              <span className="absolute top-5 left-5 text-[36px]">{couple("bride").charAt(0)}</span>
            </span>
            <span className="font-label text-[10px] tracking-[0.2em] uppercase" aria-hidden="true">
              {couple("groom")} & {couple("bride")}
            </span>
          </Link>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
