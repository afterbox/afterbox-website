"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { Device, SecurityOverview } from "@/lib/api/types";
import { staleTimes } from "../queryClient";
import { securityKeys } from "../security";

export const deviceKeys = {
  all: ["devices"] as const,
};

export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.all,
    queryFn: ({ signal }) => api.get<Device[]>("/v1/devices", { signal }),
    staleTime: staleTimes.default,
  });
}

/** Removes a device (S: the client runs the passkey on 403). The row leaves the overview at once, back on failure. */
export function useRemoveDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => api.delete(`/v1/devices/${seg(deviceId)}`),
    onMutate: async (deviceId) => {
      await client.cancelQueries({ queryKey: securityKeys.overview });
      const previous = client.getQueryData<SecurityOverview>(securityKeys.overview);
      client.setQueryData<SecurityOverview>(securityKeys.overview, (current) =>
        current ? { ...current, devices: current.devices.filter((device) => device.id !== deviceId) } : current,
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(securityKeys.overview, context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: securityKeys.all });
      client.invalidateQueries({ queryKey: deviceKeys.all });
    },
  });
}
