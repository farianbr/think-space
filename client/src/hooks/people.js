import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

/** Collaborators across all of the current user's boards (Team page). */
export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const res = await api.get("/people");
      return res.data.people;
    },
    staleTime: 1000 * 60,
  });
}
