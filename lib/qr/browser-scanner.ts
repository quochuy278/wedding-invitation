import jsQR from "jsqr";
import { createQrCamera, type QrCamera } from "./camera";

export type ScannerErrorCode =
  | "insecure"
  | "unsupported"
  | "denied"
  | "missing"
  | "busy"
  | "cameraFailed"
  | "invalidImage"
  | "imageTooLarge"
  | "noQr";

export class ScannerError extends Error {
  constructor(public readonly code: ScannerErrorCode) {
    super(code);
    this.name = "ScannerError";
  }
}

export function scannerErrorCode(error: unknown): ScannerErrorCode {
  if (error instanceof ScannerError) return error.code;
  if (error instanceof Error) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "denied";
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") return "missing";
    if (error.name === "NotReadableError" || error.name === "AbortError") return "busy";
  }
  return "cameraFailed";
}

export function decodeQrPixels(pixels: ImageData): string | null {
  const decoded = jsQR(pixels.data, pixels.width, pixels.height, {
    inversionAttempts: "attemptBoth",
  });
  return decoded?.data ?? null;
}

function captureQr(
  source: CanvasImageSource,
  width: number,
  height: number,
  canvas: HTMLCanvasElement,
  maximumSize: number,
): string | null {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new ScannerError("unsupported");
  const scale = Math.min(1, maximumSize / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return decodeQrPixels(pixels);
}

export function createBrowserQrCamera(video: HTMLVideoElement): QrCamera {
  const canvas = document.createElement("canvas");

  async function acquire(): Promise<MediaStream> {
    if (!window.isSecureContext) throw new ScannerError("insecure");
    if (!navigator.mediaDevices?.getUserMedia) throw new ScannerError("unsupported");
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async function attach(stream: MediaStream): Promise<void> {
    video.srcObject = stream;
    await video.play();
  }

  function detach(stream: MediaStream): void {
    if (video.srcObject !== stream) return;
    video.pause();
    video.srcObject = null;
  }

  function capture(): string | null {
    const stream = video.srcObject;
    const hasEnded = stream instanceof MediaStream && stream.getVideoTracks().every(trackEnded);
    if (hasEnded) throw new ScannerError("cameraFailed");
    const frameReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    if (!frameReady) return null;
    return captureQr(video, video.videoWidth, video.videoHeight, canvas, 960);
  }

  function trackEnded(track: MediaStreamTrack): boolean {
    return track.readyState === "ended";
  }

  function schedule(callback: () => void): number {
    return window.setTimeout(callback, 160);
  }

  function cancel(timer: number): void {
    window.clearTimeout(timer);
  }

  return createQrCamera({ acquire, attach, detach, capture, schedule, cancel });
}

export async function readQrImage(file: File): Promise<string> {
  const supportedType = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (!supportedType) throw new ScannerError("invalidImage");
  if (file.size > 10 * 1024 * 1024) throw new ScannerError("imageTooLarge");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ScannerError("invalidImage");
  }
  try {
    if (bitmap.width * bitmap.height > 25000000) throw new ScannerError("imageTooLarge");
    const canvas = document.createElement("canvas");
    const value = captureQr(bitmap, bitmap.width, bitmap.height, canvas, 2048);
    if (value === null) throw new ScannerError("noQr");
    return value;
  } finally {
    bitmap.close();
  }
}
