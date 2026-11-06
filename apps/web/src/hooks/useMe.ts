import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

/**
 * The signed-in account. Errors (401) mean nobody is signed in; the route
 * guards in App.tsx send those to /login.
 */
export const useMe = () =>
  useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/me'),
    staleTime: Infinity,
    retry: false,
    retryOnMount: false,
  });
