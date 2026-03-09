import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!authState.user) {
      setAccessStatus({ approved: null, loading: false });
      return;
    }
    setAccessStatus((s) => ({ ...s, loading: true }));
    api
      .get<{ approved: boolean }>('/api/access/status')
      .then((data) => {
        setAccessStatus({ approved: data.approved, loading: false });
      })
      .catch(() => {
        setAccessStatus({ approved: false, loading: false });
      });
  }, [authState.user]);

  return (
    <AuthContext.Provider value={{ ...authState, accessStatus }}>
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
