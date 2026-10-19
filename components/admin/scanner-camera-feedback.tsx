import {
  CheckCircle2Icon,
  Loader2Icon,
  ScanLineIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import type { ReactElement } from "react";
import type { InvitationTicketVerificationDto } from "@/shared/contracts/invitation-ticket";

export function ScannerCameraStatus({
  phase,
  label,
}: {
  phase: "requesting" | "scanning" | "verifying";
  label: string;
}): ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-lg bg-black/80 px-3 py-2 text-sm text-white"
      role="status"
    >
      {phase === "scanning" ? (
        <ScanLineIcon aria-hidden="true" className="size-4 shrink-0" />
      ) : (
        <Loader2Icon aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin" />
      )}
      <span>{label}</span>
    </div>
  );
}

export function ScannerCameraResult({
  result,
  title,
}: {
  result: InvitationTicketVerificationDto;
  title: string;
}): ReactElement {
  const recorded = result.isValid && result.checkIn === "recorded";
  const background = !result.isValid ? "bg-red-950" : recorded ? "bg-emerald-950" : "bg-amber-950";
  const iconColor = !result.isValid
    ? "text-red-300"
    : recorded
      ? "text-emerald-300"
      : "text-amber-300";
  const ResultIcon = !result.isValid ? XCircleIcon : recorded ? CheckCircle2Icon : ShieldCheckIcon;
  const animation = recorded
    ? "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-500"
    : "";

  return (
    <div
      aria-atomic="true"
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white ${background}`}
      role="status"
    >
      <div className={`rounded-full bg-white/10 p-3 ${iconColor} ${animation}`}>
        <ResultIcon aria-hidden="true" className="size-12" />
      </div>
      <div className="min-w-0 space-y-1">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {result.isValid && (
          <p className="line-clamp-2 break-words text-base font-medium">
            {result.invitation.guestName}
          </p>
        )}
      </div>
    </div>
  );
}
