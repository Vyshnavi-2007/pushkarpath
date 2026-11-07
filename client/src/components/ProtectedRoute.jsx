import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-marigold border-t-maroon rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // If route is exclusively staff or admin, send to staff-login, otherwise login
    const isStaffRoute = !allowedRoles.includes('user') && (allowedRoles.includes('staff') || allowedRoles.includes('admin'));
    return <Navigate to={isStaffRoute ? '/staff-login' : '/login'} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Role mismatch: redirect appropriately
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'staff') return <Navigate to="/volunteer" replace />;
    return <Navigate to="/pilgrim" replace />;
  }

  return children;
}
