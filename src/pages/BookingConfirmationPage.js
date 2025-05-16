import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCheckCircle, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaPhoneAlt, FaTimesCircle } from 'react-icons/fa';
import { getImageUrl } from '../utils/imageUtils';
import './BookingConfirmationPage.css';

function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error('You must be logged in to view booking details');
        }

        const db = getFirestore();
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));

        if (!bookingDoc.exists()) {
          throw new Error('Booking not found');
        }

        const bookingData = bookingDoc.data();

        // Verify that the current user is the one who made the booking
        if (bookingData.userId !== user.uid) {
          throw new Error('You are not authorized to access this booking');
        }

        // Fetch provider details
        const providerDoc = await getDoc(doc(db, 'serviceProviders', bookingData.providerId));
        if (!providerDoc.exists()) {
          throw new Error('Service provider not found');
        }

        setBooking({ id: bookingDoc.id, ...bookingData });
        setProvider({ id: providerDoc.id, ...providerDoc.data() });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return <div className="confirmation-page loading">Loading booking details...</div>;
  }

  if (error) {
    return <div className="confirmation-page error">{error}</div>;
  }

  const getProviderImageUrl = () => {
    if (!provider || !provider.profileImagePath) return '/images/default-avatar.png';
    return getImageUrl(provider.profileImagePath);
  };

  // Function to get the appropriate header content based on booking status
  const getStatusHeader = () => {
    const providerDisplayName = provider.firstName || provider.fullName || 'Provider';
    switch(booking.status) {
      case 'confirmed':
        return (
          <>
            <FaCheckCircle className="confirmation-icon" />
            <h1>Booking Confirmed!</h1>
            <p className="confirmation-message">
              Your booking with {providerDisplayName} has been confirmed.
            </p>
          </>
        );
      case 'pending_confirmation':
        return (
          <>
            <FaClock className="confirmation-icon pending" />
            <h1>Booking Pending Confirmation</h1>
            <p className="confirmation-message">
              Your booking with {providerDisplayName} is waiting for their confirmation.
            </p>
          </>
        );
      case 'declined':
        return (
          <>
            <FaTimesCircle className="confirmation-icon declined" />
            <h1>Booking Declined</h1>
            <p className="confirmation-message">
              Your booking with {providerDisplayName} has been declined.
              {booking.declineReason && <span className="decline-reason"> Reason: {booking.declineReason}</span>}
            </p>
          </>
        );
      default:
        return (
          <>
            <FaCheckCircle className="confirmation-icon" />
            <h1>Booking Submitted</h1>
            <p className="confirmation-message">
              Your booking with {providerDisplayName} has been submitted.
            </p>
          </>
        );
    }
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <div className={`confirmation-header ${booking.status}`}>
          {getStatusHeader()}
        </div>

        <div className="booking-details">
          <h2>Booking Details</h2>

          <div className="detail-item">
            <FaCalendarAlt className="detail-icon" />
            <div className="detail-content">
              <h3>Date</h3>
              <p>{booking.date}</p>
            </div>
          </div>

          <div className="detail-item">
            <FaClock className="detail-icon" />
            <div className="detail-content">
              <h3>Time</h3>
              <p>{booking.time}</p>
            </div>
          </div>

          <div className="detail-item">
            <FaMapMarkerAlt className="detail-icon" />
            <div className="detail-content">
              <h3>Location</h3>
              <p>{booking.location}</p>
            </div>
          </div>

          <div className="detail-item description">
            <div className="detail-content">
              <h3>Description</h3>
              <p>{booking.description}</p>
            </div>
          </div>
        </div>

        <div className="provider-contact">
          <h2>Service Provider Information</h2>
          <div className={`contact-notice ${booking.status}`}>
            {booking.status === 'confirmed' && (
              <>
                <FaCheckCircle className="notice-icon" />
                <p>Your booking with this provider is confirmed</p>
              </>
            )}
            {booking.status === 'pending_confirmation' && (
              <>
                <FaClock className="notice-icon pending" />
                <p>Waiting for provider to confirm your booking</p>
              </>
            )}
            {booking.status === 'declined' && (
              <>
                <FaTimesCircle className="notice-icon declined" />
                <p>This provider has declined your booking</p>
              </>
            )}
          </div>
          <div className="provider-card">
            <img
              src={getProviderImageUrl()}
              alt={provider.firstName || provider.fullName || 'Provider'}
              className="provider-image"
              onError={(e) => {
                e.target.src = '/images/default-avatar.png';
              }}
            />
            <div className="provider-info">
              <h3>{provider.firstName || provider.fullName || 'Provider'}</h3>
              <p className="provider-profession">{provider.profession}</p>
              <div className="provider-contact-details">
                <p className="contact-instructions">
                  <FaPhoneAlt className="contact-icon" />
                  The provider will contact you directly to discuss service details
                </p>
              </div>
            </div>
          </div>

          <div className="payment-info">
            <h3>Payment Information</h3>
            <p>This booking is included in your monthly subscription.</p>
            <p className="payment-note">
              Please arrange payment for the service directly with the service provider.
            </p>
          </div>
        </div>

        <div className="confirmation-actions">
          <Link to="/" className="home-button">Return to Home</Link>
          <Link to="/bookings" className="bookings-button">View All Bookings</Link>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmationPage;
