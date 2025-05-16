import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Navbar from './components/Navbar';
import MobileNavbar from './components/MobileNavbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import UserRegistration from './pages/UserRegistration';
import ProviderRegistration from './pages/ProviderRegistration';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import TermsAndConditions from './pages/TermsAndConditions';
import PasswordResetPage from './pages/PasswordResetPage';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import BookingsPage from './pages/BookingsPage';
import ProviderDashboard from './pages/ProviderDashboard';
import ServiceProviderDetail from './pages/ServiceProviderDetail';
import AdminDashboard from './pages/AdminDashboard';
import ProfileEditor from './components/ProfileEditor';
import SubscriptionPage from './pages/SubscriptionPage';
import { NotificationProvider } from './contexts/NotificationContext';
import useUserRole from './hooks/useUserRole';
import { hasActiveSubscription } from './models/subscriptionModel';
import './App.css';
import './firebase';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  // Use only Firebase Auth for authentication
  const auth = getAuth();
  return auth.currentUser ? children : <Navigate to="/login" />;
};

// Home Route component - redirects providers to their dashboard
const HomeRoute = ({ children }) => {
  const { userRole } = useUserRole();

  // If the user is a provider, redirect to provider dashboard
  if (userRole === 'provider') {
    return <Navigate to="/provider-dashboard" />;
  }

  // Otherwise, show the home page
  return children;
};

// Subscription Route component - checks if user has an active subscription
// This is a wrapper around ProtectedRoute that also checks for subscription
const SubscriptionRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Check if user has an active subscription
        const isSubscribed = await hasActiveSubscription(user.uid);
        setHasSubscription(isSubscribed);
        setLoading(false);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setLoading(false);
      }
    };

    checkSubscription();
  }, [auth.currentUser]);

  if (loading) {
    return <div className="loading">Checking subscription status...</div>;
  }

  // First check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Then check if user has an active subscription
  if (!hasSubscription) {
    return <Navigate to="/subscription" state={{ from: window.location.pathname }} />;
  }

  // Otherwise, allow access to the protected route
  return children;
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use only Firebase Auth for authentication
    const auth = getAuth();

    // Listen for Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <ScrollToTop />
      <NotificationProvider>
        <div className="App">
          <Navbar />
          <MobileNavbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={
                <HomeRoute>
                  <HomePage />
                </HomeRoute>
              } />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/reset-password" element={<PasswordResetPage />} />

              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/user" element={<UserRegistration />} />
              <Route path="/register/provider" element={<ProviderRegistration />} />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <BookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider-dashboard"
                element={
                  <ProtectedRoute>
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileEditor
                      userId={currentUser?.uid}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:providerId"
                element={
                  <SubscriptionRoute>
                    <BookingPage />
                  </SubscriptionRoute>
                }
              />
              <Route
                path="/payment/:bookingId"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking-confirmation/:bookingId"
                element={
                  <ProtectedRoute>
                    <BookingConfirmationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/:providerId"
                element={<ServiceProviderDetail />}
              />
              <Route
                path="/SecretOverlordCommandCenter"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <SubscriptionPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </NotificationProvider>
    </Router>
  );
}

export default App;