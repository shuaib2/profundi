import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { FaStar, FaCreditCard, FaCheckCircle } from 'react-icons/fa';
import useUserRole from '../hooks/useUserRole';
import useSubscription from '../hooks/useSubscription';
import { getImageUrl } from '../utils/imageUtils';
import './HomePage.css';

function HomePage() {
  const [user, setUser] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState(['all']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get user role from Firestore using our custom hook
  const { userRole } = useUserRole();

  // Get subscription status
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();

  // Check for error messages from redirects
  useEffect(() => {
    if (location.state && location.state.error) {
      setError(location.state.error);

      // Clear the error from location state after displaying it
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Clear all states when component unmounts
  useEffect(() => {
    return () => {
      setUser(null);
      setProviders([]);
      setLoading(false);
      setError(null);
      setSearchTerm('');
      setSelectedCategory('all');
      setCategories(['all']);
    };
  }, []);

  // Fetch unique professions for categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const db = getFirestore();
        const providersSnapshot = await getDocs(collection(db, 'serviceProviders'));

        // Extract unique professions
        const professions = new Set();
        providersSnapshot.forEach(doc => {
          const profession = doc.data().profession;
          if (profession) {
            // Store the profession as is, without converting to lowercase
            professions.add(profession);
          }
        });

        // Create categories array with 'all' as the first option
        // Convert to lowercase for comparison but keep original case for display
        const uniqueProfessions = Array.from(professions);
        const categoriesArray = ['all', ...uniqueProfessions.sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        )];
        console.log('Available categories:', categoriesArray);
        setCategories(categoriesArray);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Clear states when user logs out
        setProviders([]);
        localStorage.removeItem('userRole'); // Optional: clear userRole from localStorage
      }
    });

    return () => unsubscribe();
  }, []);

  // Redirect service providers to their dashboard
  useEffect(() => {
    if (userRole === 'provider') {
      navigate('/provider-dashboard');
    }
  }, [userRole, navigate]);

  const handleViewProvider = (providerId) => {
    navigate(`/provider/${providerId}`);
  };

  // Helper function to render star ratings
  const renderStars = (rating) => {
    const stars = [];
    const roundedRating = Math.round(rating);

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={i <= roundedRating ? "star filled" : "star empty"}
        />
      );
    }

    return stars;
  };

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const db = getFirestore();
        const providersRef = collection(db, 'serviceProviders');

        // Get all providers first, then filter client-side for better flexibility
        const providersSnapshot = await getDocs(providersRef);
        let providersList = providersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            averageRating: 0,
            reviewCount: 0,
            // Ensure reliability score exists (for older provider records)
            reliabilityScore: data.reliabilityScore || 100,
            bookingEnabled: data.bookingEnabled !== false // Default to true if not set
          };
        });

        // Filter out providers that haven't been verified by admin
        providersList = providersList.filter(provider => provider.documentsVerified === true);

        // Check if any providers are in penalty period
        for (let i = 0; i < providersList.length; i++) {
          if (providersList[i].penaltyEndDate) {
            const penaltyEndDate = new Date(providersList[i].penaltyEndDate);
            const now = new Date();

            // If penalty period has ended, update bookingEnabled
            if (now > penaltyEndDate) {
              providersList[i].bookingEnabled = true;
            } else {
              providersList[i].bookingEnabled = false;
            }
          }
        }

        // Filter by category if not 'all'
        if (selectedCategory !== 'all') {
          console.log('Filtering by category:', selectedCategory);
          providersList = providersList.filter(provider =>
            provider.profession &&
            provider.profession.toLowerCase() === selectedCategory.toLowerCase()
          );
        }

        // Fetch ratings for each provider
        for (const provider of providersList) {
          try {
            const reviewsQuery = query(
              collection(db, 'reviews'),
              where('providerId', '==', provider.id)
            );

            const reviewsSnapshot = await getDocs(reviewsQuery);

            if (!reviewsSnapshot.empty) {
              const reviews = reviewsSnapshot.docs.map(doc => doc.data());
              const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
              provider.averageRating = totalRating / reviews.length;
              provider.reviewCount = reviews.length;
            }
          } catch (ratingErr) {
            console.error('Error fetching ratings for provider:', provider.id, ratingErr);
            // Continue with next provider even if rating fetch fails
          }
        }

        // Log the providers for debugging
        providersList.forEach(provider => {
          const name = ((provider.firstName || '') + ' ' + (provider.lastName || '')).trim();
          console.log('Provider:', name, 'Profession:', provider.profession, 'Rating:', provider.averageRating.toFixed(1), '(', provider.reviewCount, 'reviews)');
        });

        // Apply search filter if searchTerm exists
        if (searchTerm) {
          providersList = providersList.filter(provider =>
            ((provider.firstName || '') + ' ' + (provider.lastName || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (provider.profession || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (provider.location || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setProviders(providersList);
      } catch (err) {
        setError('Failed to load service providers');
        console.error('Error fetching providers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userRole !== 'provider') {
      fetchProviders();
    }
  }, [userRole, selectedCategory, searchTerm]);

  // Added dynamic class for reliability score styling
  function getReliabilityClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Find Skilled Professionals <span className="subtitle">across South Africa</span></h1>
            <p className="tagline">Connecting clients with qualified experts from all communities, including talented professionals from underserved areas</p>
            <div className="hero-features">
              <div className="feature">
                <span className="feature-icon">⭐</span>
                <span>Quality Service</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🤝</span>
                <span>Community Support</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🔍</span>
                <span>Find Nearby Pros</span>
              </div>
            </div>
            {!user && (
              <div className="cta-buttons">
                <Link to="/register/user" className="cta-button">Find a Professional</Link>
                <Link to="/register/provider" className="cta-button provider">Join as a Professional</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {userRole !== 'provider' && (
        <div className="search-section">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, profession, or location..."
            className="search-input"
          />
          <div className="categories">
            <button
              className="category-button"
              onClick={() => setShowCategoryModal(true)}
            >
              {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {user && userRole !== 'provider' && !subscriptionLoading && (
        <div className={`subscription-status-banner ${isSubscribed ? 'subscribed' : 'not-subscribed'}`}>
          {isSubscribed ? (
            <div className="subscription-status-content">
              <FaCheckCircle className="subscription-icon" />
              <h3>Active Subscription</h3>
              <p>You can book any service provider without restrictions.</p>
            </div>
          ) : (
            <div className="subscription-status-content">
              <FaCreditCard className="subscription-icon" />
              <h3>Subscribe Now</h3>
              <p>Subscribe for R35/month to book service providers</p>
              <Link to="/subscription" className="subscribe-button">Subscribe</Link>
            </div>
          )}
        </div>
      )}

      {!loading && !error && userRole !== 'provider' && (
        <div className="providers-section">
          <h2>Available Service Providers</h2>
          <div className="providers-grid">
            {providers.length > 0 ? (
              providers.map(provider => (
                <div
                  key={provider.id}
                  className="provider-card mobile-layout"
                  onClick={() => handleViewProvider(provider.id)}
                >
                  <div className="provider-image">
                    <img
                      src={getImageUrl(provider.profileImagePath || provider.profileImagePath)}
                      alt={`${(provider.firstName || '') + (provider.lastName ? ' ' + provider.lastName : '') || 'Provider'}`}
                      className="provider-avatar"
                      onError={(e) => {
                        e.target.src = '/images/default-avatar.png';
                      }}
                    />
                  </div>
                  <div className="provider-info">
                    <h3>{provider.firstName || 'Provider'}</h3>
                    <p className="profession">{provider.profession}</p>
                    <p className="location">{provider.location ? provider.location.split(',')[0] : 'Location not available'}</p>
                    <p className={`reliability-score ${getReliabilityClass(provider.reliabilityScore)}`}>
                      Reliability: {provider.reliabilityScore || 'N/A'}
                    </p>
                    <div className="provider-rating">
                      <div className="star-rating">
                        {renderStars(provider.averageRating)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results">No service providers found</p>
            )}
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="category-modal">
          <div className="modal-content">
            <button className="close-modal" onClick={() => setShowCategoryModal(false)}>
              &times;
            </button>
            <h2>Select a Category</h2>
            <ul className="category-list">
              {categories.map(category => (
                <li
                  key={category}
                  className="category-item"
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowCategoryModal(false);
                  }}
                >
                  {category === 'all' ? 'All' : category}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;