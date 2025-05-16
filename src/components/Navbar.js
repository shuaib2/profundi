import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { FaBars, FaTimes, FaHome, FaInfoCircle, FaUser, FaSignInAlt, FaChartLine, FaCalendarAlt, FaShieldAlt, FaCreditCard } from 'react-icons/fa';
import useUserRole from '../hooks/useUserRole';
import useAdminStatus from '../hooks/useAdminStatus';
import useSubscription from '../hooks/useSubscription';
import NotificationBell from './NotificationBell';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const user = auth.currentUser;

  // Get user role from Firestore using our custom hook
  const { userRole, loading: roleLoading } = useUserRole();

  // Get admin status from Firestore using our custom hook
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  // Get subscription status
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();

  console.log('User role from Firestore:', userRole);

  // Check if user is a service provider
  // Default to false if userRole is null or undefined
  const isServiceProvider = userRole === 'provider';

  console.log('Is service provider:', isServiceProvider);
  console.log('Is admin:', isAdmin);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // No need to clear localStorage anymore
      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon"></span>
          <span className="brand-text">ProFundi</span>
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <div className={`nav-elements ${menuOpen ? 'active' : ''}`}>
          <div className="nav-tabs">
            {/* Only show Home link for non-providers */}
            {(!user || !isServiceProvider) && (
              <Link
                to="/"
                className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <FaHome className="nav-icon" />
                <span>Home</span>
              </Link>
            )}

            {user && !isServiceProvider && (
              <>
                <Link
                  to="/bookings"
                  className={`nav-tab ${location.pathname === '/bookings' ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <FaCalendarAlt className="nav-icon" />
                  <span>My Bookings</span>
                </Link>

                <Link
                  to="/subscription"
                  className={`nav-tab ${location.pathname === '/subscription' ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <FaCreditCard className="nav-icon" />
                  <span>{isSubscribed ? 'Manage Subscription' : 'Subscribe'}</span>
                </Link>
              </>
            )}

            {user && isServiceProvider && (
              <Link
                to="/provider-dashboard"
                className={`nav-tab ${location.pathname === '/provider-dashboard' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <FaChartLine className="nav-icon" />
                <span>Dashboard</span>
              </Link>
            )}

            {user && isAdmin && (
              <Link
                to="/SecretOverlordCommandCenter"
                className={`nav-tab ${location.pathname === '/admin-dashboard' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <FaShieldAlt className="nav-icon" />
                <span>Admin</span>
              </Link>
            )}
              <Link
              to="/about"
              className={`nav-tab ${location.pathname === '/about' ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <FaInfoCircle className="nav-icon" />
              <span>About Us</span>
            </Link>
            {user && (
              <Link
                to="/profile"
                className={`nav-tab ${location.pathname === '/profile' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <FaUser className="nav-icon" />
                <span>Profile</span>
              </Link>
            )}
          </div>
          <div className="navbar-links">
            {user ? (
              <>
                <div className="user-controls">
                  {!roleLoading && <NotificationBell />}
                  <span className="user-email">{user.displayName || user.email}</span>
                  <button onClick={handleLogout} className="logout-button">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="auth-links">
                <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>
                  <FaSignInAlt className="nav-icon" />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="nav-link register-link" onClick={() => setMenuOpen(false)}>Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;





