"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { type ResolvedApiError, resolveApiError } from "@/lib/api/error-resolver";
import {
  createBrowserQrCamera,
  readQrImage,
  type ScannerErrorCode,
  scannerErrorCode,
} from "@/lib/qr/browser-scanner";
import type { QrCamera } from "@/lib/qr/camera";
import { invitationTicketService } from "@/services/invitations/invitation-ticket.service";
import type {
  InvitationTicketVerificationDto,
  VerifyInvitationTicketInput,
} from "@/shared/contracts/invitation-ticket";

type ScannerState =
  | { phase: "idle" | "requesting" | "scanning" | "readingImage" | "verifying" }
  | { phase: "result"; result: InvitationTicketVerificationDto }
  | { phase: "scannerError"; code: ScannerErrorCode }
  | { phase: "apiError"; error: ResolvedApiError };

type VerificationRequest = { input: VerifyInvitationTicketInput; signal: AbortSignal };

async function verifyTicket(
  request: VerificationRequest,
): Promise<InvitationTicketVerificationDto> {
  return invitationTicketService.verify(request.input, request.signal);
}

export function useTicketScanner() {
  const canUseCamera = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<QrCamera | null>(null);
  const generationRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const lastValueRef = useRef<string | null>(null);
  const [state, setState] = useState<ScannerState>({ phase: "idle" });
  const { mutateAsync } = useMutation<
    InvitationTicketVerificationDto,
    ResolvedApiError,
    VerificationRequest
  >({
    mutationFn: verifyTicket,
    retry: false,
  });

  const stopWork = useCallback(function stopWork(): void {
    generationRef.current += 1;
    cameraRef.current?.stop();
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  useEffect(() => {
    if (canUseCamera) return;
    stopWork();
    setState({ phase: "idle" });
  }, [canUseCamera, stopWork]);

  useEffect(() => {
    function handleVisibility(): void {
      if (document.visibilityState !== "hidden") return;
      stopWork();
      setState({ phase: "idle" });
    }
    function handlePageHide(): void {
      stopWork();
      setState({ phase: "idle" });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return function cleanup(): void {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      stopWork();
    };
  }, [stopWork]);

  function reset(): void {
    stopWork();
    lastValueRef.current = null;
    setState({ phase: "idle" });
  }

  async function verify(value: string, generation: number): Promise<void> {
    if (generation !== generationRef.current) return;
    cameraRef.current?.stop();
    lastValueRef.current = value;
    const request = new AbortController();
    requestRef.current = request;
    setState({ phase: "verifying" });
    try {
      const result = await mutateAsync({ input: { qrValue: value }, signal: request.signal });
      if (generation === generationRef.current) setState({ phase: "result", result });
    } catch (error: unknown) {
      if (generation !== generationRef.current || request.signal.aborted) return;
      const resolvedError = resolveApiError(error);
      setState({ phase: "apiError", error: resolvedError });
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  }

  async function startCamera(): Promise<void> {
    if (!canUseCamera) return;
    stopWork();
    const video = videoRef.current;
    if (!video) return;
    lastValueRef.current = null;
    const generation = generationRef.current;
    const camera = createBrowserQrCamera(video);
    cameraRef.current = camera;
    setState({ phase: "requesting" });
    function handleDecoded(value: string): void {
      void verify(value, generation);
    }
    function handleError(error: unknown): void {
      if (generation !== generationRef.current) return;
      setState({ phase: "scannerError", code: scannerErrorCode(error) });
    }
    const started = await camera.start(handleDecoded, handleError);
    if (started && generation === generationRef.current) setState({ phase: "scanning" });
  }

  async function scanImage(file: File): Promise<void> {
    stopWork();
    lastValueRef.current = null;
    const generation = generationRef.current;
    setState({ phase: "readingImage" });
    try {
      const value = await readQrImage(file);
      await verify(value, generation);
    } catch (error: unknown) {
      if (generation !== generationRef.current) return;
      setState({ phase: "scannerError", code: scannerErrorCode(error) });
    }
  }

  async function retryVerification(): Promise<void> {
    const value = lastValueRef.current;
    if (!value) return;
    stopWork();
    await verify(value, generationRef.current);
  }

  return { state, videoRef, canUseCamera, startCamera, scanImage, reset, retryVerification };
}
