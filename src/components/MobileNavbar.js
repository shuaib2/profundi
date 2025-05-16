import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import './MobileNavbar.css';
import { FaHome, FaCalendarAlt, FaUser, FaSignInAlt, FaChartLine, FaBell, FaInfoCircle } from 'react-icons/fa';
import useUserRole from '../hooks/useUserRole';
import { useNotifications } from '../contexts/NotificationContext';

function MobileNavbar() {
  const location = useLocation();
  const auth = getAuth();
  const user = auth.currentUser;

  // Get user role from Firestore using our custom hook
  const { userRole } = useUserRole();

  // Get notifications
  const { unreadCount } = useNotifications();

  // Check if user is a service provider
  const isServiceProvider = userRole === 'provider';

  return (
    <nav className="mobile-navbar">
      {/* Only show Home link for non-providers, similar to desktop navbar */}
      {!isServiceProvider && (
        <Link
          to="/"
          className={`mobile-nav-item ${location.pathname === '/' ? 'active' : ''}`}
        >
          <FaHome className="nav-icon" />
          <span>Home</span>
        </Link>
      )}

      {user && !isServiceProvider && (
        <Link
          to="/bookings"
          className={`mobile-nav-item ${location.pathname === '/bookings' ? 'active' : ''}`}
        >
          <FaCalendarAlt className="nav-icon" />
          <span>Bookings</span>
        </Link>
      )}

      {user && isServiceProvider && (
        <Link
          to="/provider-dashboard"
          className={`mobile-nav-item ${location.pathname === '/provider-dashboard' ? 'active' : ''}`}
        >
          <FaChartLine className="nav-icon" />
          <span>Dashboard</span>
        </Link>
      )}

      {/* Always show About Us link for providers to ensure they have enough navigation items */}
      {isServiceProvider && (
        <Link
          to="/about"
          className={`mobile-nav-item ${location.pathname === '/about' ? 'active' : ''}`}
        >
          <FaInfoCircle className="nav-icon" />
          <span>About Us</span>
        </Link>
      )}

      {user && (
        <Link
          to="/notifications"
          className={`mobile-nav-item ${location.pathname === '/notifications' ? 'active' : ''}`}
          onClick={(e) => {
            // Prevent default navigation
            e.preventDefault();
            // Show notifications in a modal or dropdown
            document.querySelector('.notification-bell')?.click();
          }}
        >
          <div className="notification-icon-container">
            <FaBell className="nav-icon" />
            {unreadCount > 0 && (
              <span className="mobile-notification-badge">{unreadCount}</span>
            )}
          </div>
          <span>Notifications</span>
        </Link>
      )}

      {user ? (
        <Link
          to="/profile"
          className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
        >
          <FaUser className="nav-icon" />
          <span>Profile</span>
        </Link>
      ) : (
        <Link
          to="/login"
          className={`mobile-nav-item ${location.pathname === '/login' ? 'active' : ''}`}
        >
          <FaSignInAlt className="nav-icon" />
          <span>Login</span>
        </Link>
      )}
    </nav>
  );
}

export default MobileNavbar;
