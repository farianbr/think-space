import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

/** Public starter-template gallery. */
export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await api.get("/templates");
      return res.data.templates;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** Clone a template into a fresh board owned by the user. */
export function useUseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, title }) => {
      const res = await api.post(`/templates/${slug}/use`, title ? { title } : {});
      return res.data.board;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myBoards"] }),
  });
}
