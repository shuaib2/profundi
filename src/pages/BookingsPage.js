import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, orderBy, updateDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import useUserRole from '../hooks/useUserRole';
import { notifyProvider } from '../utils/notificationUtils';
import { cancelBooking, requestCancellation } from '../models/bookingModel';
import './BookingsPage.css';

function BookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const { userRole, loading: roleLoading } = useUserRole();

  // Add state for search term
  const [searchTerm, setSearchTerm] = useState('');

  // Add state to track expanded booking cards
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  const fetchBookings = async () => {
    try {
      if (roleLoading) {
        return; // Wait for role to be determined
      }

      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in to view your bookings');
      }

      // Check if the user is a provider, if so, redirect to provider dashboard
      if (userRole === 'provider') {
        console.log('Provider detected, redirecting to provider dashboard');
        navigate('/provider-dashboard');
        return;
      }

      const db = getFirestore();

      // Use userId for regular users
      const fieldPath = 'userId';

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where(fieldPath, '==', user.uid),
        orderBy('date', 'desc')
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsList = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to string if needed
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000).toISOString() : null
      }));

      setBookings(bookingsList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let unsubscribe = () => {};

    const setupBookingsListener = async () => {
      if (roleLoading) return;

      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error('You must be logged in to view your bookings');
        }

        // Check if the user is a provider, if so, redirect to provider dashboard
        if (userRole === 'provider') {
          console.log('Provider detected, redirecting to provider dashboard');
          navigate('/provider-dashboard');
          return;
        }

        const db = getFirestore();

        // Use userId for regular users
        const fieldPath = 'userId';

        const bookingsQuery = query(
          collection(db, 'bookings'),
          where(fieldPath, '==', user.uid),
          orderBy('date', 'desc')
        );

        // Set up real-time listener
        unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
          const bookingsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamp to string if needed
            createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000).toISOString() : null
          }));

          setBookings(bookingsList);
          setLoading(false);
        }, (error) => {
          console.error('Error in bookings listener:', error);
          setError('Failed to listen for booking updates. Please refresh the page.');
          setLoading(false);
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    setupBookingsListener();

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [roleLoading, userRole, navigate]);

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for comparison

    if (activeTab === 'upcoming') {
      // Only show upcoming bookings that are not cancelled, declined, not completed, and not in the past
      return bookingDate >= today &&
             booking.status !== 'cancelled' &&
             booking.status !== 'declined' &&
             booking.status !== 'completed';
    } else if (activeTab === 'past') {
      // Show past bookings or completed bookings that are not cancelled or declined
      return (bookingDate < today || booking.status === 'completed') &&
             booking.status !== 'cancelled' &&
             booking.status !== 'declined';
    } else if (activeTab === 'cancelled') {
      // Show cancelled bookings
      return booking.status === 'cancelled';
    } else if (activeTab === 'declined') {
      // Show declined bookings
      return booking.status === 'declined';
    }
    return true;
  });

  // Function to filter bookings based on search term
  const getFilteredBookingsBySearch = () => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return filteredBookings.filter(booking => {
      return (
        booking.providerFirstName?.toLowerCase().includes(lowercasedSearchTerm) ||
        booking.location?.toLowerCase().includes(lowercasedSearchTerm) ||
        booking.description?.toLowerCase().includes(lowercasedSearchTerm)
      );
    });
  };

  const handleAcceptCancellation = async (bookingId) => {
    try {
      setLoading(true);
      const db = getFirestore();

      // Get the booking first
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDocs(query(collection(db, 'bookings'), where('__name__', '==', bookingId)));

      if (bookingDoc.empty) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingDoc.docs[0].data();

      // Update booking status
      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancellationRequested: false,
        cancellationAccepted: true,
        cancellationAcceptedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Send notification to the service provider
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        await notifyProvider(
          bookingData.providerId,
          `${user.displayName || 'The customer'} has accepted your cancellation request for the booking on ${bookingData.date} at ${bookingData.time}.`,
          'cancellation_accepted_by_user',
          {
            bookingId: bookingId,
            date: bookingData.date,
            time: bookingData.time
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Continue with cancellation even if notification fails
      }

      // Refresh bookings
      fetchBookings();
    } catch (err) {
      setError('Failed to process cancellation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineCancellation = async (bookingId) => {
    try {
      setLoading(true);
      const db = getFirestore();

      // Get the booking first
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDocs(query(collection(db, 'bookings'), where('__name__', '==', bookingId)));

      if (bookingDoc.empty) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingDoc.docs[0].data();

      // Update booking to remove cancellation request
      await updateDoc(bookingRef, {
        cancellationRequested: false,
        cancellationDeclined: true,
        cancellationDeclinedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Send notification to the service provider
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        await notifyProvider(
          bookingData.providerId,
          `${user.displayName || 'The customer'} has declined your cancellation request for the booking on ${bookingData.date} at ${bookingData.time}. The booking will remain active.`,
          'cancellation_declined_by_user',
          {
            bookingId: bookingId,
            date: bookingData.date,
            time: bookingData.time
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Continue with cancellation even if notification fails
      }

      // Refresh bookings
      fetchBookings();
    } catch (err) {
      setError('Failed to process cancellation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelDialog = (booking) => {
    setSelectedBooking(booking);
    setShowCancelDialog(true);
    setCancellationReason('');
  };

  const handleCloseCancelDialog = () => {
    setShowCancelDialog(false);
    setSelectedBooking(null);
    setCancellationReason('');
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setCancellationLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in to cancel a booking');
      }

      await cancelBooking(selectedBooking.id, user.uid, cancellationReason);

      // Close the dialog and refresh bookings
      setShowCancelDialog(false);
      setSelectedBooking(null);
      setCancellationReason('');
      fetchBookings();

      // Show success message
      setError(null);
    } catch (err) {
      setError('Failed to cancel booking: ' + err.message);
    } finally {
      setCancellationLoading(false);
    }
  };

  // Function for providers to request cancellation
  const handleRequestCancellation = async (bookingId) => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in to request cancellation');
      }

      // Get the booking to check attempts
      const db = getFirestore();
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));

      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingDoc.data();
      const attempts = bookingData.cancellationAttempts || 0;

      // Show warning for second attempt
      if (attempts === 1) {
        if (!window.confirm('This is your second cancellation request for this booking. If declined, your next cancellation request will automatically cancel the booking but will affect your reliability score and prevent you from receiving bookings for 1 week. Do you want to proceed?')) {
          setLoading(false);
          return;
        }
      }

      // Show warning for third attempt
      if (attempts === 2) {
        if (!window.confirm('WARNING: This is your third cancellation request for this booking. This will automatically cancel the booking, reduce your reliability score, and prevent you from receiving bookings for 1 week. Do you want to proceed?')) {
          setLoading(false);
          return;
        }
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

      // Refresh bookings
      fetchBookings();
    } catch (err) {
      setError('Failed to request cancellation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get status icon based on booking status
  const getStatusIcon = (booking) => {
    // Check for cancellation request first
    if (booking.cancellationRequested) {
      return <FaTimesCircle className="status-icon cancellation-requested" />;
    }

    switch (booking.status) {
      case 'confirmed':
        return <FaCheckCircle className="status-icon confirmed" />;
      case 'pending':
      case 'pending_payment':
        return <FaHourglassHalf className="status-icon pending" />;
      case 'pending_confirmation':
        return <FaHourglassHalf className="status-icon pending-confirmation" />;
      case 'cancelled':
        return <FaTimesCircle className="status-icon cancelled" />;
      case 'declined':
        return <FaTimesCircle className="status-icon declined" />;
      default:
        return null;
    }
  };

  // Get status text based on booking status
  const getStatusText = (booking) => {
    // Check for cancellation request first
    if (booking.cancellationRequested) {
      return 'Cancellation Requested';
    }

    switch (booking.status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'pending_payment':
        return 'Pending Payment';
      case 'pending_confirmation':
        return 'Pending Provider Confirmation';
      case 'cancelled':
        return 'Cancelled';
      case 'declined':
        return booking.declineReason ? `Declined: ${booking.declineReason}` : 'Declined by Provider';
      default:
        return booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ');
    }
  };

  // Function to toggle the expanded state of a booking card
  const toggleBookingExpansion = (bookingId) => {
    setExpandedBookingId((prevId) => (prevId === bookingId ? null : bookingId));
  };

  if (loading) {
    return <div className="bookings-page loading">Loading your bookings...</div>;
  }

  if (error) {
    return <div className="bookings-page error">{error}</div>;
  }

  return (
    <div className="bookings-page">
      {showCancelDialog && selectedBooking && (
        <div className="cancel-dialog-overlay" onClick={handleCloseCancelDialog}>
          <div className="cancel-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-dialog-header">
              <FaExclamationTriangle className="warning-icon" />
              <h2>Cancel Booking</h2>
            </div>
            <div className="cancel-dialog-content">
              <p>Are you sure you want to cancel your booking with <strong>{selectedBooking.providerFirstName || 'Provider'}</strong> on <strong>{selectedBooking.date}</strong> at <strong>{selectedBooking.time}</strong>?</p>
              <p>This action cannot be undone.</p>

              <div className="form-group">
                <label htmlFor="cancellationReason">Reason for cancellation (optional):</label>
                <textarea
                  id="cancellationReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation"
                  rows={3}
                />
              </div>
            </div>
            <div className="cancel-dialog-actions">
              <button
                className="action-button confirm-cancel"
                onClick={handleCancelBooking}
                disabled={cancellationLoading}
              >
                {cancellationLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
              <button
                className="action-button keep-booking"
                onClick={handleCloseCancelDialog}
                disabled={cancellationLoading}
              >
                No, Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bookings-container">
        <h1>Your Bookings</h1>

        <div className="bookings-tabs">
          <button
            className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`tab-button ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
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
        </div>

        {/* Add search bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {getFilteredBookingsBySearch().length === 0 ? (
          <div className="no-bookings">
            <p>No {activeTab} bookings found.</p>
          </div>
        ) : (
          <div className="bookings-list">
            {getFilteredBookingsBySearch().map(booking => (
              <div
                key={booking.id}
                className={`booking-card ${expandedBookingId === booking.id ? 'expanded' : ''}`}
                onClick={() => toggleBookingExpansion(booking.id)}
              >
                <div className="booking-header">
                  <div className="booking-title">
                    <h2>{booking.providerFirstName || 'Provider'}</h2>
                    <p className="booking-service">{booking.service || 'Service'}</p>
                  </div>
                  <div className="booking-status">
                    {getStatusIcon(booking)}
                    <span className={`status-text ${booking.cancellationRequested ? 'cancellation-requested' : booking.status}`}>
                      {getStatusText(booking)}
                    </span>
                  </div>
                </div>

                {expandedBookingId === booking.id && (
                  <div className="booking-details">
                    <div className="detail">
                      <FaCalendarAlt className="detail-icon" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="detail">
                      <FaClock className="detail-icon" />
                      <span>{booking.time}</span>
                    </div>
                    <div className="detail">
                      <FaMapMarkerAlt className="detail-icon" />
                      <span title={booking.location}>{booking.location}</span>
                    </div>
                  </div>
                )}

                {expandedBookingId === booking.id && (
                  <div className="booking-description">
                    <p>{booking.description}</p>
                  </div>
                )}

                {expandedBookingId === booking.id && (
                  <div className="booking-actions">
                    {(booking.status === 'confirmed' || booking.status === 'pending_payment') && !booking.cancellationRequested && (
                      <>
                        <Link to={`/booking-confirmation/${booking.id}`} className="action-button view">
                          View Details
                        </Link>
                        <button
                          className="action-button cancel"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenCancelDialog(booking);
                          }}
                        >
                          Cancel Booking
                        </button>
                      </>
                    )}

                    {booking.cancellationRequested && (
                      <div className="cancellation-actions">
                        <p className="cancellation-message">The service provider has requested to cancel this booking. Would you like to accept?</p>
                        <div className="cancellation-buttons">
                          <button
                            onClick={() => handleAcceptCancellation(booking.id)}
                            className="action-button accept-cancel"
                            disabled={loading}
                          >
                            Accept Cancellation
                          </button>
                          <button
                            onClick={() => handleDeclineCancellation(booking.id)}
                            className="action-button decline-cancel"
                            disabled={loading}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingsPage;
