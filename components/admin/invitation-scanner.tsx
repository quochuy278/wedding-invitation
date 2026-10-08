"use client";

import {
  CameraIcon,
  CheckCircle2Icon,
  ImagePlusIcon,
  Loader2Icon,
  ScanLineIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ChangeEvent, type ReactElement, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTicketScanner } from "@/hooks/use-ticket-scanner";
import type {
  InvitationTicketVerificationDto,
  VerifiedInvitationTicketDto,
} from "@/shared/contracts/invitation-ticket";

function VerifiedTicket({ invitation }: { invitation: VerifiedInvitationTicketDto }): ReactElement {
  const t = useTranslations("Admin.scan");
  const statuses = useTranslations("Admin.invitations");
  const { address } = invitation;
  const timeZone = address.eventTimeZone ?? "Asia/Ho_Chi_Minh";
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  };
  const eventTime = new Intl.DateTimeFormat("vi-VN", dateOptions).format(new Date(address.eventAt));
  const expiryTime = new Intl.DateTimeFormat("vi-VN", dateOptions).format(
    new Date(invitation.expiresAt),
  );
  const knownStatus = ["accepted", "pending", "declined"].includes(invitation.status);
  const statusLabel = knownStatus ? statuses(invitation.status) : invitation.status;
  const invitationHref = `/invitation/${invitation.code}`;
  const floorLabel = address.floor ? t("floorValue", { value: address.floor }) : null;
  const entranceLabel = address.entrance ? t("entranceValue", { value: address.entrance }) : null;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("guest")}
        </p>
        <p className="mt-1 break-words font-heading text-2xl">{invitation.guestName}</p>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("code")}</dt>
          <dd className="mt-1 font-mono text-lg font-semibold tracking-widest">
            {invitation.code}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("status")}</dt>
          <dd className="mt-1">
            <Badge variant="secondary">{statusLabel}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("guests")}</dt>
          <dd className="mt-1">{invitation.guestCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("expiresAt")}</dt>
          <dd className="mt-1">{expiryTime}</dd>
        </div>
      </dl>
      <div className="space-y-1 border-t pt-4 text-sm">
        <p className="font-medium">{address.name}</p>
        <p>
          {eventTime} · {timeZone}
        </p>
        <p className="whitespace-pre-line break-words text-muted-foreground">
          {address.addressText}
        </p>
        {floorLabel && <p>{floorLabel}</p>}
        {entranceLabel && <p>{entranceLabel}</p>}
        {address.instructions && (
          <p className="whitespace-pre-line break-words">{address.instructions}</p>
        )}
      </div>
      <Link
        className="inline-flex text-sm font-medium text-primary underline underline-offset-4"
        href={invitationHref}
        prefetch={false}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("viewInvitation")}
      </Link>
    </div>
  );
}

function ScanResult({ result }: { result: InvitationTicketVerificationDto }): ReactElement {
  const t = useTranslations("Admin.scan");
  const title = result.isValid ? t("validTitle") : t("invalidTitle");
  const description = result.isValid ? t("validDescription") : t("invalidDescription");
  const color = result.isValid ? "text-emerald-700" : "text-destructive";
  const iconClassName = `mt-0.5 size-6 shrink-0 ${color}`;
  const titleClassName = `font-heading text-xl ${color}`;
  const ResultIcon = result.isValid ? CheckCircle2Icon : XCircleIcon;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3" role="status">
        <ResultIcon className={iconClassName} />
        <div>
          <h2 className={titleClassName}>{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {result.isValid && <VerifiedTicket invitation={result.invitation} />}
    </div>
  );
}

export function InvitationScanner(): ReactElement {
  const t = useTranslations("Admin.scan");
  const apiErrors = useTranslations("ApiErrors");
  const scanner = useTicketScanner();
  const fileRef = useRef<HTMLInputElement>(null);
  const { state } = scanner;
  const cameraActive = state.phase === "requesting" || state.phase === "scanning";
  const processing = state.phase === "readingImage" || state.phase === "verifying";
  const busy = cameraActive || processing;
  const busyLabel = busy ? t(state.phase) : "";
  const cameraClassName = cameraActive ? "h-full w-full object-cover" : "hidden";
  const cameraError =
    state.phase === "scannerError" &&
    !["invalidImage", "imageTooLarge", "noQr"].includes(state.code);
  const cameraButtonLabel = cameraError ? t("retryCamera") : t("startCamera");
  const cameraDisabled = !scanner.canUseCamera;
  const cameraOffLabel = cameraDisabled ? t("desktopCameraOff") : t("cameraOff");
  const permissionHint = cameraDisabled ? t("desktopCameraHint") : t("permissionHint");

  function handleStartCamera(): void {
    void scanner.startCamera();
  }
  function handleChooseImage(): void {
    fileRef.current?.click();
  }
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void scanner.scanImage(file);
  }
  function handleRetry(): void {
    void scanner.retryVerification();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("cameraTitle")}</CardTitle>
            <CardDescription>{t("cameraDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-950">
              <video
                aria-label={t("cameraPreview")}
                className={cameraClassName}
                muted
                playsInline
                ref={scanner.videoRef}
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-zinc-300">
                  <ScanLineIcon className="size-14 stroke-1" />
                  <p className="text-sm">{cameraOffLabel}</p>
                </div>
              )}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-white/70" />
              )}
              {busy && (
                <div
                  className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-lg bg-black/70 px-3 py-2 text-sm text-white"
                  role="status"
                >
                  <Loader2Icon className="size-4 animate-spin" />
                  {busyLabel}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!busy && (
                <Button
                  aria-describedby="scanner-camera-hint"
                  disabled={cameraDisabled}
                  onClick={handleStartCamera}
                  type="button"
                >
                  <CameraIcon />
                  {cameraButtonLabel}
                </Button>
              )}
              {!busy && (
                <Button onClick={handleChooseImage} type="button" variant="outline">
                  <ImagePlusIcon />
                  {t("chooseImage")}
                </Button>
              )}
              {busy && (
                <Button onClick={scanner.reset} type="button" variant="outline">
                  {t("stop")}
                </Button>
              )}
              <input
                accept="image/png,image/jpeg,image/webp"
                aria-label={t("chooseImage")}
                className="hidden"
                onChange={handleFileChange}
                ref={fileRef}
                type="file"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground" id="scanner-camera-hint">
              {permissionHint}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("imageHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("resultTitle")}</CardTitle>
            <CardDescription>{t("resultDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.phase === "result" ? (
              <ScanResult result={state.result} />
            ) : (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                {busy ? busyLabel : t("waiting")}
              </div>
            )}
            {state.phase === "scannerError" && (
              <p className="rounded-lg bg-destructive/5 p-4 text-sm text-destructive" role="alert">
                {t(`errors.${state.code}`)}
              </p>
            )}
            {state.phase === "apiError" && (
              <div className="space-y-3" role="alert">
                <p className="text-sm text-destructive">{apiErrors(state.error.code)}</p>
                <Button onClick={handleRetry} type="button" variant="outline">
                  {t("retryVerification")}
                </Button>
              </div>
            )}
            {state.phase === "result" && (
              <Button onClick={scanner.reset} type="button" variant="outline">
                <ScanLineIcon />
                {t("scanNext")}
              </Button>
            )}
            <div className="flex gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
              <p>{t("verificationHint")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
