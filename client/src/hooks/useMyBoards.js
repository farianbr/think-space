import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const fetchMyBoards = async () => {
  const res = await api.get('/boards/my');
  return res.data.boards;
};

export default function useMyBoards() {
  return useQuery({
    queryKey: ['myBoards'],
    queryFn: fetchMyBoards,
    staleTime: 1000 * 60,
    retry: 1,
  });
}
