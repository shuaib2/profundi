import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FaStar, FaStarHalfAlt, FaRegStar, FaUser, FaCalendarAlt } from 'react-icons/fa';
import './ReviewsList.css';

function ReviewsList({ providerId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCounts, setRatingCounts] = useState({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  });

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', providerId),
          orderBy('createdAt', 'desc')
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        if (reviewsSnapshot.empty) {
          setReviews([]);
          setAverageRating(0);
          return;
        }
        
        const reviewsList = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? 
            new Date(doc.data().createdAt.seconds * 1000) : 
            new Date()
        }));
        
        setReviews(reviewsList);
        
        // Calculate average rating and rating counts
        const totalRating = reviewsList.reduce((sum, review) => sum + review.rating, 0);
        const avgRating = totalRating / reviewsList.length;
        setAverageRating(avgRating);
        
        // Count ratings by star level
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewsList.forEach(review => {
          counts[review.rating] = (counts[review.rating] || 0) + 1;
        });
        setRatingCounts(counts);
        
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    
    if (providerId) {
      fetchReviews();
    }
  }, [providerId]);
  
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={`full-${i}`} className="star-icon filled" />);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="star-icon half" />);
    }
    
    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="star-icon empty" />);
    }
    
    return stars;
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const calculateRatingPercentage = (count) => {
    if (reviews.length === 0) return 0;
    return (count / reviews.length) * 100;
  };
  
  if (loading) {
    return <div className="reviews-loading">Loading reviews...</div>;
  }
  
  if (error) {
    return <div className="reviews-error">{error}</div>;
  }
  
  return (
    <div className="reviews-container">
      <h3>Customer Reviews</h3>
      
      {reviews.length > 0 ? (
        <>
          <div className="reviews-summary">
            <div className="average-rating">
              <div className="rating-number">{averageRating.toFixed(1)}</div>
              <div className="rating-stars">{renderStars(averageRating)}</div>
              <div className="rating-count">Based on {reviews.length} reviews</div>
            </div>
            
            <div className="rating-breakdown">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="rating-bar">
                  <div className="rating-label">{star} star</div>
                  <div className="rating-progress">
                    <div 
                      className="rating-progress-fill"
                      style={{ width: `${calculateRatingPercentage(ratingCounts[star])}%` }}
                    ></div>
                  </div>
                  <div className="rating-count-small">{ratingCounts[star]}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="reviewer-info">
                    <FaUser className="reviewer-icon" />
                    <span className="reviewer-name">{review.userName}</span>
                  </div>
                  <div className="review-date">
                    <FaCalendarAlt className="date-icon" />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
                
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
                
                <div className="review-comment">
                  {review.comment}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="no-reviews">
          <p>No reviews yet. Be the first to review this service provider!</p>
        </div>
      )}
    </div>
  );
}

export default ReviewsList;
