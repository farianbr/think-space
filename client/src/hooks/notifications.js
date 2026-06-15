import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { socket } from "../lib/socket";

/** Current user's notifications + unread count. */
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications", { params: { limit: 40 } });
      return res.data; // { notifications, unreadCount }
    },
    staleTime: 1000 * 30,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.patch(`/notifications/${id}/read`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData(["notifications"]);
      if (prev)
        qc.setQueryData(["notifications"], {
          notifications: prev.notifications.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
          unreadCount: 0,
        });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["notifications"], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Subscribe to live notifications pushed to the user's socket room. */
export function useNotificationsSocket() {
  const qc = useQueryClient();
  useEffect(() => {
    function onNew() {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, [qc]);
}
