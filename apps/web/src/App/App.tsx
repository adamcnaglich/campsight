import { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Dashboard } from '../pages/Dashboard';
import { New } from '../pages/New';
import { WatchDetail } from '../pages/WatchDetail';
import { Settings } from '../pages/Settings';
import { Admin } from '../pages/Admin';
import { DS } from '../pages/DS';

const Page = ({ children }: { children: ReactNode }) => (
  <Layout>{children}</Layout>
);

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <Page>
            <Dashboard />
          </Page>
        }
      />
      <Route
        path="/new"
        element={
          <Page>
            <New />
          </Page>
        }
      />
      <Route
        path="/watch/:id"
        element={
          <Page>
            <WatchDetail />
          </Page>
        }
      />
      <Route
        path="/settings"
        element={
          <Page>
            <Settings />
          </Page>
        }
      />
      <Route
        path="/admin"
        element={
          <Page>
            <Admin />
          </Page>
        }
      />
      <Route path="/ds" element={<DS />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
