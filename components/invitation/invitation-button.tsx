import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InvitationArrowIcon } from "./invitation-icons";

type InvitationButtonProps = Omit<ComponentProps<typeof Button>, "className"> & {
  className?: string;
  leadingIcon?: ReactNode;
  showArrow?: boolean;
};

export function InvitationButton({
  children,
  className,
  leadingIcon,
  showArrow = true,
  ...props
}: InvitationButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      {...props}
      className={cn(
        "h-auto min-h-11 min-w-[246px] cursor-pointer gap-5 rounded-lg border-[#fff8ee] bg-linear-to-r from-[#810e2d] to-[#710820] px-6 py-2.5 font-body text-[15px] font-normal text-[#fff8ee] hover:from-[#65051d] hover:to-[#65051d] motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
    >
      {leadingIcon}
      {children}
      {showArrow && <InvitationArrowIcon />}
    </Button>
  );
}
