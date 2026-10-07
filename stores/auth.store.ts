import { atom, createStore, type Store } from "jotai/vanilla";
import type { AuthSessionDto } from "@/shared/contracts/auth";

export enum AuthStatus {
  Idle = "idle",
  Checking = "checking",
  Authenticated = "authenticated",
  Unauthenticated = "unauthenticated",
}

export type AuthState = {
  session: AuthSessionDto | null;
  status: AuthStatus;
};

const initialAuthState: AuthState = {
  session: null,
  status: AuthStatus.Idle,
};

export const authStateAtom = atom<AuthState>(initialAuthState);
export const authStore: Store = createStore();

export function markAuthChecking(): void {
  const currentState: AuthState = authStore.get(authStateAtom);
  const nextState: AuthState = { session: currentState.session, status: AuthStatus.Checking };
  authStore.set(authStateAtom, nextState);
}

export function setAuthenticatedSession(session: AuthSessionDto): void {
  const nextState: AuthState = { session, status: AuthStatus.Authenticated };
  authStore.set(authStateAtom, nextState);
}

export function clearAuthState(): void {
  const nextState: AuthState = { session: null, status: AuthStatus.Unauthenticated };
  authStore.set(authStateAtom, nextState);
}
