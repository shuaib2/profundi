import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import useAdminStatus from '../hooks/useAdminStatus';
import { FaUserCheck, FaUserTimes, FaUsers, FaToolbox, FaCalendarCheck, FaExclamationTriangle, FaSearch, FaEye, FaCheck, FaTimes, FaSignOutAlt, FaTrash, FaSync, FaBan, FaUnlock } from 'react-icons/fa';
import { suspendAccount, reinstateAccount } from '../models/suspensionModel';
import ServiceProviderDetailModal from '../components/ServiceProviderDetailModal';
import BookingDetailModal from '../components/BookingDetailModal';
import SuspendUserModal from '../components/SuspendUserModal';
import { notifyUser, notifyProvider } from '../utils/notificationUtils';
import { getImageUrl } from '../utils/imageUtils';
import './AdminDashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [providers, setProviders] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalBookings: 0,
    pendingVerifications: 0,
    cancellationRequests: 0,
    recentBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSuspendUserModal, setShowSuspendUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  // Use our custom hook to check admin status
  const { isAdmin: isAdminUser, loading: adminLoading, error: adminError } = useAdminStatus();

  // Define fetchDashboardData with useCallback
  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('Fetching dashboard data...');
      setLoading(true);
      const db = getFirestore();

      // Fetch service providers
      const providersSnapshot = await getDocs(collection(db, 'serviceProviders'));
      const providersList = providersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProviders(providersList);

      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);

      // Fetch bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);

      // Calculate stats
      const pendingVerificationsList = providersList.filter(provider => !provider.documentsVerified && !provider.documentsRejected);
      const cancellationRequestsList = bookingsList.filter(booking => booking.cancellationRequested);
      const recentBookingsList = bookingsList.filter(booking => {
        if (!booking.createdAt) return false;
        const bookingDate = booking.createdAt instanceof Date
          ? booking.createdAt
          : new Date(booking.createdAt.seconds * 1000);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return bookingDate >= sevenDaysAgo;
      });

      setStats({
        totalUsers: usersList.length,
        totalProviders: providersList.length,
        totalBookings: bookingsList.length,
        pendingVerifications: pendingVerificationsList.length,
        cancellationRequests: cancellationRequestsList.length,
        recentBookings: recentBookingsList.length
      });

      console.log('Dashboard data fetched successfully');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to handle admin status changes
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (adminLoading) {
      return; // Still loading, wait for the hook to finish
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (adminError) {
      setError('Error checking admin status: ' + adminError);
      setLoading(false);
      return;
    }

    if (isAdminUser) {
      console.log('Admin user detected:', user.email);
      setIsAdmin(true);
      fetchDashboardData();
    } else {
      setError('You do not have admin privileges');
      setLoading(false);
    }
  }, [navigate, isAdminUser, adminLoading, adminError, fetchDashboardData, setIsAdmin, setError, setLoading]);

  const handleVerifyProvider = async (providerId) => {
    try {
      console.log('Verifying provider:', providerId);
      const db = getFirestore();

      // Find the provider in our local state first
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      console.log('Provider found:', provider.fullName);

      // Update the provider in Firestore
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        documentsVerified: true,
        verifiedAt: new Date().toISOString()
      });

      console.log('Provider verified successfully');

      // Update local state
      setPendingVerifications(prev =>
        prev.filter(provider => provider.id !== providerId)
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        pendingVerifications: prev.pendingVerifications - 1
      }));

      // Update providers list
      setProviders(prev =>
        prev.map(provider =>
          provider.id === providerId
            ? { ...provider, documentsVerified: true, verifiedAt: new Date().toISOString() }
            : provider
        )
      );

      // Send notification to the provider
      try {
        await notifyProvider(
          providerId,
          `Your account has been verified by an administrator. You are now visible in search results and can receive bookings.`,
          'account_verified',
          {}
        );
      } catch (notifyError) {
        console.error('Failed to send verification notification:', notifyError);
        // Continue even if notification fails
      }

      // Show success message
      alert(`Provider ${provider.fullName} has been verified successfully.`);
    } catch (err) {
      console.error('Error verifying provider:', err);
      setError('Failed to verify provider: ' + err.message);
      alert('Failed to verify provider: ' + err.message);
    }
  };

  const handleRejectProvider = async (providerId) => {
    try {
      console.log('Rejecting provider:', providerId);
      const db = getFirestore();

      // Find the provider in our local state first
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider with ID ${providerId} not found`);
      }

      console.log('Provider found:', provider.fullName);

      await updateDoc(doc(db, 'serviceProviders', providerId), {
        documentsRejected: true,
        rejectedAt: new Date().toISOString()
      });

      console.log('Provider rejected successfully');

      // Update local state
      setPendingVerifications(prev =>
        prev.filter(provider => provider.id !== providerId)
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        pendingVerifications: prev.pendingVerifications - 1
      }));

      // Update providers list
      setProviders(prev =>
        prev.map(provider =>
          provider.id === providerId
            ? { ...provider, documentsRejected: true, rejectedAt: new Date().toISOString() }
            : provider
        )
      );

      // Send notification to the provider
      try {
        await notifyProvider(
          providerId,
          `Your account verification has been rejected by an administrator. Please check your ID documents and profile information and try again.`,
          'account_rejected',
          {}
        );
      } catch (notifyError) {
        console.error('Failed to send rejection notification:', notifyError);
        // Continue even if notification fails
      }

      // Show success message
      alert(`Provider ${provider.fullName} has been rejected.`);
    } catch (err) {
      console.error('Error rejecting provider:', err);
      setError('Failed to reject provider: ' + err.message);
      alert('Failed to reject provider: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId, userName, isProvider = false) => {
    try {
      // Confirm deletion
      if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
        return;
      }

      console.log(`Deleting ${isProvider ? 'provider' : 'user'}:`, userId);
      const db = getFirestore();

      // Delete the user document
      const collectionName = isProvider ? 'serviceProviders' : 'users';
      await deleteDoc(doc(db, collectionName, userId));

      console.log(`${isProvider ? 'Provider' : 'User'} deleted successfully`);

      // Update local state
      if (isProvider) {
        setProviders(prev => prev.filter(provider => provider.id !== userId));
        setPendingVerifications(prev => prev.filter(provider => provider.id !== userId));

        // Update stats
        setStats(prev => ({
          ...prev,
          totalProviders: prev.totalProviders - 1,
          pendingVerifications: prev.pendingVerifications - (pendingVerifications.some(p => p.id === userId) ? 1 : 0)
        }));
      } else {
        setUsers(prev => prev.filter(user => user.id !== userId));

        // Update stats
        setStats(prev => ({
          ...prev,
          totalUsers: prev.totalUsers - 1
        }));
      }

      // Show success message
      alert(`${isProvider ? 'Provider' : 'User'} ${userName} has been deleted.`);
    } catch (err) {
      console.error(`Error deleting ${isProvider ? 'provider' : 'user'}:`, err);
      setError(`Failed to delete ${isProvider ? 'provider' : 'user'}: ${err.message}`);
      alert(`Failed to delete ${isProvider ? 'provider' : 'user'}: ${err.message}`);
    }
  };

  const handleApproveCancellation = async (bookingId) => {
    try {
      const db = getFirestore();

      // Get the booking first to access user and provider IDs
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        cancellationRequested: false,
        cancellationApproved: true,
        cancellationApprovedAt: new Date().toISOString(),
        refundProcessed: true,
        refundAmount: 35, // Default booking fee
        refundDate: new Date().toISOString()
      });

      // Send notifications to both user and provider
      try {
        // Notify the user who made the booking
        await notifyUser(
          booking.userId,
          `Your cancellation request for the booking with ${booking.providerName} on ${booking.date} has been approved. A refund of R35 has been processed.`,
          'cancellation_approved',
          {
            bookingId: bookingId,
            date: booking.date,
            time: booking.time,
            refundAmount: 35
          }
        );

        // Notify the service provider
        await notifyProvider(
          booking.providerId,
          `The cancellation request for the booking with ${booking.customerName} on ${booking.date} has been approved by an administrator.`,
          'cancellation_approved',
          {
            bookingId: bookingId,
            date: booking.date,
            time: booking.time
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
        // Continue with cancellation approval even if notifications fail
      }

      // Update local state
      setCancellationRequests(prev =>
        prev.filter(booking => booking.id !== bookingId)
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        cancellationRequests: prev.cancellationRequests - 1
      }));

      // Update bookings list
      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? {
                ...booking,
                status: 'cancelled',
                cancellationRequested: false,
                cancellationApproved: true,
                cancellationApprovedAt: new Date().toISOString(),
                refundProcessed: true,
                refundAmount: 35,
                refundDate: new Date().toISOString()
              }
            : booking
        )
      );
    } catch (err) {
      console.error('Error approving cancellation:', err);
      setError('Failed to approve cancellation');
    }
  };

  const handleRejectCancellation = async (bookingId) => {
    try {
      const db = getFirestore();

      // Get the booking first to access user and provider IDs
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      await updateDoc(doc(db, 'bookings', bookingId), {
        cancellationRequested: false,
        cancellationRejected: true,
        cancellationRejectedAt: new Date().toISOString()
      });

      // Send notifications to both user and provider
      try {
        // Notify the user who made the booking
        await notifyUser(
          booking.userId,
          `Your cancellation request for the booking with ${booking.providerName} on ${booking.date} has been rejected. The booking will remain active.`,
          'cancellation_rejected',
          {
            bookingId: bookingId,
            date: booking.date,
            time: booking.time
          }
        );

        // Notify the service provider
        await notifyProvider(
          booking.providerId,
          `The cancellation request for the booking with ${booking.customerName} on ${booking.date} has been rejected by an administrator. The booking will remain active.`,
          'cancellation_rejected',
          {
            bookingId: bookingId,
            date: booking.date,
            time: booking.time
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
        // Continue with cancellation rejection even if notifications fail
      }

      // Update local state
      setCancellationRequests(prev =>
        prev.filter(booking => booking.id !== bookingId)
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        cancellationRequests: prev.cancellationRequests - 1
      }));

      // Update bookings list
      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? {
                ...booking,
                cancellationRequested: false,
                cancellationRejected: true,
                cancellationRejectedAt: new Date().toISOString()
              }
            : booking
        )
      );
    } catch (err) {
      console.error('Error rejecting cancellation:', err);
      setError('Failed to reject cancellation');
    }
  };

  const handleUpdateProvider = async (providerId, updates) => {
    try {
      console.log('Updating provider:', providerId, updates);

      // Update providers list
      setProviders(prev =>
        prev.map(provider =>
          provider.id === providerId
            ? { ...provider, ...updates }
            : provider
        )
      );

      // If this provider is currently selected, update the selected provider
      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider(prev => ({ ...prev, ...updates }));
      }

      // Show success message
      alert(`Provider information has been updated successfully.`);
    } catch (err) {
      console.error('Error updating provider:', err);
      setError('Failed to update provider: ' + err.message);
      alert('Failed to update provider: ' + err.message);
    }
  };

  const handleViewBooking = (booking) => {
    console.log('Viewing booking:', booking);
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const handleBookingStatusUpdate = (bookingId, newStatus) => {
    console.log('Updating booking status:', bookingId, newStatus);

    // Update bookings list
    setBookings(prev =>
      prev.map(booking =>
        booking.id === bookingId
          ? { ...booking, status: newStatus }
          : booking
      )
    );

    // Close the modal
    setSelectedBooking(null);
    setShowBookingModal(false);

    // Show success message
    alert(`Booking status has been updated to ${newStatus}.`);
  };

  // Function to handle opening the suspend user modal
  const handleOpenSuspendUserModal = (user) => {
    setSelectedUser(user);
    setShowSuspendUserModal(true);
  };

  // Function to handle closing the suspend user modal
  const handleCloseSuspendUserModal = () => {
    setSelectedUser(null);
    setShowSuspendUserModal(false);
  };

  // Function to reinstate user account
  const handleReinstateUser = async (userId, isProvider = false) => {
    try {
      const collectionName = isProvider ? 'serviceProviders' : 'users';

      await reinstateAccount(userId, collectionName);

      // Update local state
      if (isProvider) {
        setProviders(prev =>
          prev.map(provider =>
            provider.id === userId
              ? {
                  ...provider,
                  suspended: false,
                  reinstatedAt: new Date().toISOString()
                }
              : provider
          )
        );
      } else {
        setUsers(prev =>
          prev.map(user =>
            user.id === userId
              ? {
                  ...user,
                  suspended: false,
                  reinstatedAt: new Date().toISOString()
                }
              : user
          )
        );
      }

      // Show success message
      alert('Account reinstated successfully');
    } catch (error) {
      console.error('Error reinstating account:', error);
      alert(`Error reinstating account: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  };

  const filterItems = (items) => {
    if (!searchTerm) return items;

    return items.filter(item => {
      // Check common fields
      if (item.fullName && item.fullName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      if (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      if (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      // Check booking-specific fields
      if (item.customerName && item.customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      if (item.providerName && item.providerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      return false;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="admin-dashboard loading">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="admin-dashboard error">{error}</div>;
  }

  if (!isAdmin) {
    return <div className="admin-dashboard error">You do not have admin privileges</div>;
  }

  return (
    <div className="admin-dashboard">
      {selectedProvider && (
        <ServiceProviderDetailModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onVerify={handleVerifyProvider}
          onReject={handleRejectProvider}
          onUpdate={handleUpdateProvider}
        />
      )}

      {showBookingModal && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => {
            setSelectedBooking(null);
            setShowBookingModal(false);
          }}
          onStatusUpdate={handleBookingStatusUpdate}
        />
      )}

      {showSuspendUserModal && selectedUser && (
        <SuspendUserModal
          user={selectedUser}
          onClose={handleCloseSuspendUserModal}
          onSuspend={async (reason, endDate) => {
            // Determine if this is a user or provider
            const isProvider = selectedUser.profession !== undefined;
            const collectionName = isProvider ? 'serviceProviders' : 'users';

            await suspendAccount(
              selectedUser.id,
              reason,
              collectionName,
              endDate
            );

            // Update local state
            if (isProvider) {
              setProviders(prev =>
                prev.map(provider =>
                  provider.id === selectedUser.id
                    ? {
                        ...provider,
                        suspended: true,
                        suspensionReason: reason,
                        suspendedAt: new Date().toISOString(),
                        suspensionEndDate: endDate ? endDate.toISOString() : null
                      }
                    : provider
                )
              );
            } else {
              setUsers(prev =>
                prev.map(user =>
                  user.id === selectedUser.id
                    ? {
                        ...user,
                        suspended: true,
                        suspensionReason: reason,
                        suspendedAt: new Date().toISOString(),
                        suspensionEndDate: endDate ? endDate.toISOString() : null
                      }
                    : user
                )
              );
            }

            // Close the modal
            handleCloseSuspendUserModal();

            return true;
          }}
        />
      )}
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-header-actions">
          <button className="refresh-button" onClick={fetchDashboardData}>
            <FaSync /> Refresh Data
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      <div className="admin-search">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users, providers, or bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-icon users">
            <FaUsers />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon providers">
            <FaToolbox />
          </div>
          <div className="stat-content">
            <h3>Service Providers</h3>
            <p className="stat-value">{stats.totalProviders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bookings">
            <FaCalendarCheck />
          </div>
          <div className="stat-content">
            <h3>Total Bookings</h3>
            <p className="stat-value">{stats.totalBookings}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <h3>Pending Actions</h3>
            <p className="stat-value">{stats.pendingVerifications + stats.cancellationRequests}</p>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          Service Providers
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
        </button>
        <button
          className={`tab-button ${activeTab === 'verifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifications')}
        >
          Verifications
          {stats.pendingVerifications > 0 && (
            <span className="badge">{stats.pendingVerifications}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'cancellations' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancellations')}
        >
          Cancellations
          {stats.cancellationRequests > 0 && (
            <span className="badge">{stats.cancellationRequests}</span>
          )}
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>Dashboard Overview</h2>

            <div className="overview-cards">
              <div className="overview-card">
                <h3>Recent Activity</h3>
                <ul className="activity-list">
                  <li>
                    <span className="activity-icon bookings">
                      <FaCalendarCheck />
                    </span>
                    <div className="activity-content">
                      <p className="activity-title">
                        <button
                          className="text-button"
                          onClick={() => setActiveTab('bookings')}
                        >
                          {stats.recentBookings} new bookings
                        </button>
                      </p>
                      <p className="activity-subtitle">in the last 7 days</p>
                    </div>
                  </li>
                  <li>
                    <span className="activity-icon providers">
                      <FaToolbox />
                    </span>
                    <div className="activity-content">
                      <p className="activity-title">
                        <button
                          className="text-button"
                          onClick={() => setActiveTab('verifications')}
                        >
                          {stats.pendingVerifications} providers awaiting verification
                        </button>
                      </p>
                      <p className="activity-subtitle">require document review</p>
                    </div>
                  </li>
                  <li>
                    <span className="activity-icon pending">
                      <FaExclamationTriangle />
                    </span>
                    <div className="activity-content">
                      <p className="activity-title">
                        <button
                          className="text-button"
                          onClick={() => setActiveTab('cancellations')}
                        >
                          {stats.cancellationRequests} cancellation requests
                        </button>
                      </p>
                      <p className="activity-subtitle">need your attention</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="overview-card">
                <h3>Quick Actions</h3>
                <div className="quick-actions">
                  <button
                    className="action-button verify"
                    onClick={() => {
                      setActiveTab('verifications');
                      // Force a refresh of the pending verifications
                      const pendingVerificationsList = providers.filter(provider =>
                        provider.documentsVerified !== true && provider.documentsRejected !== true
                      );
                      setPendingVerifications(pendingVerificationsList);
                      setStats(prev => ({
                        ...prev,
                        pendingVerifications: pendingVerificationsList.length
                      }));
                    }}
                    disabled={stats.pendingVerifications === 0}
                  >
                    <FaUserCheck /> Verify Providers ({stats.pendingVerifications})
                  </button>
                  <button
                    className="action-button cancel"
                    onClick={() => {
                      setActiveTab('cancellations');
                      // Force a refresh of the cancellation requests
                      const cancellationRequestsList = bookings.filter(booking =>
                        booking.cancellationRequested === true
                      );
                      setCancellationRequests(cancellationRequestsList);
                      setStats(prev => ({
                        ...prev,
                        cancellationRequests: cancellationRequestsList.length
                      }));
                    }}
                    disabled={stats.cancellationRequests === 0}
                  >
                    <FaExclamationTriangle /> Review Cancellations ({stats.cancellationRequests})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="providers-section">
            <h2>Service Providers</h2>

            {filterItems(providers).length > 0 ? (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Profession</th>
                      <th>Location</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(providers).map(provider => (
                      <tr key={provider.id}>
                        <td>{provider.firstName || provider.lastName ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() : provider.fullName}</td>
                        <td>{provider.profession}</td>
                        <td>{provider.location}</td>
                        <td>{provider.phoneNumber}</td>
                        <td>
                          {provider.suspended ? (
                            <span className="status suspended">Suspended</span>
                          ) : provider.documentsVerified ? (
                            <span className="status verified">Verified</span>
                          ) : provider.documentsRejected ? (
                            <span className="status rejected">Rejected</span>
                          ) : (
                            <span className="status pending">Pending</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="table-action view"
                              onClick={() => setSelectedProvider(provider)}
                            >
                              <FaEye /> View Details
                            </button>
                            {provider.suspended ? (
                              <button
                                className="table-action reinstate"
                                onClick={() => handleReinstateUser(provider.id, true)}
                              >
                                <FaUnlock /> Reinstate
                              </button>
                            ) : (
                              <button
                                className="table-action suspend"
                                onClick={() => handleOpenSuspendUserModal(provider)}
                              >
                                <FaBan /> Suspend
                              </button>
                            )}
                            <button
                              className="table-action delete"
                              onClick={() => handleDeleteUser(provider.id, provider.fullName, true)}
                            >
                              <FaTrash /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">No service providers found</p>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <h2>Users</h2>

            {filterItems(users).length > 0 ? (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Location</th>
                      <th>Phone</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(users).map(user => (
                      <tr key={user.id}>
                        <td>{user.fullName}</td>
                        <td>{user.username}</td>
                        <td>{user.location}</td>
                        <td>{user.phoneNumber}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          {user.suspended ? (
                            <span className="status suspended">Suspended</span>
                          ) : (
                            <span className="status active">Active</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="table-action view"
                              onClick={() => handleOpenSuspendUserModal(user)}
                            >
                              <FaEye /> View
                            </button>
                            {user.suspended ? (
                              <button
                                className="table-action reinstate"
                                onClick={() => handleReinstateUser(user.id, false)}
                              >
                                <FaUnlock /> Reinstate
                              </button>
                            ) : (
                              <button
                                className="table-action suspend"
                                onClick={() => handleOpenSuspendUserModal(user)}
                              >
                                <FaBan /> Suspend
                              </button>
                            )}
                            <button
                              className="table-action delete"
                              onClick={() => handleDeleteUser(user.id, user.fullName)}
                            >
                              <FaTrash /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">No users found</p>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-section">
            <h2>Bookings</h2>

            {filterItems(bookings).length > 0 ? (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Provider</th>
                      <th>Date</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(bookings).map(booking => (
                      <tr key={booking.id}>
                        <td>{booking.customerName}</td>
                        <td>{booking.providerName}</td>
                        <td>{booking.date} at {booking.time}</td>
                        <td>{booking.location}</td>
                        <td>
                          {booking.cancellationRequested ? (
                            <span className="status cancellation">Cancellation Requested</span>
                          ) : (
                            <span className={`status ${booking.status}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            className="table-action view"
                            onClick={() => handleViewBooking(booking)}
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">No bookings found</p>
            )}
          </div>
        )}

        {activeTab === 'verifications' && (
          <div className="verifications-section">
            <h2>Pending Verifications</h2>

            {pendingVerifications.length > 0 ? (
              <div className="verification-cards">
                {pendingVerifications.map(provider => (
                  <div key={provider.id} className="verification-card">
                    <div className="verification-header">
                      <h3>{provider.fullName}</h3>
                      <span className="profession">{provider.profession}</span>
                    </div>

                    <div className="verification-details">
                      <p><strong>Location:</strong> {provider.location}</p>
                      <p><strong>Phone:</strong> {provider.phoneNumber}</p>
                      <p><strong>Registered:</strong> {formatDate(provider.createdAt)}</p>
                    </div>

                    <div className="verification-documents">
                      <h4>Documents</h4>
                      {provider.idDocumentPath ? (
                        <div className="document-link">
                          <a href={getImageUrl(provider.idDocumentPath)} target="_blank" rel="noopener noreferrer">
                            View ID Document
                          </a>
                        </div>
                      ) : (
                        <p className="no-document">No ID document uploaded</p>
                      )}
                    </div>

                    <div className="verification-actions">
                      <button
                        className="action-button view-details"
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <FaEye /> View Full Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No pending verifications</p>
            )}
          </div>
        )}

        {activeTab === 'cancellations' && (
          <div className="cancellations-section">
            <h2>Cancellation Requests</h2>

            {cancellationRequests.length > 0 ? (
              <div className="cancellation-cards">
                {cancellationRequests.map(booking => (
                  <div key={booking.id} className="cancellation-card">
                    <div className="cancellation-header">
                      <h3>Booking #{booking.id.substring(0, 8)}</h3>
                      <span className="cancellation-date">
                        Requested on {formatDate(booking.cancellationRequestDate)}
                      </span>
                    </div>

                    <div className="cancellation-details">
                      <p><strong>Customer:</strong> {booking.customerName}</p>
                      <p><strong>Provider:</strong> {booking.providerName}</p>
                      <p><strong>Service:</strong> {booking.service || booking.description.substring(0, 30) + '...'}</p>
                      <p><strong>Date:</strong> {booking.date} at {booking.time}</p>
                      <p><strong>Location:</strong> {booking.location}</p>
                      <p><strong>Booking Fee:</strong> R{booking.bookingFee || 35}</p>
                    </div>

                    <div className="cancellation-actions">
                      <button
                        className="action-button approve"
                        onClick={() => handleApproveCancellation(booking.id)}
                      >
                        <FaCheck /> Approve & Refund
                      </button>
                      <button
                        className="action-button deny"
                        onClick={() => handleRejectCancellation(booking.id)}
                      >
                        <FaTimes /> Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No cancellation requests</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
