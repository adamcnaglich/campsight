import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
}

/** The single local user. Its email is where alerts are sent (NOTIFY_EMAIL). */
export const useMe = () =>
  useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/me'),
    staleTime: Infinity,
  });
