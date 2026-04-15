import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Intake from './pages/Intake';
import HealthTwin from './pages/HealthTwin';

function ProtectedRoute({ children, role }) {
  const { token, user } = useAuthStore();

  if (!token) return <Navigate to="/login" />;

  // ✅ correct role handling
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'doctor' ? '/doctor' : '/dashboard'} />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Patient Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Doctor Dashboard */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute role="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/:reportId"
          element={
            <ProtectedRoute>
              <ReportDetail />
            </ProtectedRoute>
          }
        />

        {/* Intake */}
        <Route
          path="/intake"
          element={
            <ProtectedRoute>
              <Intake />
            </ProtectedRoute>
          }
        />

        {/* Health Twin */}
        <Route
          path="/healthtwin"
          element={
            <ProtectedRoute>
              <HealthTwin />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  );
}