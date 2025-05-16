import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy, updateDoc, doc, onSnapshot, Timestamp, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaInfoCircle, FaPhone, FaUser, FaCheckCircle, FaTimesCircle, FaChartLine, FaStar, FaToolbox, FaShieldAlt } from 'react-icons/fa';
import { notifyUser } from '../utils/notificationUtils';
import { getReliabilityData } from '../models/reliabilityModel';
import { requestCancellation } from '../models/bookingModel';
import AvailabilitySettings from '../components/AvailabilitySettings';
import SpecialDatesCalendar from '../components/SpecialDatesCalendar';
import ServiceManagement from '../components/ServiceManagement';
import CancellationWarningModal from '../components/CancellationWarningModal';
import './ProviderDashboard.css';

function ProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [availabilityTab, setAvailabilityTab] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [reliabilityData, setReliabilityData] = useState({
    reliabilityScore: 100,
    cancellationCount: 0,
    recentCancellations: 0,
    bookingEnabled: true
  });

  // Added state to toggle visibility of banners
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [showReliabilityBanner, setShowReliabilityBanner] = useState(false);

  // Add state to track expanded booking cards
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  // Add state for search term
  const [searchTerm, setSearchTerm] = useState('');

  // New state for cancellation warning modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError('You must be logged in to view your dashboard');
      setLoading(false);
      return;
    }

    const fetchProviderProfile = async () => {
      try {
        const db = getFirestore();
        // Check if the user is a provider by looking for a document with their UID
        const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));

        if (!providerDoc.exists()) {
          setError('You do not have a service provider profile. Please go back to the home page.');
          setLoading(false);
          // Redirect to home page after a delay
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          return;
        }

        // Get the provider data
        const providerData = providerDoc.data();

        // Log the verification status for debugging
        console.log('Provider verification status:', providerData.documentsVerified);

        setProviderProfile({ id: providerDoc.id, ...providerData });

        // Fetch reliability data
        try {
          const reliability = await getReliabilityData(user.uid);
          setReliabilityData(reliability);
        } catch (reliabilityError) {
          console.error('Error fetching reliability data:', reliabilityError);
          // Continue with default reliability data
        }
      } catch (err) {
        console.error('Error fetching provider profile:', err);
        setError('Failed to load provider profile');
      }
    };

    fetchProviderProfile();

    // Set up real-time listeners
    const db = getFirestore();

    // Bookings listener
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      try {
        // Process bookings
        const bookingsList = await Promise.all(snapshot.docs.map(async (bookingDoc) => {
          const bookingData = bookingDoc.data();

          // Fetch customer details
          const customerDoc = await getDocs(
            query(collection(db, 'users'), where('userId', '==', bookingData.userId))
          );

          const customerData = customerDoc.empty ? {} : customerDoc.docs[0].data();

          return {
            id: bookingDoc.id,
            ...bookingData,
            customerPhone: customerData.phoneNumber || bookingData.customerPhone || 'Not provided',
            // Convert Firestore timestamp to Date if it exists
            createdAt: bookingData.createdAt instanceof Timestamp
              ? bookingData.createdAt.toDate()
              : new Date(bookingData.createdAt)
          };
        }));

        setBookings(bookingsList);

        // Calculate stats - exclude pending_payment bookings from total
        const filteredBookingsList = bookingsList.filter(b => b.status !== 'pending_payment' && b.status !== 'pending');
        const stats = {
          totalBookings: filteredBookingsList.length,
          // We're now using confirmed status as "pending" in the UI
          confirmedBookings: bookingsList.filter(b => b.status === 'confirmed').length,
          completedBookings: bookingsList.filter(b => b.status === 'completed').length,
          cancelledBookings: bookingsList.filter(b => b.status === 'cancelled').length
        };

        setStats(stats);
      } catch (err) {
        console.error('Error processing bookings:', err);
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Error in bookings listener:', err);
      setError('Failed to listen for bookings updates');
      setLoading(false);
    });

    // Notifications listener removed

    return () => {
      unsubscribeBookings();
    };
  }, []);

  const handleAcceptBooking = async (bookingId) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed',
        updatedAt: new Date().toISOString()
      });

      // Add notification for the customer only
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        try {
          await notifyUser(
            booking.userId,
            `${booking.providerName} has accepted your booking for ${booking.date} at ${booking.time}.`,
            'booking_accepted',
            {
              bookingId: bookingId,
              date: booking.date,
              time: booking.time
            }
          );
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
          // Continue even if notification fails
        }
      }
    } catch (err) {
      console.error('Error accepting booking:', err);
      setError('Failed to accept booking');
    }
  };

  const handleDeclineBooking = async (bookingId) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const booking = bookings.find(b => b.id === bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Only allow direct cancellation for pending bookings
      if (booking.status === 'pending' || booking.status === 'pending_payment') {
        const db = getFirestore();
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
          cancellationReason: 'Declined by service provider'
        });

        // Add notification for the customer only
        try {
          await notifyUser(
            booking.userId,
            `${booking.providerName} has declined your booking for ${booking.date} at ${booking.time}.`,
            'booking_declined',
            {
              bookingId: bookingId,
              date: booking.date,
              time: booking.time
            }
          );
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
          // Continue even if notification fails
        }
      } else {
        // For confirmed bookings, use the new requestCancellation function
        const db = getFirestore();
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));

        if (!bookingDoc.exists()) {
          throw new Error('Booking not found');
        }

        const bookingData = bookingDoc.data();
        const attempts = bookingData.cancellationAttempts || 0;

        // Show warning for first attempt
        if (attempts === 0) {
          setWarningMessage('This is your first cancellation request for this booking. You are allowed up to 3 cancellation attempts. After the third attempt, the booking will be automatically cancelled, your reliability score will be reduced, and you will be restricted from receiving bookings for 1 week. Do you want to proceed?');
          setOnConfirmAction(() => async () => {
            setShowWarningModal(false);
            await requestCancellation(bookingId, user.uid);
          });
          setShowWarningModal(true);
          return;
        }

        // Show warning for second attempt
        if (attempts === 1) {
          setWarningMessage('This is your second cancellation request for this booking. If declined, your next cancellation request will automatically cancel the booking but will affect your reliability score and prevent you from receiving bookings for 1 week. Do you want to proceed?');
          setOnConfirmAction(() => async () => {
            setShowWarningModal(false);
            await requestCancellation(bookingId, user.uid);
          });
          setShowWarningModal(true);
          return;
        }

        // Show warning for third attempt
        if (attempts === 2) {
          setWarningMessage('WARNING: This is your third cancellation request for this booking. This will automatically cancel the booking, reduce your reliability score, and prevent you from receiving bookings for 1 week. Do you want to proceed?');
          setOnConfirmAction(() => async () => {
            setShowWarningModal(false);
            await requestCancellation(bookingId, user.uid);
          });
          setShowWarningModal(true);
          return;
        }

        // Use the new requestCancellation function
        const result = await requestCancellation(bookingId, user.uid);

        // Show appropriate message based on attempt
        if (result.thirdStrike) {
          setError('Booking has been automatically cancelled. Your account is now under a booking restriction for 1 week.');
        } else if (result.secondAttempt) {
          setError('This is your second cancellation request. If declined, your next request will automatically cancel the booking and restrict your account.');
        } else {
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error with booking action:', err);
      setError('Failed to process booking action: ' + err.message);
    }
  };

  const handleDeclineBookingWithReason = async (bookingId) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Prompt for reason
      const reason = window.prompt('Please provide a reason for declining this booking:');

      // If user cancels the prompt, don't proceed
      if (reason === null) {
        return;
      }

      const db = getFirestore();
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'declined',
        updatedAt: new Date().toISOString(),
        declineReason: reason || 'No reason provided'
      });

      // Add notification for the customer
      try {
        await notifyUser(
          booking.userId,
          `${booking.providerName} has declined your booking for ${booking.date} at ${booking.time}. Reason: ${reason || 'No reason provided'}`,
          'booking_declined',
          {
            bookingId: bookingId,
            date: booking.date,
            time: booking.time,
            reason: reason || 'No reason provided'
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Continue even if notification fails
      }

      setError(null);
    } catch (err) {
      console.error('Error declining booking with reason:', err);
      setError('Failed to decline booking: ' + err.message);
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Add notification for the customer only
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        try {
          await notifyUser(
            booking.userId,
            `${booking.providerName} has marked your booking as completed.`,
            'booking_completed',
            {
              bookingId: bookingId,
              date: booking.date,
              time: booking.time
            }
          );
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
          // Continue even if notification fails
        }
      }
    } catch (err) {
      console.error('Error completing booking:', err);
      setError('Failed to complete booking');
    }
  };

  // Notification functions removed

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  // Function to get reliability score class
  const getReliabilityClass = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  };

  const getStatusBadge = (booking) => {
    // If cancellation is requested, show that first
    if (booking.cancellationRequested) {
      return <span className="status-badge cancellation-requested">Cancellation Requested</span>;
    }

    switch (booking.status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'pending_payment':
        return <span className="status-badge pending-payment">Payment Pending</span>;
      case 'pending_confirmation':
        return <span className="status-badge pending-confirmation">Pending Confirmation</span>;
      case 'confirmed':
        return <span className="status-badge confirmed">Confirmed</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      case 'declined':
        return <span className="status-badge declined">Declined</span>;
      default:
        return <span className="status-badge">{booking.status}</span>;
    }
  };

  const getBookingActions = (booking) => {
    // If cancellation is already requested
    if (booking.cancellationRequested) {
      return (
        <div className="booking-actions">
          <span className="action-message pending">Cancellation requested</span>
          <span className="action-note">Waiting for review</span>
        </div>
      );
    }

    switch (booking.status) {
      case 'pending':
        return (
          <div className="booking-actions">
            <button
              className="action-button accept"
              onClick={() => handleAcceptBooking(booking.id)}
            >
              <FaCheckCircle /> Accept
            </button>
            <button
              className="action-button decline"
              onClick={() => handleDeclineBooking(booking.id)}
            >
              <FaTimesCircle /> Decline
            </button>
          </div>
        );
      case 'pending_confirmation':
        return (
          <div className="booking-actions">
            <button
              className="action-button accept"
              onClick={() => handleAcceptBooking(booking.id)}
            >
              <FaCheckCircle /> Accept
            </button>
            <button
              className="action-button decline"
              onClick={() => handleDeclineBookingWithReason(booking.id)}
            >
              <FaTimesCircle /> Decline
            </button>
          </div>
        );
      case 'pending_payment':
        return (
          <div className="booking-actions">
            <span className="action-message">Waiting for customer payment</span>
          </div>
        );
      case 'confirmed':
        return (
          <div className="booking-actions">
            <button
              className="action-button complete"
              onClick={(e) => {
                e.stopPropagation(); // Prevent collapsing the expanded view
                handleCompleteBooking(booking.id);
              }}
            >
              <FaCheckCircle /> Mark as Completed
            </button>
            <button
              className="action-button request-cancel"
              onClick={(e) => {
                e.stopPropagation(); // Prevent collapsing the expanded view
                handleDeclineBooking(booking.id);
              }}
            >
              <FaTimesCircle /> Request Cancellation
            </button>
          </div>
        );
      case 'completed':
        return (
          <div className="booking-actions">
            <span className="action-message success">Service completed</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="booking-actions">
            <span className="action-message error">Booking cancelled</span>
          </div>
        );
      case 'declined':
        return (
          <div className="booking-actions">
            <span className="action-message error">Booking declined</span>
            {booking.declineReason && (
              <span className="action-note">Reason: {booking.declineReason}</span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Filter bookings based on active tab
  const getFilteredBookings = () => {
    switch (activeTab) {
      case 'pending_confirmation':
        return bookings.filter(b => b.status === 'pending_confirmation');
      case 'confirmed': // This is now our "Confirmed" tab in the UI
        return bookings.filter(b => b.status === 'confirmed');
      case 'completed':
        return bookings.filter(b => b.status === 'completed');
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled');
      case 'declined':
        return bookings.filter(b => b.status === 'declined');
      default:
        // For dashboard, show all bookings except pending_payment and pending
        return bookings.filter(b => b.status !== 'pending_payment' && b.status !== 'pending');
    }
  };

  // Function to filter bookings based on search term
  const getFilteredBookingsBySearch = () => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return getFilteredBookings().filter(booking => {
      return (
        booking.customerName?.toLowerCase().includes(lowercasedSearchTerm) ||
        booking.location?.toLowerCase().includes(lowercasedSearchTerm) ||
        booking.description?.toLowerCase().includes(lowercasedSearchTerm)
      );
    });
  };

  if (loading) {
    return <div className="provider-dashboard loading">Loading your dashboard...</div>;
  }

  // We'll display errors in a banner instead of replacing the entire dashboard

  // Determine verification status for display
  const verificationStatus = providerProfile ?
    (providerProfile.documentsVerified === true ? 'verified' : 'pending') : 'unknown';

  console.log('Provider verification status:', verificationStatus);

  // Function to toggle the expanded state of a booking card
  const toggleBookingExpansion = (bookingId) => {
    setExpandedBookingId((prevId) => (prevId === bookingId ? null : bookingId));
  };

  return (
    <div className="provider-dashboard">
      {error && (
        <div className="error-banner">
          <FaInfoCircle className="error-icon" />
          <div className="error-message">
            <p>{error}</p>
            <button className="dismiss-error" onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div className="provider-welcome">
          <h1>Welcome, {providerProfile ? `${providerProfile.firstName || ''} ${providerProfile.lastName || ''}`.trim() || 'Provider' : 'Provider'}</h1>
          <div className="provider-info-header">
            <p className="provider-profession">{providerProfile?.profession || 'Service Provider'}</p>
          </div>
        </div>

        {/* Icons for toggling banners */}
        <div className="dashboard-icons">
          <button
            className="icon-button verification-icon"
            onClick={() => setShowVerificationBanner(!showVerificationBanner)}
          >
            <FaCheckCircle className={verificationStatus === 'verified' ? 'verified' : 'pending'} />
          </button>
          <button
            className="icon-button reliability-icon"
            onClick={() => setShowReliabilityBanner(!showReliabilityBanner)}
          >
            <FaShieldAlt className={getReliabilityClass(reliabilityData.reliabilityScore)} />
          </button>
        </div>
      </div>

      {/* Conditional rendering of banners */}
      {showVerificationBanner && verificationStatus === 'pending' && (
        <div className="verification-status-banner pending">
          <FaInfoCircle className="info-icon" />
          <div className="verification-message">
            <p className="verification-title">Pending Verification</p>
            <p className="verification-text">Your account is awaiting verification by an administrator. You won't appear in search results until verified.</p>
          </div>
        </div>
      )}

      {showVerificationBanner && verificationStatus === 'verified' && (
        <div className="verification-status-banner verified">
          <FaCheckCircle className="info-icon" />
          <div className="verification-message">
            <p className="verification-title">Account Verified</p>
            <p className="verification-text">Your account has been verified by an administrator. You are now visible in search results and can receive bookings.</p>
          </div>
        </div>
      )}

      {showReliabilityBanner && (
        <div className={`reliability-banner ${getReliabilityClass(reliabilityData.reliabilityScore)}`}>
          <FaShieldAlt className="info-icon" />
          <div className="reliability-message">
            <p className="reliability-title">Reliability Score: {reliabilityData.reliabilityScore}%</p>
            <p className="reliability-text">
              Your reliability score affects your visibility to potential clients.
              Maintain a high score by fulfilling your bookings.
              {reliabilityData.cancellationCount > 0 &&
                ` You have ${reliabilityData.cancellationCount} total cancellations.`}
            </p>
            {!reliabilityData.bookingEnabled && (
              <p className="penalty-warning">
                Your account is currently under a booking restriction until{' '}
                {reliabilityData.penaltyEndDate ? new Date(reliabilityData.penaltyEndDate).toLocaleDateString() : 'soon'}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rest of the dashboard content */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <FaChartLine /> Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'pending_confirmation' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending_confirmation')}
        >
          New Requests
          {bookings.filter(b => b.status === 'pending_confirmation').length > 0 && (
            <span className="tab-badge">{bookings.filter(b => b.status === 'pending_confirmation').length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'confirmed' ? 'active' : ''}`}
          onClick={() => setActiveTab('confirmed')}
        >
          Confirmed
          {stats.confirmedBookings > 0 && (
            <span className="tab-badge">{stats.confirmedBookings}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
        <button
          className={`tab-button ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled
        </button>
        <button
          className={`tab-button ${activeTab === 'declined' ? 'active' : ''}`}
          onClick={() => setActiveTab('declined')}
        >
          Declined
        </button>
        <button
          className={`tab-button ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          <FaClock /> Availability
        </button>
        <button
          className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <FaToolbox /> Services
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-overview">
          <div className="stats-cards">
            <div className="stat-card total">
              <div className="stat-icon">
                <FaCalendarAlt />
              </div>
              <div className="stat-content">
                <h3>Total Bookings</h3>
                <p className="stat-value">{stats.totalBookings}</p>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-icon">
                <FaClock />
              </div>
              <div className="stat-content">
                <h3>Pending</h3>
                <p className="stat-value">{stats.confirmedBookings}</p>
              </div>
            </div>

            <div className="stat-card completed">
              <div className="stat-icon">
                <FaStar />
              </div>
              <div className="stat-content">
                <h3>Completed</h3>
                <p className="stat-value">{stats.completedBookings}</p>
              </div>
            </div>
          </div>

          <div className="recent-bookings">
            <h2>Recent Bookings</h2>
            {bookings.filter(b => b.status !== 'pending_payment' && b.status !== 'pending').length > 0 ? (
              <div className="bookings-list">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                {getFilteredBookingsBySearch().slice(0, 5).map(booking => (
                  <div
                    key={booking.id}
                    className={`booking-card ${expandedBookingId === booking.id ? 'expanded' : ''}`}
                    onClick={() => toggleBookingExpansion(booking.id)}
                  >
                    <div className="booking-header">
                      <div className="customer-info">
                        <FaUser className="customer-icon" />
                        <div>
                          <h3>{booking.customerName}</h3>
                          <p className="booking-date">
                            {formatDate(booking.date)} at {formatTime(booking.time)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>

                    {expandedBookingId === booking.id && (
                      <div className="booking-details">
                        <p><FaPhone /> {booking.customerPhone}</p>
                        <p><FaMapMarkerAlt /> {booking.location}</p>
                        <p><FaInfoCircle /> {booking.description}</p>
                      </div>
                    )}

                    {expandedBookingId === booking.id && getBookingActions(booking)}
                  </div>
                ))}

                {bookings.filter(b => b.status !== 'pending_payment' && b.status !== 'pending').length > 5 && (
                  <button
                    className="view-all-button"
                    onClick={() => setActiveTab('confirmed')}
                  >
                    View All Bookings
                  </button>
                )}
              </div>
            ) : (
              <p className="no-bookings">No bookings yet</p>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'pending_confirmation' || activeTab === 'confirmed' || activeTab === 'completed' || activeTab === 'cancelled' || activeTab === 'declined') && (
        <div className="bookings-section">
          <h2>
            {activeTab === 'pending_confirmation' ? 'New Booking Requests' :
             activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Bookings'}
            <span className="bookings-count">
              ({getFilteredBookings().length})
            </span>
          </h2>

          {getFilteredBookings().length > 0 ? (
            <div className="bookings-list">
              {getFilteredBookings().map(booking => (
                <div
                  key={booking.id}
                  className={`booking-card ${expandedBookingId === booking.id ? 'expanded' : ''}`}
                  onClick={() => toggleBookingExpansion(booking.id)}
                >
                  <div className="booking-header">
                    <div className="customer-info">
                      <FaUser className="customer-icon" />
                      <div>
                        <h3>{booking.customerName}</h3>
                        <p className="booking-date">
                          {formatDate(booking.date)} at {formatTime(booking.time)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  {expandedBookingId === booking.id && (
                    <div className="booking-details">
                      <p><FaPhone /> {booking.customerPhone}</p>
                      <p><FaMapMarkerAlt /> {booking.location}</p>
                      <p><FaInfoCircle /> {booking.description}</p>
                    </div>
                  )}

                  {expandedBookingId === booking.id && getBookingActions(booking)}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-bookings">No {activeTab} bookings</p>
          )}
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="dashboard-content">
          <h2>Manage Your Availability</h2>
          <div className="availability-tabs">
            <button
              className={`availability-tab ${availabilityTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setAvailabilityTab('weekly')}
            >
              Weekly Schedule
            </button>
            <button
              className={`availability-tab ${availabilityTab === 'special' ? 'active' : ''}`}
              onClick={() => setAvailabilityTab('special')}
            >
              Special Dates
            </button>
          </div>

          {availabilityTab === 'weekly' && <AvailabilitySettings />}
          {availabilityTab === 'special' && <SpecialDatesCalendar />}
        </div>
      )}

      {activeTab === 'services' && (
        <div className="dashboard-content">
          <ServiceManagement />
        </div>
      )}

      {showWarningModal && (
        <CancellationWarningModal
          warningMessage={warningMessage}
          onClose={() => setShowWarningModal(false)}
          onConfirm={onConfirmAction}
        />
      )}
    </div>
  );
}

export default ProviderDashboard;
