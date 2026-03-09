import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Loader } from '../components/Loader';
import { Login } from '../pages/Login';
import { Home } from '../pages/Home';
import { Dashboard } from '../pages/Dashboard';
import { New } from '../pages/New';
import { WatchDetail } from '../pages/WatchDetail';
import { Settings } from '../pages/Settings';
import { Admin } from '../pages/Admin';
import { DS } from '../pages/DS';
import { Terms } from '../pages/Terms';
import { Request as RequestAccessPage } from '../pages/Request';
import { AccessApproved } from '../pages/AccessApproved/AccessApproved';

const RequestRoute = () => {
  const { user, loading, accessStatus } = useAuthContext();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (accessStatus.approved === true)
    return <Navigate to="/dashboard" replace />;
  if (accessStatus.loading || accessStatus.approved === null) {
    return <Loader />;
  }
  return <RequestAccessPage />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, accessStatus } = useAuthContext();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (accessStatus.loading || accessStatus.approved === null) {
    return <Loader />;
  }

  if (accessStatus.approved === false) {
    return <Navigate to="/request" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App = () => {
  const { user, loading } = useAuthContext();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading ? (
            <Loader />
          ) : user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route path="/" element={<Home />} />
      <Route path="/access-approved" element={<AccessApproved />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/ds" element={<DS />} />
      <Route path="/request" element={<RequestRoute />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new"
        element={
          <ProtectedRoute>
            <New />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watch/:id"
        element={
          <ProtectedRoute>
            <WatchDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
