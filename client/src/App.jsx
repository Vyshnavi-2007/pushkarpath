import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Public & Pilgrim Pages
import Landing from './pages/Landing';
import Guest from './pages/Guest';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import Pilgrim from './pages/Pilgrim';
import NavigatePage from './pages/Navigate';
import Checkin from './pages/Checkin';

// Volunteer / Staff Portal
import Volunteer from './pages/Volunteer';

// Admin Portal
import AdminDashboard from './pages/admin/Dashboard';
import AdminLots from './pages/admin/Lots';
import AdminCorrection from './pages/admin/Correction';
import AdminGhats from './pages/admin/Ghats';
import AdminStaff from './pages/admin/Staff';
import AdminScanLogs from './pages/admin/ScanLogs';
import AdminSimulation from './pages/admin/Simulation';

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/guest" element={<Guest />} />
      <Route path="/login" element={<Login />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/checkin" element={<Checkin />} />

      {/* Pilgrim Portal (Protected for pilgrims / users) */}
      <Route
        path="/pilgrim"
        element={
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <Pilgrim />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pilgrim/navigate"
        element={
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <NavigatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pilgrim/navigate/:lotCode"
        element={
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <NavigatePage />
          </ProtectedRoute>
        }
      />

      {/* Volunteer Portal (Protected for on-ground staff) */}
      <Route
        path="/volunteer"
        element={
          <ProtectedRoute allowedRoles={['staff', 'admin']}>
            <Volunteer />
          </ProtectedRoute>
        }
      />

      {/* Admin Portal (Protected for central control admin) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/lots"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLots />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/lots/:code/correct"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminCorrection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ghats"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminGhats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminStaff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/scans"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminScanLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/simulation"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSimulation />
          </ProtectedRoute>
        }
      />

      {/* Fallback to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

