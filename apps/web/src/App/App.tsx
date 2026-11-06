import { ReactNode, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Loader } from '../components/Loader';
import { useMe } from '../hooks/useMe';
import { UNAUTHENTICATED_EVENT } from '../lib/api';
import { Login } from '../pages/Login';
import { Invite } from '../pages/Invite';
import { Dashboard } from '../pages/Dashboard';
import { New } from '../pages/New';
import { WatchDetail } from '../pages/WatchDetail';
import { Settings } from '../pages/Settings';
import { Admin } from '../pages/Admin';
import { DS } from '../pages/DS';

/** Signed-in pages. Anyone else goes to /login and comes back afterwards. */
const Protected = ({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) => {
  const { data: me, isLoading, isError } = useMe();
  const location = useLocation();

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && !me.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App = () => {
  const queryClient = useQueryClient();

  // A 401 from any request means the session ended (expired, signed out
  // elsewhere). Forget the cached account so the guard sends us to sign-in.
  useEffect(() => {
    const onUnauthenticated = () => {
      if (queryClient.getQueryData(['me'])) {
        queryClient.resetQueries({ queryKey: ['me'] });
      }
    };
    window.addEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
    return () =>
      window.removeEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
  }, [queryClient]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/invite/:token" element={<Invite />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/new"
        element={
          <Protected>
            <New />
          </Protected>
        }
      />
      <Route
        path="/watch/:id"
        element={
          <Protected>
            <WatchDetail />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Settings />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected adminOnly>
            <Admin />
          </Protected>
        }
      />
      <Route path="/ds" element={<DS />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
