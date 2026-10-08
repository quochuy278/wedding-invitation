"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResolvedApiError } from "@/lib/api/error-resolver";
import { addressService } from "@/services/addresses/address.service";
import type { AddressDto, AddressListDto, CreateAddressInput } from "@/shared/contracts/address";

export const addressQueryKeys = { all: ["addresses"] as const };

function retryAddressQuery(failureCount: number, error: ResolvedApiError): boolean {
  const canRetry = error.status !== 401 && error.status !== 403 && failureCount < 1;
  return canRetry;
}

export function useAddresses() {
  return useQuery<AddressListDto, ResolvedApiError>({
    queryKey: addressQueryKeys.all,
    queryFn: ({ signal }) => addressService.list(signal),
    retry: retryAddressQuery,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  async function handleCreatedAddress(): Promise<void> {
    const filters = { queryKey: addressQueryKeys.all };
    await queryClient.invalidateQueries(filters);
  }
  return useMutation<AddressDto, ResolvedApiError, CreateAddressInput>({
    mutationFn: addressService.create,
    onSuccess: handleCreatedAddress,
  });
}
