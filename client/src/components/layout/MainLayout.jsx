import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import Navbar from './Navbar';
import Footer from './Footer';

function MainLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  
  // Hide navbar for security officers on dashboard pages
  const isSecurityDashboard = user?.role === 'securityOfficer' && location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!isSecurityDashboard && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      {!isSecurityDashboard && <Footer />}
    </div>
  );
}

export default MainLayout;
