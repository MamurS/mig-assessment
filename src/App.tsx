import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import TestPage from '@/pages/TestPage';
import SubmittedPage from '@/pages/SubmittedPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminAttemptPage from '@/pages/AdminAttemptPage';
import RequireAdmin from '@/components/RequireAdmin';

export default function App() {
  return (
    <Routes>
      {/* Candidate flow */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/test/:attemptId" element={<TestPage />} />
      <Route path="/submitted/:attemptId" element={<SubmittedPage />} />

      {/* Admin flow */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/attempts/:attemptId"
        element={
          <RequireAdmin>
            <AdminAttemptPage />
          </RequireAdmin>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
