import React, { useState } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaPhone, FaMoneyBillWave, FaInfoCircle, FaTimes, FaCheck } from 'react-icons/fa';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import './BookingDetailModal.css';

function BookingDetailModal({ booking, onClose, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  if (!booking) return null;

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'confirmed':
        return <span className="status-badge confirmed">Pending</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      default:
        return <span className="status-badge">{booking.status}</span>;
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      setMessage('');

      const db = getFirestore();
      const bookingRef = doc(db, 'bookings', booking.id);

      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      setMessage(`Booking status updated to ${newStatus}`);
      setMessageType('success');

      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate(booking.id, newStatus);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCancellation = async () => {
    try {
      setLoading(true);
      setMessage('');

      const db = getFirestore();
      const bookingRef = doc(db, 'bookings', booking.id);

      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancellationApproved: true,
        updatedAt: new Date().toISOString()
      });

      setMessage('Cancellation request approved');
      setMessageType('success');

      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate(booking.id, 'cancelled');
      }
    } catch (error) {
      console.error('Error approving cancellation:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectCancellation = async () => {
    try {
      setLoading(true);
      setMessage('');

      const db = getFirestore();
      const bookingRef = doc(db, 'bookings', booking.id);

      await updateDoc(bookingRef, {
        cancellationRequested: false,
        updatedAt: new Date().toISOString()
      });

      setMessage('Cancellation request rejected');
      setMessageType('success');

      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate(booking.id, booking.status);
      }
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Booking Details</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <div className="booking-header">
            <div className="booking-id">
              <span className="booking-id-label">Booking ID:</span>
              <span className="booking-id-value">{booking.id}</span>
            </div>
            <div className="booking-status">
              {getStatusBadge()}
              {booking.cancellationRequested && (
                <span className="cancellation-badge">Cancellation Requested</span>
              )}
            </div>
          </div>

          <div className="booking-section">
            <h3>Appointment Details</h3>

            <div className="detail-item">
              <FaCalendarAlt className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Date</p>
                <p className="detail-value">{booking.date}</p>
              </div>
            </div>

            <div className="detail-item">
              <FaClock className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Time</p>
                <p className="detail-value">{booking.time}</p>
              </div>
            </div>

            <div className="detail-item">
              <FaMapMarkerAlt className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Location</p>
                <p className="detail-value">{booking.location || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <div className="booking-section">
            <h3>Customer Information</h3>

            <div className="detail-item">
              <FaUser className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Customer Name</p>
                <p className="detail-value">{booking.customerName}</p>
              </div>
            </div>

            <div className="detail-item">
              <FaPhone className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Phone Number</p>
                <p className="detail-value">{booking.customerPhone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div className="booking-section">
            <h3>Provider Information</h3>

            <div className="detail-item">
              <FaUser className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Provider Name</p>
                <p className="detail-value">{booking.providerName}</p>
              </div>
            </div>

            <div className="detail-item">
              <FaPhone className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Contact Instructions</p>
                <p className="detail-value contact-instructions">The provider will contact you directly to discuss service details</p>
              </div>
            </div>
          </div>

          <div className="booking-section">
            <h3>Payment Information</h3>

            <div className="detail-item">
              <FaMoneyBillWave className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Service Fee</p>
                <p className="detail-value">R{booking.price || '0'}</p>
              </div>
            </div>

            <div className="detail-item">
              <FaInfoCircle className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Payment Status</p>
                <p className="detail-value">{booking.paymentStatus || 'Not paid'}</p>
              </div>
            </div>
          </div>

          <div className="booking-section">
            <h3>Service Description</h3>
            <p className="booking-description">{booking.description || 'No description provided'}</p>
          </div>

          {booking.notes && (
            <div className="booking-section">
              <h3>Additional Notes</h3>
              <p className="booking-notes">{booking.notes}</p>
            </div>
          )}

          {booking.cancellationRequested && (
            <div className="booking-actions">
              <h3>Cancellation Request</h3>
              <p className="cancellation-info">
                This booking has a pending cancellation request. Please review and take action.
              </p>
              <div className="action-buttons">
                <button
                  className="action-button approve"
                  onClick={handleApproveCancellation}
                  disabled={loading}
                >
                  <FaCheck /> Approve Cancellation
                </button>
                <button
                  className="action-button reject"
                  onClick={handleRejectCancellation}
                  disabled={loading}
                >
                  <FaTimes /> Reject Cancellation
                </button>
              </div>
            </div>
          )}

          {!booking.cancellationRequested && (
            <div className="booking-actions">
              <h3>Update Status</h3>
              <div className="action-buttons">
                {booking.status !== 'confirmed' && (
                  <button
                    className="action-button confirm"
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={loading}
                  >
                    Mark as Pending
                  </button>
                )}

                {booking.status !== 'completed' && (
                  <button
                    className="action-button complete"
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={loading}
                  >
                    Mark as Completed
                  </button>
                )}

                {booking.status !== 'cancelled' && (
                  <button
                    className="action-button cancel"
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={loading}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingDetailModal;
