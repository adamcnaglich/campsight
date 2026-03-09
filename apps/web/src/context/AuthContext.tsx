import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export interface AccessStatus {
  approved: boolean | null;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessStatus: AccessStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refetchAccessStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const authState = useAuth();
  const [accessStatus, setAccessStatus] = useState<AccessStatus>({
    approved: null,
    loading: false,
  });

  const refetchAccessStatus = useCallback(async () => {
    if (!authState.user) return;
    setAccessStatus((s) => ({ ...s, loading: true }));
    try {
      const data = await api.get<{ approved: boolean }>('/api/access/status');
      setAccessStatus({ approved: data.approved, loading: false });
    } catch {
      setAccessStatus({ approved: false, loading: false });
    }
  }, [authState.user]);

  useEffect(() => {
    if (!authState.user) {
      setAccessStatus({ approved: null, loading: false });
      return;
    }
    refetchAccessStatus();
  }, [authState.user, refetchAccessStatus]);

  return (
    <AuthContext.Provider value={{ ...authState, accessStatus, refetchAccessStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
};
