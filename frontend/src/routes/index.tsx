import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { Loader } from '@/components/common/Loader';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ReconList = lazy(() => import('@/pages/ReconList'));
const CreateRecon = lazy(() => import('@/pages/CreateRecon'));
const ReconDetail = lazy(() => import('@/pages/ReconDetail'));
const Settings = lazy(() => import('@/pages/Settings'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-bg flex items-center justify-center">
          <Loader size="lg" text="Loading view..." />
        </div>
      }
    >
      <Routes>
        {/* Public login */}
        <Route path="/login" element={<Login />} />

        {/* Protected application layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="recons" element={<ReconList />} />
          <Route path="new-recon" element={<CreateRecon />} />
          <Route path="recons/:id" element={<ReconDetail />} />
          <Route path="recons/:id/map" element={<ReconDetail defaultTab="mapping" />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
