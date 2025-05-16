import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import './UserBookings.css';

function UserBookings({ userId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUserBookings = async () => {
      if (!userId) {
        setError('User ID not found');
        setLoading(false);
        return;
      }

      try {
        const db = getFirestore();
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsList = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setBookings(bookingsList);
      } catch (err) {
        setError('Failed to load your bookings');
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBookings();
  }, [userId]);

  const getFilteredBookings = () => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return bookings.filter(booking => {
      return (
        booking.providerFirstName?.toLowerCase().includes(lowercasedSearchTerm) ||
        booking.location?.toLowerCase().includes(lowercasedSearchTerm) ||
        booking.description?.toLowerCase().includes(lowercasedSearchTerm)
      );
    });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="user-bookings">
      <h2>My Booked Services</h2>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search bookings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="bookings-grid">
        {getFilteredBookings().length > 0 ? (
          getFilteredBookings().map(booking => (
            <div key={booking.id} className="booking-card">
              <h3>Service: {booking.providerFirstName || 'Provider'}</h3>
              <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {booking.time}</p>
              <p><strong>Location:</strong> {booking.location}</p>
              <p><strong>Description:</strong> {booking.description}</p>
              <p><strong>Status:</strong> <span className={`status-${booking.status}`}>{booking.status}</span></p>
            </div>
          ))
        ) : (
          <p className="no-bookings">You haven't made any bookings yet</p>
        )}
      </div>
    </div>
  );
}

export default UserBookings;