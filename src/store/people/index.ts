"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { InviteBody, PeopleList, Person } from "@/lib/api/types";
import { recordKeys } from "../queryKeys";
import { meKeys } from "../me";
import { staleTimes } from "../queryClient";
import { securityKeys } from "../security";

export const peopleKeys = { all: recordKeys.people };

export function usePeople() {
  return useQuery({
    queryKey: recordKeys.people,
    queryFn: ({ signal }) => api.get<PeopleList>("/v1/people", { signal }),
    staleTime: staleTimes.minute,
  });
}

function afterPeopleChange(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: recordKeys.people });
  client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
  client.invalidateQueries({ queryKey: meKeys.all });
  client.invalidateQueries({ queryKey: securityKeys.all });
}

/** Invite a trusted person. `fromName` is the member's own name ("Justice has chosen you…"). */
export function useInvitePerson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteBody) => api.post<Person>("/v1/people/invite", body),
    onSuccess: (person) => {
      client.setQueryData<PeopleList>(recordKeys.people, (list) => (list ? { ...list, people: [...list.people, person] } : list));
      afterPeopleChange(client);
    },
  });
}

/** A fresh link; once a minute per person (429 with retryAfter). */
export function useResendInvite() {
  return useMutation({ mutationFn: (personId: string) => api.post(`/v1/people/${seg(personId)}/resend`) });
}

/** Replace (S): removes the person and invites the new one in one go. */
export function useReplacePerson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, body }: { personId: string; body: InviteBody }) => api.post<Person>(`/v1/people/${seg(personId)}/replace`, body),
    onSuccess: (person, { personId }) => {
      client.setQueryData<PeopleList>(recordKeys.people, (list) =>
        list ? { ...list, people: [...list.people.filter((other) => other.id !== personId), person] } : list,
      );
      afterPeopleChange(client);
    },
  });
}

/** Remove (S). */
export function useRemovePerson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => api.delete(`/v1/people/${seg(personId)}`),
    onSuccess: (_, personId) => {
      client.setQueryData<PeopleList>(recordKeys.people, (list) =>
        list ? { ...list, people: list.people.filter((person) => person.id !== personId) } : list,
      );
      afterPeopleChange(client);
    },
  });
}
