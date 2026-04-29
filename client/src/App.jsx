import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { Chatbot } from './components/ui/Chatbot';

// Layouts
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import Venues from './pages/Venues';
import FacilityDetails from './pages/FacilityDetails';
import BookingFlow from './pages/BookingFlow';

// Dashboard Pages
import { CustomerBookings, OwnerApplication, CustomerTickets, CustomerReviews, CustomerComplaints } from './pages/dashboards/CustomerDashboard';
import { OwnerProperties, OwnerAssets, OwnerWarnings, OwnerRescheduleRequests } from './pages/dashboards/OwnerDashboard';
import AdminDashboard, { AdminUsers, AdminApplications, AdminEvents } from './pages/dashboards/AdminDashboard';
import SecurityDashboard, { 
  SecurityScanPage,
  SecurityAvailabilityPage,
  SecurityUpcomingPage,
  SecurityCurrentPage,
  SecurityEntryLogPage,
  SecurityReportPage,
  SecurityBookingDetailsPage
} from './pages/dashboards/SecurityDashboard';

function ProtectedRoute({ children, role }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;

  const isAdmin = user.role === 'admin' || user.role === 'superAdmin';

  // If a specific role is required and user doesn't match, redirect to their own dashboard.
  // superAdmin bypasses all role guards (they have full access).
  if (role && user.role !== role && !isAdmin) {
    const fallback =
      user.role === 'propertyOwner'   ? '/dashboard/properties' :
      user.role === 'securityOfficer' ? '/dashboard/scan'       :
                                        '/dashboard/bookings';
    return <Navigate to={fallback} />;
  }
  return children;
}

function App() {
  const { checkAuth, isCheckingAuth, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white"><LoadingSpinner className="w-12 h-12" /></div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/events" element={<Events />} />
          <Route path="/facilities/:id" element={<FacilityDetails />} />
          <Route path="/facilities/:id/book" element={
            <ProtectedRoute>
              <BookingFlow />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            {/* Auto-redirect dashboard index to the correct role home */}
            <Route index element={<Navigate to={
               (user?.role === 'admin' || user?.role === 'superAdmin') ? '/dashboard/admin'      :
               user?.role === 'securityOfficer'                        ? '/dashboard/scan'        :
               user?.role === 'propertyOwner'                          ? '/dashboard/properties'  :
               '/dashboard/bookings'
            } />} />
            
            {/* Customer Routes */}
            <Route path="bookings" element={<CustomerBookings />} />
            <Route path="tickets" element={<CustomerTickets />} />
            <Route path="reviews" element={<CustomerReviews />} />
            <Route path="complaints" element={<CustomerComplaints />} />
            <Route path="apply-owner" element={<OwnerApplication />} />
            
            {/* Property Owner Routes */}
            <Route path="properties" element={<ProtectedRoute role="propertyOwner"><OwnerProperties /></ProtectedRoute>} />
            <Route path="assets" element={<ProtectedRoute role="propertyOwner"><OwnerAssets /></ProtectedRoute>} />
            <Route path="warnings" element={<ProtectedRoute role="propertyOwner"><OwnerWarnings /></ProtectedRoute>} />
            <Route path="reschedule" element={<ProtectedRoute role="propertyOwner"><OwnerRescheduleRequests /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="admin/approvals" element={<ProtectedRoute role="admin"><AdminApplications /></ProtectedRoute>} />
            <Route path="admin/events" element={<ProtectedRoute role="admin"><AdminEvents /></ProtectedRoute>} />

            {/* Security Routes */}
            <Route path="scan" element={<ProtectedRoute role="securityOfficer"><SecurityScanPage /></ProtectedRoute>} />
            <Route path="availability" element={<ProtectedRoute role="securityOfficer"><SecurityAvailabilityPage /></ProtectedRoute>} />
            <Route path="upcoming" element={<ProtectedRoute role="securityOfficer"><SecurityUpcomingPage /></ProtectedRoute>} />
            <Route path="current" element={<ProtectedRoute role="securityOfficer"><SecurityCurrentPage /></ProtectedRoute>} />
            <Route path="entry-log" element={<ProtectedRoute role="securityOfficer"><SecurityEntryLogPage /></ProtectedRoute>} />
            <Route path="report" element={<ProtectedRoute role="securityOfficer"><SecurityReportPage /></ProtectedRoute>} />
            <Route path="booking-details" element={<ProtectedRoute role="securityOfficer"><SecurityBookingDetailsPage /></ProtectedRoute>} />
          </Route>
        </Route>
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <Chatbot />
    </Router>
  );
}

export default App;
