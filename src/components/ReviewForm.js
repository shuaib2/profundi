import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { FaStar } from 'react-icons/fa';
import './ReviewForm.css';

function ReviewForm({ providerId, providerName, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [completedBookings, setCompletedBookings] = useState([]);

  useEffect(() => {
    const checkPreviousReviews = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) return;
        
        const db = getFirestore();
        
        // Check if user has already reviewed this provider
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', user.uid),
          where('providerId', '==', providerId)
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
        setHasReviewed(!reviewsSnapshot.empty);
        
        // Check if user has completed bookings with this provider
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('userId', '==', user.uid),
          where('providerId', '==', providerId),
          where('status', '==', 'completed')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        setCompletedBookings(bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      } catch (err) {
        console.error('Error checking previous reviews:', err);
      }
    };
    
    checkPreviousReviews();
  }, [providerId]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (comment.trim().length < 10) {
      setError('Please provide a comment (minimum 10 characters)');
      return;
    }
    
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setError('You must be logged in to submit a review');
        return;
      }
      
      if (completedBookings.length === 0) {
        setError('You can only review service providers after completing a booking with them');
        return;
      }
      
      const db = getFirestore();
      
      // Create the review
      await addDoc(collection(db, 'reviews'), {
        providerId,
        providerName,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating,
        comment,
        createdAt: serverTimestamp(),
        bookingId: completedBookings[0].id // Reference to the completed booking
      });
      
      setSuccess('Your review has been submitted successfully!');
      setRating(0);
      setComment('');
      setHasReviewed(true);
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (hasReviewed) {
    return (
      <div className="review-form-container">
        <div className="review-success">
          <p>You have already reviewed this service provider. Thank you for your feedback!</p>
        </div>
      </div>
    );
  }
  
  if (completedBookings.length === 0) {
    return (
      <div className="review-form-container">
        <div className="review-notice">
          <p>You can only review service providers after completing a booking with them.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="review-form-container">
      <h3>Write a Review</h3>
      <form onSubmit={handleSubmit} className="review-form">
        <div className="rating-container">
          <p>Rate your experience:</p>
          <div className="star-rating">
            {[...Array(5)].map((_, index) => {
              const ratingValue = index + 1;
              
              return (
                <label key={index}>
                  <input
                    type="radio"
                    name="rating"
                    value={ratingValue}
                    onClick={() => setRating(ratingValue)}
                  />
                  <FaStar
                    className="star"
                    color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                    size={24}
                    onMouseEnter={() => setHover(ratingValue)}
                    onMouseLeave={() => setHover(0)}
                  />
                </label>
              );
            })}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="comment">Your Review:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this service provider..."
            rows={4}
            required
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

export default ReviewForm;
