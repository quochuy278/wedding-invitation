"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResolvedApiError } from "@/lib/api/error-resolver";
import { rsvpService } from "@/services/rsvps/rsvp.service";
import type { CreateRsvpInput, Rsvp } from "@/services/rsvps/rsvp.types";

export const rsvpQueryKeys = {
  all: ["rsvps"] as const,
};

export function useRsvps() {
  return useQuery<Rsvp[], ResolvedApiError>({
    queryKey: rsvpQueryKeys.all,
    queryFn: ({ signal }) => rsvpService.list(signal),
  });
}

export function useCreateRsvp() {
  const queryClient = useQueryClient();

  return useMutation<Rsvp, ResolvedApiError, CreateRsvpInput>({
    mutationFn: rsvpService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rsvpQueryKeys.all }),
  });
}
