import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { Layout } from '../components/Layout/Layout';
import { Login } from '../pages/Login/Login';
import { Home } from '../pages/Home/Home';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { New } from '../pages/New/New';
import { WatchDetail } from '../pages/WatchDetail/WatchDetail';
import { Settings } from '../pages/Settings/Settings';
import { Admin } from '../pages/Admin/Admin';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
          loading ? null : user ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />
      <Route path="/" element={<Home />} />
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

export default App;
