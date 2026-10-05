import type { ReactNode } from "react";
import { PaperTexture } from "@/components/invitation/invitation-decorations";
import { InvitationHeader } from "@/components/invitation/invitation-header";

export default function InvitationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-clip bg-[#fbf7ef] font-body text-[#66504a] [line-height:1.5] [&_section]:scroll-mt-8 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-wedding-dusty-rose">
      <PaperTexture />
      <a
        href="#noi-dung"
        className="absolute top-2 left-3 z-20 -translate-y-[150%] bg-[#fbf7ef] px-4 py-2 text-wedding-wine focus:translate-y-0"
      >
        Đến nội dung thiệp mời
      </a>
      <InvitationHeader />
      <main id="noi-dung">{children}</main>
    </div>
  );
}
