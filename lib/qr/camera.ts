export type QrCamera = {
  start(onDecoded: (value: string) => void, onError: (error: unknown) => void): Promise<boolean>;
  stop(): void;
};

type CameraStream = { getTracks(): { stop(): void }[] };

export type QrCameraDependencies<Stream extends CameraStream> = {
  acquire(): Promise<Stream>;
  attach(stream: Stream): Promise<void>;
  detach(stream: Stream): void;
  capture(): string | null;
  schedule(callback: () => void): number;
  cancel(timer: number): void;
};

// Own the stream as soon as permission resolves, including while video.play() is pending.
export function createQrCamera<Stream extends CameraStream>(
  dependencies: QrCameraDependencies<Stream>,
): QrCamera {
  let generation = 0;
  let stream: Stream | null = null;
  let timer: number | null = null;

  function release(ownedStream: Stream): void {
    for (const track of ownedStream.getTracks()) track.stop();
    dependencies.detach(ownedStream);
  }

  function stop(): void {
    generation += 1;
    if (timer !== null) dependencies.cancel(timer);
    timer = null;
    if (stream) release(stream);
    stream = null;
  }

  async function start(
    onDecoded: (value: string) => void,
    onError: (error: unknown) => void,
  ): Promise<boolean> {
    stop();
    const currentGeneration = generation;
    try {
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
