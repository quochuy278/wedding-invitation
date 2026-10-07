"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  MailPlusIcon,
  MenuIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

type NavigationLabel = "overview" | "createInvitation" | "invitations";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: NavigationLabel;
};

type AdminShellProps = {
  children: ReactNode;
  fullName: string;
};

type AdminNavigationItemProps = {
  isActive: boolean;
  item: NavigationItem;
  label: string;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    label: "overview",
  },
  {
    href: "/dashboard/invitations/new",
    icon: MailPlusIcon,
    label: "createInvitation",
  },
  {
    href: "/dashboard/invitations",
    icon: ListChecksIcon,
    label: "invitations",
  },
];

function AdminNavigationItem({ isActive, item, label }: AdminNavigationItemProps): ReactElement {
  const { setOpenMobile } = useSidebar();
  const Icon: LucideIcon = item.icon;

  function handleNavigation(): void {
    setOpenMobile(false);
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link href={item.href} onClick={handleNavigation} />}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminSidebarTrigger(): ReactElement {
  const t: ReturnType<typeof useTranslations> = useTranslations("Admin.sidebar");
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      aria-label={t("toggle")}
      onClick={toggleSidebar}
      size="icon"
      title={t("toggle")}
      type="button"
      variant="ghost"
    >
      <MenuIcon />
      <span className="sr-only">{t("toggle")}</span>
    </Button>
  );
}

export function AdminShell({ children, fullName }: AdminShellProps): ReactElement {
  const pathname: string = usePathname();
  const t: ReturnType<typeof useTranslations> = useTranslations("Admin.sidebar");
  const activeItem: NavigationItem =
    NAVIGATION_ITEMS.find((item: NavigationItem): boolean => item.href === pathname) ??
    NAVIGATION_ITEMS[0];

  function renderNavigationItem(item: NavigationItem): ReactElement {
    const label: string = t(item.label);
    const isActive: boolean = item.href === pathname;

    return <AdminNavigationItem isActive={isActive} item={item} key={item.href} label={label} />;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-12"
                render={<Link href="/dashboard" />}
                size="lg"
                tooltip={t("brand")}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-heading text-sm text-sidebar-primary-foreground">
                  H&P
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-heading text-base">{t("brand")}</span>
                  <span className="truncate text-xs text-sidebar-foreground/65">
                    {t("subtitle")}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{NAVIGATION_ITEMS.map(renderNavigationItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={fullName}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
                  <UserRoundIcon className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">{fullName}</span>
                  <span className="truncate text-xs text-sidebar-foreground/65">
                    {t("administrator")}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <AdminSidebarTrigger />
          <Separator className="h-5" orientation="vertical" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{t(activeItem.label)}</p>
          <LogoutButton />
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
