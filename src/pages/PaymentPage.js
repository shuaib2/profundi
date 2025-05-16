import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCheckCircle, FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';
import { notifyBookingParticipants } from '../utils/notificationUtils';
import './PaymentPage.css';

function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Booking fee amount in Rand
  const BOOKING_FEE = 35;

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error('You must be logged in to complete payment');
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
        console.log('Fetching provider with ID:', bookingData.providerId);
        console.log('Booking data:', bookingData);

        // Try to fetch using providerDocId if available, otherwise use providerId
        const providerDocId = bookingData.providerDocId || bookingData.providerId;
        console.log('Using provider doc ID:', providerDocId);

        const providerDoc = await getDoc(doc(db, 'serviceProviders', providerDocId));
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

  const handlePayment = async () => {
    setPaymentProcessing(true);
    setError(null);

    try {
      // In a real implementation, this would integrate with a payment gateway
      // For now, we'll simulate a successful payment

      // Wait for 2 seconds to simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update booking status in Firestore
      const db = getFirestore();
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed',
        bookingFee: BOOKING_FEE,
        paymentStatus: 'completed',
        paymentDate: new Date().toISOString(),
        // In a real implementation, you would store the payment ID from your payment processor
        paymentId: 'sim_' + Math.random().toString(36).substring(2, 15)
      });

      // Send notifications to both user and provider
      try {
        await notifyBookingParticipants(
          {
            id: bookingId,
            userId: booking.userId,
            providerId: booking.providerId
          },
          `Your booking with ${provider.fullName.split(' ')[0]} has been confirmed for ${booking.date} at ${booking.time}`,
          `${booking.customerName} has made a booking with you for ${booking.date} at ${booking.time}. Please accept or decline this booking.`,
          'booking_confirmed'
        );
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
        // Continue with payment success even if notifications fail
      }

      console.log('Payment processing completed successfully');

      setPaymentSuccess(true);

      // Wait 2 seconds before redirecting to confirmation page
      setTimeout(() => {
        navigate(`/booking-confirmation/${bookingId}`);
      }, 2000);
    } catch (err) {
      setError('Payment failed: ' + err.message);
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return <div className="payment-page loading">Loading payment details...</div>;
  }

  if (error) {
    return <div className="payment-page error">{error}</div>;
  }

  if (paymentSuccess) {
    return (
      <div className="payment-page success">
        <div className="success-container">
          <FaCheckCircle className="success-icon" />
          <h2>Payment Successful!</h2>
          <p>Your booking has been sent to the service provider.</p>
          <p>Redirecting to confirmation page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <h1>Complete Your Booking</h1>

        <div className="booking-summary">
          <h2>Booking Summary</h2>
          <div className="summary-details">
            <div className="summary-item">
              <span className="label">Service Provider:</span>
              <span className="value">{provider.fullName}</span>
            </div>
            <div className="summary-item">
              <span className="label">Service:</span>
              <span className="value">{provider.profession}</span>
            </div>
            <div className="summary-item">
              <span className="label">Date:</span>
              <span className="value">{booking.date}</span>
            </div>
            <div className="summary-item">
              <span className="label">Time:</span>
              <span className="value">{booking.time}</span>
            </div>
            <div className="summary-item">
              <span className="label">Location:</span>
              <span className="value">{booking.location}</span>
            </div>
          </div>
        </div>

        <div className="payment-details">
          <h2>Payment Details</h2>
          <div className="fee-explanation">
            <p>
              <strong>Booking Fee: R{BOOKING_FEE}</strong>
            </p>
            <p className="fee-note">
              This is a one-time booking fee to connect you with the service provider.
              You will pay the service provider directly for their services.
            </p>
          </div>

          <div className="payment-methods">
            <h3>Select Payment Method</h3>
            <div className="payment-method-options">
              <div className="payment-method active">
                <FaCreditCard className="payment-icon" />
                <span>Credit/Debit Card</span>
              </div>
              <div className="payment-method disabled">
                <FaMoneyBillWave className="payment-icon" />
                <span>EFT (Coming Soon)</span>
              </div>
            </div>

            {/* In a real implementation, this would be replaced with a proper payment form */}
            <div className="card-details">
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number</label>
                <input
                  type="text"
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  value="4242 4242 4242 4242"
                  readOnly
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiryDate">Expiry Date</label>
                  <input
                    type="text"
                    id="expiryDate"
                    placeholder="MM/YY"
                    maxLength="5"
                    value="12/25"
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input
                    type="text"
                    id="cvv"
                    placeholder="123"
                    maxLength="3"
                    value="123"
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="cardName">Name on Card</label>
                <input
                  type="text"
                  id="cardName"
                  placeholder="John Doe"
                  value="Test User"
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="payment-actions">
            <button
              className="pay-button"
              onClick={handlePayment}
              disabled={paymentProcessing}
            >
              {paymentProcessing ? 'Processing...' : `Pay R${BOOKING_FEE} Now`}
            </button>
            <button
              className="cancel-button"
              onClick={() => navigate(-1)}
              disabled={paymentProcessing}
            >
              Cancel
            </button>
          </div>

          <div className="payment-security">
            <p>
              <small>
                Your payment information is secure. We use industry-standard encryption to protect your data.
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
