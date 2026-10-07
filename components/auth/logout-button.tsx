"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth";
import { logout } from "@/services/auth/auth.service";

export function LogoutButton(): ReactElement {
  const t: ReturnType<typeof useTranslations> = useTranslations("DashboardPage");
  const router: ReturnType<typeof useRouter> = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  useAuthSession(true);

  async function handleLogout(): Promise<void> {
    setFailed(false);
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
        {t(isLoggingOut ? "loggingOut" : "logout")}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("logoutFailed")}
        </p>
      )}
    </div>
  );
}
