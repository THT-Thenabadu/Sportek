import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import {
  Home, Calendar, LayoutDashboard, Settings,
  UserPlus, Users, ScanLine, LogOut, Ticket, AlertCircle,
  Star, MessageSquare, FileText, ClipboardCheck
} from 'lucide-react';

function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [unreadWarnings, setUnreadWarnings] = useState(0);

  useEffect(() => {
    if (user?.role === 'propertyOwner') {
      api.get('/warnings/my-warnings')
        .then(res => {
          setUnreadWarnings(res.data.filter(w => !w.isRead).length);
        })
        .catch(console.error);
    }
  }, [user]);

  const getLinks = () => {
    const role = user?.role;

    // Admins & superAdmins — full management access
    if (role === 'admin' || role === 'superAdmin') {
      return [
        { name: 'Admin Dashboard',    path: '/dashboard/admin',       icon: Users    },
        { name: 'Events Management',  path: '/dashboard/events-hub',  icon: Ticket   },
        { name: 'Owner Applications', path: '/dashboard/admin',       icon: UserPlus },
        { name: 'My Bookings',        path: '/dashboard/bookings',    icon: Calendar },
        { name: 'My Tickets',         path: '/dashboard/tickets',     icon: Ticket   },
      ];
    }

    // Property owners
    if (role === 'propertyOwner') {
      return [
        { name: 'My Properties', path: '/dashboard/properties', icon: Home     },
        { name: 'Assets',        path: '/dashboard/assets',     icon: Settings },
        { name: 'Warnings',      path: '/dashboard/warnings',   icon: AlertCircle, badge: unreadWarnings },
        { name: 'Reschedule Requests', path: '/dashboard/reschedule', icon: FileText },
        { name: 'Feedback & Reports', path: '/dashboard/feedback', icon: Star },
        { name: 'My Bookings',   path: '/dashboard/bookings',   icon: Calendar },
        { name: 'My Tickets',    path: '/dashboard/tickets',    icon: Ticket   },
        { name: 'Security Dashboard Credentials', path: '/dashboard/security-credentials', icon: ScanLine },
      ];
    }

    // Security officers — ONLY scanner page
    if (role === 'securityOfficer') {
      return [
        { name: 'Management', isHeader: true },
        { name: 'Availability', path: '/dashboard/availability', icon: ClipboardCheck },
        { name: 'Upcoming Bookings', path: '/dashboard/upcoming', icon: Calendar },
        { name: 'Current Bookings', path: '/dashboard/current', icon: Ticket },
        { name: 'Entry Log', path: '/dashboard/entry-log', icon: FileText },
        { name: 'Reports', path: '/dashboard/report', icon: FileText },
        { name: 'Booking Details', path: '/dashboard/booking-details', icon: AlertCircle },
      ];
    }

    // Customer (default)
    if (role === 'customer' || !role) {
      return [
        { name: 'My Bookings',       path: '/dashboard/bookings',   icon: Calendar      },
        { name: 'My Tickets',        path: '/dashboard/tickets',    icon: Ticket        },
        { name: 'My Reviews',        path: '/dashboard/reviews',    icon: Star          },
        { name: 'Complaints',        path: '/dashboard/complaints', icon: MessageSquare },
        { name: 'Become an Owner',   path: '/dashboard/apply-owner', icon: UserPlus     },
      ];
    }
    
    return [];
  };

  // Human-readable role label for the sidebar footer pill
  const roleLabel = {
    superAdmin:      'Super Admin',
    admin:           'Admin',
    propertyOwner:   'Property Owner',
    securityOfficer: 'Security Officer',
    customer:        'Customer',
  }[user?.role] ?? 'User';

  const links = getLinks();

  // Security Officer gets special dark sidebar
  if (user?.role === 'securityOfficer') {
    return (
      <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed top-0 left-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold">SPORTEK</span>
          </div>
        </div>

        {/* Security Panel Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold">Security Panel</h2>
          <p className="text-sm text-slate-400">Sports Property</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {links.map((item) => {
            if (item.isHeader) {
              return (
                <div key={item.name} className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {item.name}
                </div>
              );
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name + item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Scan Pass Button - Fixed at bottom */}
        <div className="p-4 border-t border-slate-700 mt-auto">
          <Link
            to="/dashboard/scan"
            className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg text-center transition-colors"
          >
            Scan Pass / Check-In
          </Link>
        </div>
      </aside>
    );
  }

  // Default sidebar for other roles
  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-full flex flex-col">
      {/* User info header */}
      <div className="p-5 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
        <span className="mt-1 inline-block text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
          {roleLabel}
        </span>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name + item.path}
              to={item.path}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-primary-600'
              )}
            >
              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="flex items-center truncate">
                  <item.icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                      isActive ? 'text-primary-700' : 'text-slate-400 group-hover:text-primary-600'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {Number.isFinite(item.badge) && item.badge > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout at bottom */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
