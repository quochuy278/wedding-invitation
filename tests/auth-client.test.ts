import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { AxiosInstance, AxiosResponse } from "axios";
import { type AuthSessionDto, UserLevel } from "@/shared/contracts/auth";
import { now } from "@/shared/utils/date";
import type { AuthState } from "@/stores/auth.store";

type ApiClientModule = typeof import("@/lib/api/client");
type AuthStoreModule = typeof import("@/stores/auth.store");
type SuccessData = { success: boolean };
type TestResponseBody = { data: AuthSessionDto | SuccessData };

test("concurrent unauthorized requests share one refresh and retry once", async (): Promise<void> => {
  let accessValid: boolean = false;
  let refreshCount: number = 0;
  let loginCount: number = 0;
  let permanentFailures: number = 0;
  let invitationListRequests: number = 0;
  let invitationCreateRequests: number = 0;
  let addressCreateRequests: number = 0;
  let refreshFails: boolean = false;
  const sessionExpiresAt: string = now().add(1, "hour").toISOString();
  const authSession: AuthSessionDto = {
    user: {
      id: "admin-test-id",
      fullName: "Admin test",
      email: "admin@example.invalid",
      level: UserLevel.Admin,
    },
    expiresAt: sessionExpiresAt,
  };
  const server: Server = createServer(
    (request: IncomingMessage, response: ServerResponse): void => {
      response.setHeader("Content-Type", "application/json");
      if (request.url === "/api/auth/refresh") {
        refreshCount += 1;
        accessValid = !refreshFails;
        response.statusCode = refreshFails ? 401 : 200;
      } else if (request.url === "/api/auth/login") {
        loginCount += 1;
        response.statusCode = 401;
      } else if (
        request.url === "/api/invitations/test-code" ||
        request.url === "/api/invitations/validate"
      ) {
        response.statusCode = 401;
      } else if (request.url?.startsWith("/api/invitations?")) {
        invitationListRequests += 1;
        response.statusCode = accessValid ? 200 : 401;
      } else if (request.url === "/api/invitations" && request.method === "POST") {
        invitationCreateRequests += 1;
        response.statusCode = accessValid ? 200 : 401;
      } else if (request.url === "/api/addresses" && request.method === "POST") {
        addressCreateRequests += 1;
        response.statusCode = accessValid ? 200 : 401;
      } else if (request.url === "/api/admin/always-unauthorized") {
        permanentFailures += 1;
        response.statusCode = 401;
      } else {
        response.statusCode = accessValid ? 200 : 401;
      }
      const successData: SuccessData = { success: response.statusCode === 200 };
      const responseData: AuthSessionDto | SuccessData =
        request.url === "/api/auth/refresh" && response.statusCode === 200
          ? authSession
          : successData;
      const responseBody: TestResponseBody = { data: responseData };
      response.end(JSON.stringify(responseBody));
    },
  );
  await new Promise<void>((resolve: () => void): void => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address: AddressInfo = server.address() as AddressInfo;
  process.env.NEXT_PUBLIC_API_BASE_URL = `http://127.0.0.1:${address.port}/api`;
  try {
    const module: ApiClientModule = await import("@/lib/api/client");
    const authModule: AuthStoreModule = await import("@/stores/auth.store");
    const client: AxiosInstance = module.apiClient;
    const requests: Promise<AxiosResponse<unknown>>[] = Array.from(
      { length: 4 },
      (): Promise<AxiosResponse<unknown>> => client.get<unknown>("/admin/data"),
    );
    const responses: AxiosResponse<unknown>[] = await Promise.all(requests);
    assert.ok(
      responses.every((response: AxiosResponse<unknown>): boolean => response.status === 200),
    );
    assert.equal(refreshCount, 1);
    const authenticatedState: AuthState = authModule.authStore.get(authModule.authStateAtom);
    assert.equal(authenticatedState.status, authModule.AuthStatus.Authenticated);
    assert.deepEqual(authenticatedState.session, authSession);
    await assert.rejects(client.post<unknown>("/auth/login", {}));
    await assert.rejects(client.get<unknown>("/invitations/test-code"));
    await assert.rejects(client.post<unknown>("/invitations/validate", { code: "test-code" }));
    assert.equal(loginCount, 1);
    assert.equal(refreshCount, 1);
    await assert.rejects(client.get<unknown>("/admin/always-unauthorized"));
    assert.equal(permanentFailures, 2);
    assert.equal(refreshCount, 1);
    accessValid = false;
    const invitationResponse = await client.get<unknown>("/invitations", {
      params: { page: 2, pageSize: 5 },
    });
    assert.equal(invitationResponse.status, 200);
    assert.equal(invitationListRequests, 2);
    assert.equal(refreshCount, 2);
    accessValid = false;
    assert.equal((await client.post<unknown>("/invitations", {})).status, 200);
    assert.equal(invitationCreateRequests, 2);
    assert.equal(refreshCount, 3);
    accessValid = false;
    assert.equal((await client.post<unknown>("/addresses", {})).status, 200);
    assert.equal(addressCreateRequests, 2);
    assert.equal(refreshCount, 4);
    accessValid = false;
    refreshFails = true;
    await assert.rejects(client.get<unknown>("/admin/data"));
    assert.equal(refreshCount, 5);
    const unauthenticatedState: AuthState = authModule.authStore.get(authModule.authStateAtom);
    assert.equal(unauthenticatedState.status, authModule.AuthStatus.Unauthenticated);
    assert.equal(unauthenticatedState.session, null);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve: () => void, reject: (error: Error) => void): void => {
      server.close((error?: Error): void => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
