import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getSubscription, hasActiveSubscription } from '../models/subscriptionModel';

/**
 * Custom hook to get and manage user subscription status
 * @returns {Object} - Subscription data and helper functions
 */
const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();

  // Fetch subscription data when the component mounts or auth changes
  useEffect(() => {
    const fetchSubscription = async () => {
      setLoading(true);
      setError(null);

      try {
        const user = auth.currentUser;
        
        if (!user) {
          setSubscription(null);
          setIsSubscribed(false);
          setLoading(false);
          return;
        }

        // Get the user's subscription
        const subscriptionData = await getSubscription(user.uid);
        setSubscription(subscriptionData);
        
        // Check if the user has an active subscription
        const active = await hasActiveSubscription(user.uid);
        setIsSubscribed(active);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [auth.currentUser]);

  // Function to refresh subscription data
  const refreshSubscription = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      
      if (!user) {
        setSubscription(null);
        setIsSubscribed(false);
        return;
      }

      // Get the user's subscription
      const subscriptionData = await getSubscription(user.uid);
      setSubscription(subscriptionData);
      
      // Check if the user has an active subscription
      const active = await hasActiveSubscription(user.uid);
      setIsSubscribed(active);
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      setError('Failed to refresh subscription data');
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    isSubscribed,
    loading,
    error,
    refreshSubscription
  };
};

export default useSubscription;
