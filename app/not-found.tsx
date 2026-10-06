import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-label text-sm font-semibold tracking-[0.2em] text-primary">404</p>
      <h1 className="font-heading text-4xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        {t("home")}
      </Link>
    </main>
  );
}
