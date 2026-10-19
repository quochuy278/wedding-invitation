export type QrCamera = {
  start(onDecoded: (value: string) => void, onError: (error: unknown) => void): Promise<boolean>;
  stop(): void;
};

type CameraStream = { getTracks(): { stop(): void }[] };

export const QR_CAMERA_SESSION_TIMEOUT_MS = 60_000;

export class QrCameraTimeoutError extends Error {
  constructor() {
    super("The camera session timed out without a QR code");
    this.name = "QrCameraTimeoutError";
  }
}

export type QrCameraDependencies<Stream extends CameraStream> = {
  acquire(): Promise<Stream>;
  attach(stream: Stream): Promise<void>;
  detach(stream: Stream): void;
  capture(): string | null;
  schedule(callback: () => void, delayMs?: number): number;
  cancel(timer: number): void;
};

// Own the stream as soon as permission resolves, including while video.play() is pending.
export function createQrCamera<Stream extends CameraStream>(
  dependencies: QrCameraDependencies<Stream>,
): QrCamera {
  let generation = 0;
  let stream: Stream | null = null;
  let timer: number | null = null;
  let timeoutTimer: number | null = null;

  function release(ownedStream: Stream): void {
    for (const track of ownedStream.getTracks()) track.stop();
    dependencies.detach(ownedStream);
  }

  function stop(): void {
    generation += 1;
    if (timer !== null) dependencies.cancel(timer);
    if (timeoutTimer !== null) dependencies.cancel(timeoutTimer);
    timer = null;
    timeoutTimer = null;
    const ownedStream = stream;
    stream = null;
    if (ownedStream) release(ownedStream);
  }

  async function start(
    onDecoded: (value: string) => void,
    onError: (error: unknown) => void,
  ): Promise<boolean> {
    stop();
    const currentGeneration = generation;
    try {
      timeoutTimer = dependencies.schedule(() => {
        if (currentGeneration !== generation) return;
        stop();
        onError(new QrCameraTimeoutError());
      }, QR_CAMERA_SESSION_TIMEOUT_MS);
      const acquired = await dependencies.acquire();
      if (currentGeneration !== generation) {
        release(acquired);
        return false;
      }
      stream = acquired;
      await dependencies.attach(acquired);
      if (currentGeneration !== generation) return false;

      function capture(): void {
        if (currentGeneration !== generation) return;
        try {
          const value = dependencies.capture();
          if (value !== null) {
            stop();
            onDecoded(value);
            return;
          }
          timer = dependencies.schedule(capture);
        } catch (error: unknown) {
          stop();
          onError(error);
        }
      }

      timer = dependencies.schedule(capture);
      return true;
    } catch (error: unknown) {
      if (currentGeneration !== generation) return false;
      stop();
      onError(error);
      return false;
    }
  }

  return { start, stop };
}
