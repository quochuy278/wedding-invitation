import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PaperTexture } from "@/components/invitation/invitation-decorations";
import { InvitationHeader } from "@/components/invitation/invitation-header";

export default function InvitationLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Invitation.layout");

  return (
    <div className="relative isolate min-h-screen overflow-clip bg-[#fbf7ef] font-body text-[#66504a] [line-height:1.5] [&_section]:scroll-mt-8 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-wedding-dusty-rose">
      <PaperTexture />
      <a
        href="#invitation-content"
        className="absolute top-2 left-3 z-20 -translate-y-[150%] bg-[#fbf7ef] px-4 py-2 text-wedding-wine focus:translate-y-0"
      >
        {t("skipToContent")}
      </a>
      <InvitationHeader />
      <main id="invitation-content">{children}</main>
    </div>
  );
}
