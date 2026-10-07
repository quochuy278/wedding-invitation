"use client";

import { useAtomValue } from "jotai/react";
import { useEffect } from "react";
import { getSession } from "@/services/auth/auth.service";
import {
  type AuthState,
  AuthStatus,
  authStateAtom,
  authStore,
  clearAuthState,
  markAuthChecking,
} from "@/stores/auth.store";

const AUTH_SESSION_CHECK_INTERVAL_MS: number = 60_000;

async function synchronizeAuthSession(): Promise<void> {
  markAuthChecking();
  try {
    await getSession();
  } catch {
    clearAuthState();
  }
}

export function useAuthSession(keepAlive: boolean = false): AuthState {
  const authState: AuthState = useAtomValue(authStateAtom, { store: authStore });

  useEffect((): (() => void) | undefined => {
    if (authStore.get(authStateAtom).status === AuthStatus.Idle) {
      void synchronizeAuthSession();
    }
    if (!keepAlive) return undefined;

    function handleWindowFocus(): void {
      void synchronizeAuthSession();
    }

    const intervalId: ReturnType<typeof setInterval> = setInterval(
      synchronizeAuthSession,
      AUTH_SESSION_CHECK_INTERVAL_MS,
    );
    window.addEventListener("focus", handleWindowFocus);
    return (): void => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [keepAlive]);

  return authState;
}
