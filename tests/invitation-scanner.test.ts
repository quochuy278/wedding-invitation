import assert from "node:assert/strict";
import test from "node:test";
import { PNG } from "pngjs";
import { decodeQrPixels, ScannerError, scannerErrorCode } from "@/lib/qr/browser-scanner";
import { createQrCamera, QrCameraTimeoutError } from "@/lib/qr/camera";
import { renderInvitationTicketQr } from "@/server/features/invitations/invitation-ticket.qr";
import { parseVerifyInvitationTicketInput } from "@/server/features/invitations/invitation-ticket.schema";

function unexpectedError(error: unknown): never {
  assert.fail(String(error));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function cameraFixture() {
  let stopped = 0;
  let attached = 0;
  let detached = 0;
  let acquired = 0;
  const frames: (string | null | Error)[] = [];
  const tasks = new Map<number, { at: number; callback: () => void }>();
  let currentTime = 0;
  let nextTimer = 0;
  const stream = {
    getTracks: () => [
      {
        stop: () => {
          stopped += 1;
        },
      },
    ],
  };
  const dependencies = {
    async acquire() {
      acquired += 1;
      return stream;
    },
    async attach() {
      attached += 1;
    },
    detach() {
      detached += 1;
    },
    capture() {
      const frame = frames.shift() ?? null;
      if (frame instanceof Error) throw frame;
      return frame;
    },
    schedule(callback: () => void, delayMs = 160) {
      nextTimer += 1;
      tasks.set(nextTimer, { at: currentTime + delayMs, callback });
      return nextTimer;
    },
    cancel(timer: number) {
      tasks.delete(timer);
    },
  };
  function tick() {
    const entry = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    assert.ok(entry);
    tasks.delete(entry[0]);
    currentTime = entry[1].at;
    entry[1].callback();
  }
  function elapse(milliseconds: number) {
    const until = currentTime + milliseconds;
    while ([...tasks.values()].some((task) => task.at <= until)) tick();
    currentTime = until;
  }
  return {
    stream,
    dependencies,
    frames,
    tasks,
    tick,
    elapse,
    stats: () => ({ stopped, attached, detached, acquired }),
  };
}

test("verification input is bounded and preserves the exact signed QR bytes", () => {
  const qrValue = "WIT1.AB12CD.test.signature\n";
  assert.deepEqual(parseVerifyInvitationTicketInput({ qrValue }), {
    success: true,
    data: { qrValue },
  });
  for (const input of [
    null,
    [],
    {},
    { qrValue: 1 },
    { qrValue: "" },
    { qrValue: "x".repeat(257) },
  ]) {
    assert.equal(parseVerifyInvitationTicketInput(input).success, false);
  }
  assert.equal(parseVerifyInvitationTicketInput({ qrValue: "x".repeat(256) }).success, true);
});

test("the client pixel decoder reads the actual ticket PNG and ignores images without QR", async () => {
  const token = "WIT1.AB12CD.test.signature";
  const png = PNG.sync.read(
    Buffer.from((await renderInvitationTicketQr(token)).split(",")[1], "base64"),
  );
  const pixels: ImageData = {
    data: new Uint8ClampedArray(png.data),
    width: png.width,
    height: png.height,
    colorSpace: "srgb",
  };
  assert.equal(decodeQrPixels(pixels), token);
  pixels.data.fill(255);
  assert.equal(decodeQrPixels(pixels), null);
});

test("camera access starts explicitly, emits one QR and releases all resources", async () => {
  const fixture = cameraFixture();
  const camera = createQrCamera(fixture.dependencies);
  const decoded: string[] = [];
  const errors: unknown[] = [];
  assert.equal(fixture.stats().acquired, 0);
  assert.equal(
    await camera.start(
      (value) => {
        assert.equal(fixture.stats().stopped, 1, "stop the camera before reporting the QR");
        assert.equal(fixture.stats().detached, 1, "detach the video before reporting the QR");
        decoded.push(value);
      },
      (error) => errors.push(error),
    ),
    true,
  );
  fixture.frames.push(null, "signed-ticket", "second-ticket");
  fixture.tick();
  fixture.tick();
  assert.deepEqual(decoded, ["signed-ticket"]);
  assert.deepEqual(errors, []);
  assert.equal(fixture.tasks.size, 0);
  assert.deepEqual(fixture.stats(), { acquired: 1, attached: 1, detached: 1, stopped: 1 });
  camera.stop();
  fixture.elapse(120_000);
  assert.equal(fixture.stats().stopped, 1);
  assert.deepEqual(errors, []);
});

test("a camera left waiting for QR turns off after one minute", async () => {
  const fixture = cameraFixture();
  const camera = createQrCamera(fixture.dependencies);
  const errors: unknown[] = [];
  await camera.start(assert.fail, (error) => errors.push(error));
  fixture.elapse(59_999);
  assert.equal(fixture.stats().stopped, 0);
  fixture.elapse(1);
  assert.equal(fixture.stats().stopped, 1, "an unattended camera must release its stream");
  assert.equal(fixture.stats().detached, 1);
  assert.equal(fixture.tasks.size, 0);
  assert.equal(errors.length, 1);
  assert.ok(errors[0] instanceof Error);
  assert.equal(errors[0].name, "QrCameraTimeoutError");
  assert.equal(scannerErrorCode(errors[0]), "timeout");
});

test("every camera track is stopped before a decoded QR reaches verification", async () => {
  const fixture = cameraFixture();
  const released: string[] = [];
  fixture.dependencies.acquire = async () => ({
    getTracks: () => [
      { stop: () => released.push("first-track") },
      { stop: () => released.push("second-track") },
    ],
  });
  fixture.frames.push("signed-ticket");
  const camera = createQrCamera(fixture.dependencies);
  let decoded = 0;
  await camera.start(() => {
    assert.deepEqual(released, ["first-track", "second-track"]);
    assert.equal(fixture.stats().detached, 1);
    decoded += 1;
  }, unexpectedError);
  fixture.tick();
  fixture.elapse(120_000);
  assert.equal(decoded, 1);
  assert.equal(fixture.tasks.size, 0);
});

test("a timed-out permission request releases a late stream without reopening the camera", async () => {
  const fixture = cameraFixture();
  const permission = deferred<typeof fixture.stream>();
  fixture.dependencies.acquire = () => permission.promise;
  const camera = createQrCamera(fixture.dependencies);
  const errors: unknown[] = [];
  const start = camera.start(assert.fail, (error) => errors.push(error));
  fixture.elapse(60_000);
  assert.equal(errors.length, 1);
  assert.ok(errors[0] instanceof QrCameraTimeoutError);
  permission.resolve(fixture.stream);
  assert.equal(await start, false);
  assert.equal(fixture.stats().stopped, 1);
  assert.equal(fixture.stats().attached, 0);
  assert.equal(fixture.tasks.size, 0);
});

test("the camera timeout closes a stream even while video playback startup is pending", async () => {
  const fixture = cameraFixture();
  const playback = deferred<void>();
  fixture.dependencies.attach = () => playback.promise;
  const camera = createQrCamera(fixture.dependencies);
  const errors: unknown[] = [];
  const start = camera.start(assert.fail, (error) => errors.push(error));
  await Promise.resolve();
  fixture.elapse(60_000);
  assert.equal(fixture.stats().stopped, 1);
  assert.equal(fixture.stats().detached, 1);
  assert.ok(errors[0] instanceof QrCameraTimeoutError);
  playback.resolve();
  assert.equal(await start, false);
  assert.equal(fixture.tasks.size, 0);
});

test("an old session timeout cannot stop the camera after the next scan starts", async () => {
  const fixture = cameraFixture();
  const camera = createQrCamera(fixture.dependencies);
  const errors: unknown[] = [];
  await camera.start(
    () => {},
    (error) => errors.push(error),
  );
  const oldTimeout = [...fixture.tasks.values()].find((task) => task.at === 60_000);
  assert.ok(oldTimeout);
  fixture.frames.push("first-ticket");
  fixture.tick();
  fixture.elapse(30_000);
  await camera.start(assert.fail, (error) => errors.push(error));
  oldTimeout.callback();
  fixture.elapse(40_000);
  assert.equal(fixture.stats().stopped, 1);
  assert.deepEqual(errors, []);
  fixture.elapse(20_000);
  assert.equal(fixture.stats().stopped, 2);
  assert.equal(errors.length, 1);
  assert.equal(fixture.tasks.size, 0);
});

test("cancelled permission requests release late streams without attaching or scanning", async () => {
  const fixture = cameraFixture();
  const permission = deferred<typeof fixture.stream>();
  fixture.dependencies.acquire = () => permission.promise;
  const camera = createQrCamera(fixture.dependencies);
  const start = camera.start(assert.fail, unexpectedError);
  camera.stop();
  permission.resolve(fixture.stream);
  assert.equal(await start, false);
  assert.equal(fixture.stats().stopped, 1);
  assert.equal(fixture.stats().attached, 0);
  assert.equal(fixture.tasks.size, 0);
});

test("stopping during video playback startup closes the stream immediately", async () => {
  const fixture = cameraFixture();
  const playback = deferred<void>();
  fixture.dependencies.attach = () => playback.promise;
  const camera = createQrCamera(fixture.dependencies);
  const start = camera.start(assert.fail, unexpectedError);
  await Promise.resolve();
  camera.stop();
  assert.equal(fixture.stats().stopped, 1);
  playback.resolve();
  assert.equal(await start, false);
  assert.equal(fixture.tasks.size, 0);
});

test("stale permission failures and stale frame callbacks cannot affect a restarted camera", async () => {
  const fixture = cameraFixture();
  const permission = deferred<typeof fixture.stream>();
  fixture.dependencies.acquire = () => permission.promise;
  const camera = createQrCamera(fixture.dependencies);
  const errors: unknown[] = [];
  const first = camera.start(assert.fail, (error) => errors.push(error));
  fixture.dependencies.acquire = async () => fixture.stream;
  assert.equal(await camera.start(assert.fail, (error) => errors.push(error)), true);
  permission.reject(new Error("old permission denied"));
  assert.equal(await first, false);
  assert.deepEqual(errors, []);
  const staleFrame = [...fixture.tasks.values()].sort((a, b) => a.at - b.at)[0];
  camera.stop();
  staleFrame.callback();
  assert.equal(fixture.tasks.size, 0);
  assert.equal(fixture.stats().stopped, 1);
});

test("camera failures close the stream and return a readable permission error code", async () => {
  const fixture = cameraFixture();
  const error = new Error("Camera disconnected");
  fixture.frames.push(error);
  const camera = createQrCamera(fixture.dependencies);
  const errors: unknown[] = [];
  await camera.start(assert.fail, (value) => errors.push(value));
  fixture.tick();
  assert.deepEqual(errors, [error]);
  assert.equal(fixture.stats().stopped, 1);
  assert.equal(fixture.tasks.size, 0);
  const denied = new Error();
  denied.name = "NotAllowedError";
  assert.equal(scannerErrorCode(denied), "denied");
  denied.name = "NotFoundError";
  assert.equal(scannerErrorCode(denied), "missing");
  denied.name = "NotReadableError";
  assert.equal(scannerErrorCode(denied), "busy");
  assert.equal(scannerErrorCode(new ScannerError("insecure")), "insecure");
});
