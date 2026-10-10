"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResolvedApiError } from "@/lib/api/error-resolver";
import { wishService } from "@/services/wishes/wish.service";
import type { CreateWishInput } from "@/shared/contracts/guest-response";
import type { InvitationWishDto } from "@/shared/contracts/invitation";

const wishQueryKeys = { invitation: (code: string) => ["wishes", code] as const };

export function useWishes(code: string, enabled: boolean) {
  return useQuery<InvitationWishDto[], ResolvedApiError>({
    queryKey: wishQueryKeys.invitation(code),
    queryFn: ({ signal }) => wishService.list(code, signal),
    enabled,
    staleTime: 0,
    retry: (failureCount, error) =>
      error.status !== 401 && error.status !== 403 && failureCount < 1,
  });
}

export function useCreateWish() {
  const queryClient = useQueryClient();
  return useMutation<InvitationWishDto, ResolvedApiError, CreateWishInput>({
    mutationFn: wishService.create,
    onSuccess: (_wish, input) =>
      queryClient.invalidateQueries({ queryKey: wishQueryKeys.invitation(input.code) }),
  });
}
