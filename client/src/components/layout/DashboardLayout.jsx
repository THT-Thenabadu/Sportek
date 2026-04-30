import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/useAuthStore';

function DashboardLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const isSecurityOfficer = user?.role === 'securityOfficer';

  return (
    <div className={`flex bg-slate-50 ${isSecurityOfficer ? 'min-h-screen' : 'min-h-[calc(100vh-4rem)]'}`}>
      <Sidebar />
      <main className={`flex-1 ${isSecurityOfficer ? 'ml-64' : ''} p-8`}>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
