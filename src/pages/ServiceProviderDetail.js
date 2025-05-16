import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaMapMarkerAlt, FaPhone, FaStar, FaCalendarAlt, FaShieldAlt } from 'react-icons/fa';
import ReviewsList from '../components/ReviewsList';
import ReviewForm from '../components/ReviewForm';
import ContactReminderModal from '../components/ContactReminderModal';
import { getImageUrl } from '../utils/imageUtils';
import './ServiceProviderDetail.css';

function ServiceProviderDetail() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [refreshReviews, setRefreshReviews] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [hasShownContactModal, setHasShownContactModal] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    setIsLoggedIn(!!auth.currentUser);

    const fetchProviderDetails = async () => {
      try {
        const db = getFirestore();
        const providerDoc = await getDoc(doc(db, 'serviceProviders', providerId));

        if (!providerDoc.exists()) {
          throw new Error('Service provider not found');
        }

        const providerData = providerDoc.data();

        // Check if provider is verified
        if (!providerData.documentsVerified) {
          throw new Error('This service provider has not been verified by an administrator yet.');
        }

        setProvider({ id: providerDoc.id, ...providerData });

        // Check if provider is temporarily unavailable (in penalty period)
        if (providerData.bookingEnabled === false) {
          if (providerData.penaltyEndDate) {
            const penaltyEndDate = new Date(providerData.penaltyEndDate);
            const now = new Date();

            // If penalty period has not ended
            if (now < penaltyEndDate) {
              console.log('Provider is in penalty period until', penaltyEndDate.toLocaleDateString());
            }
          }
        }

        // Fetch reviews to calculate average rating
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', providerId)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);

        if (!reviewsSnapshot.empty) {
          const reviews = reviewsSnapshot.docs.map(doc => doc.data());
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(totalRating / reviews.length);
          setReviewCount(reviews.length);
        }
      } catch (err) {
        console.error('Error fetching provider details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderDetails();
  }, [providerId, refreshReviews]);

  const handleBooking = () => {
    if (!hasShownContactModal) {
      setShowContactModal(true);
    } else {
      navigate(`/book/${providerId}`, { replace: true });
    }
  };

  const handleCloseContactModal = () => {
    setShowContactModal(false);
  };

  const handleContinueToBooking = () => {
    setShowContactModal(false);
    setHasShownContactModal(true);
    navigate(`/book/${providerId}`, { replace: true });
  };

  const handleReviewSubmitted = () => {
    setRefreshReviews(prev => !prev);
  };

  const getProviderImageUrl = () => {
    if (!provider) return '/images/default-avatar.png';
    // Only use profileImagePath, fallback to default avatar
    return getImageUrl(provider.profileImagePath || '');
  };

  const renderStars = (rating) => {
    return (
      <div className="star-rating">
        {[...Array(5)].map((_, index) => (
          <FaStar
            key={index}
            className={index < Math.round(rating) ? 'star filled' : 'star empty'}
          />
        ))}
      </div>
    );
  };

  // Function to get reliability score class
  const getReliabilityClass = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  };

  if (loading) {
    return <div className="provider-detail-page loading">Loading provider details...</div>;
  }

  if (error) {
    return <div className="provider-detail-page error">{error}</div>;
  }

  return (
    <div className="provider-detail-page">
      {showContactModal && (
        <ContactReminderModal
          onClose={handleCloseContactModal}
          onContinue={handleContinueToBooking}
        />
      )}
      <div className="provider-header">
        <div className="provider-profile">
          <img
            src={getProviderImageUrl()}
            alt={provider.firstName || provider.fullName || 'Provider'}
            className="provider-image"
            onError={(e) => {
              e.target.src = '/images/default-avatar.png';
            }}
          />
          <div className="provider-info">
            <h1>{provider.firstName || provider.fullName || 'Provider'}</h1>
            <p className="profession">{provider.profession}</p>
            <div className="provider-rating">
              {renderStars(averageRating)}
              <span className="rating-text">
                {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            <div className="provider-reliability">
              <FaShieldAlt className={`reliability-icon ${getReliabilityClass(provider.reliabilityScore || 100)}`} />
              <span className="reliability-text">
                Reliability: {provider.reliabilityScore || 100}%
              </span>
            </div>
            <p className="location full-width" title={provider.location}>
              <FaMapMarkerAlt className="icon" /> {provider.location ? provider.location.split(' ')[0] : 'Location not available'}
            </p>
            {isLoggedIn && (
              <p className="phone contact-masked">
                <FaPhone className="icon" />
                <span className="masked-info">Provider will contact you after booking is confirmed</span>
              </p>
            )}
          </div>
        </div>

        {isLoggedIn ? (
          provider.bookingEnabled === false ? (
            <div className="provider-booking-message penalty">
              <p>This provider is temporarily unavailable for booking.</p>
              <p className="penalty-message">
                Available again: {provider.penaltyEndDate ? new Date(provider.penaltyEndDate).toLocaleDateString() : 'Soon'}
              </p>
            </div>
          ) : (
            <button onClick={handleBooking} className="book-button">
              <FaCalendarAlt className="icon" /> Book Now
            </button>
          )
        ) : (
          <button onClick={() => navigate('/login')} className="login-button">
            Login to Book
          </button>
        )}
      </div>

      <div className="provider-sections">
        <div className="provider-about">
          <h2>About</h2>
          <p>
            {provider.bio || `${provider.firstName || provider.fullName || 'Provider'} is a professional ${provider.profession} based in ${provider.location || 'South Africa'}.`}
          </p>
        </div>

        <div className="provider-services">
          <h2>Services</h2>
          <div className="service-list">
            <div className="service-item">
              <h3>{provider.profession}</h3>
              <p>Professional {provider.profession} services</p>
            </div>
          </div>
        </div>

        <ReviewsList providerId={providerId} />

        {isLoggedIn && (
          <ReviewForm
            providerId={providerId}
            providerName={provider.firstName || provider.fullName || 'Provider'}
            onReviewSubmitted={handleReviewSubmitted}
          />
        )}
      </div>
    </div>
  );
}

export default ServiceProviderDetail;
