import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Fetch members for a board
export function useBoardMembers(boardId) {
  return useQuery({
    queryKey: ['boardMembers', boardId],
    queryFn: async () => {
      const res = await api.get(`/boards/${boardId}/members`);
      return res.data.members;
    },
    enabled: !!boardId,
    staleTime: 1000 * 30,
  });
}

// Add a member (expects { userId, role? })
export function useAddBoardMember(boardId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/boards/${boardId}/members`, payload);
      return res.data.member ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boardMembers', boardId] });
    },
  });
}

// Remove member by userId
export function useRemoveBoardMember(boardId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      await api.delete(`/boards/${boardId}/members/${userId}`);
      return userId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boardMembers', boardId] });
    },
  });
}

// Invite a collaborator by email (with role)
export function useInviteMember(boardId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }) => {
      const res = await api.post(`/boards/${boardId}/members/invite`, { email, role });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boardMembers', boardId] });
    },
  });
}

// Change a member's role (owner only)
export function useUpdateMemberRole(boardId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }) => {
      const res = await api.patch(`/boards/${boardId}/members/${userId}`, { role });
      return res.data.member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boardMembers', boardId] });
    },
  });
}
