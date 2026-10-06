import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("DashboardPage");

  return <h1>{t("title")}</h1>;
}
