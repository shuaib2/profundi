import { getFirestore, doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// Constants for reliability score calculations
const INITIAL_RELIABILITY_SCORE = 100;
const SECOND_CANCELLATION_PENALTY = 5;
const THIRD_CANCELLATION_PENALTY = 15;
const SUCCESSFUL_BOOKING_BONUS = 1;
const MAX_RELIABILITY_SCORE = 100;
const MIN_RELIABILITY_SCORE = 0;
const PENALTY_DURATION_DAYS = 7; // 1 week booking suspension

/**
 * Initialize reliability score for a new provider
 * @param {string} providerId - The provider's ID
 * @returns {Promise<void>}
 */
export const initializeReliabilityScore = async (providerId) => {
  try {
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    
    // Get current provider data
    const providerDoc = await getDoc(providerRef);
    
    if (!providerDoc.exists()) {
      throw new Error('Provider not found');
    }
    
    const providerData = providerDoc.data();
    
    // Only initialize if not already set
    if (providerData.reliabilityScore === undefined) {
      await updateDoc(providerRef, {
        reliabilityScore: INITIAL_RELIABILITY_SCORE,
        cancellationCount: 0,
        recentCancellations: 0,
        lastPenaltyDate: null,
        bookingEnabled: true
      });
    }
  } catch (error) {
    console.error('Error initializing reliability score:', error);
    throw error;
  }
};

/**
 * Get a provider's reliability score and related data
 * @param {string} providerId - The provider's ID
 * @returns {Promise<Object>} - The reliability data
 */
export const getReliabilityData = async (providerId) => {
  try {
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    const providerDoc = await getDoc(providerRef);
    
    if (!providerDoc.exists()) {
      throw new Error('Provider not found');
    }
    
    const providerData = providerDoc.data();
    
    // If reliability score doesn't exist yet, initialize it
    if (providerData.reliabilityScore === undefined) {
      await initializeReliabilityScore(providerId);
      return {
        reliabilityScore: INITIAL_RELIABILITY_SCORE,
        cancellationCount: 0,
        recentCancellations: 0,
        lastPenaltyDate: null,
        bookingEnabled: true
      };
    }
    
    return {
      reliabilityScore: providerData.reliabilityScore,
      cancellationCount: providerData.cancellationCount || 0,
      recentCancellations: providerData.recentCancellations || 0,
      lastPenaltyDate: providerData.lastPenaltyDate,
      bookingEnabled: providerData.bookingEnabled !== false // Default to true if not set
    };
  } catch (error) {
    console.error('Error getting reliability data:', error);
    throw error;
  }
};

/**
 * Update cancellation attempts for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} providerId - The provider's ID
 * @returns {Promise<Object>} - Updated booking data with cancellation attempts
 */
export const updateCancellationAttempts = async (bookingId, providerId) => {
  try {
    const db = getFirestore();
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingDoc.data();
    
    // Verify the booking belongs to the provider
    if (bookingData.providerId !== providerId) {
      throw new Error('Provider is not authorized to cancel this booking');
    }
    
    // Get current cancellation attempts or initialize to 0
    const currentAttempts = bookingData.cancellationAttempts || 0;
    const newAttempts = currentAttempts + 1;
    
    // Update the booking with new attempt count and timestamp
    await updateDoc(bookingRef, {
      cancellationAttempts: newAttempts,
      lastCancellationAttemptDate: new Date().toISOString()
    });
    
    return {
      ...bookingData,
      cancellationAttempts: newAttempts,
      lastCancellationAttemptDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating cancellation attempts:', error);
    throw error;
  }
};

/**
 * Apply penalty to provider for third cancellation strike
 * @param {string} providerId - The provider's ID
 * @returns {Promise<Object>} - Updated reliability data
 */
export const applyThirdStrikePenalty = async (providerId) => {
  try {
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    
    // Get current reliability data
    const reliabilityData = await getReliabilityData(providerId);
    
    // Calculate new reliability score
    const newScore = Math.max(
      reliabilityData.reliabilityScore - THIRD_CANCELLATION_PENALTY,
      MIN_RELIABILITY_SCORE
    );
    
    // Calculate penalty end date (7 days from now)
    const penaltyEndDate = new Date();
    penaltyEndDate.setDate(penaltyEndDate.getDate() + PENALTY_DURATION_DAYS);
    
    // Update provider with penalty
    await updateDoc(providerRef, {
      reliabilityScore: newScore,
      cancellationCount: increment(1),
      recentCancellations: increment(1),
      lastPenaltyDate: new Date().toISOString(),
      penaltyEndDate: penaltyEndDate.toISOString(),
      bookingEnabled: false
    });
    
    return {
      reliabilityScore: newScore,
      cancellationCount: reliabilityData.cancellationCount + 1,
      recentCancellations: reliabilityData.recentCancellations + 1,
      lastPenaltyDate: new Date().toISOString(),
      penaltyEndDate: penaltyEndDate.toISOString(),
      bookingEnabled: false
    };
  } catch (error) {
    console.error('Error applying third strike penalty:', error);
    throw error;
  }
};

/**
 * Apply penalty for second cancellation attempt
 * @param {string} providerId - The provider's ID
 * @returns {Promise<Object>} - Updated reliability data
 */
export const applySecondCancellationPenalty = async (providerId) => {
  try {
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    
    // Get current reliability data
    const reliabilityData = await getReliabilityData(providerId);
    
    // Calculate new reliability score
    const newScore = Math.max(
      reliabilityData.reliabilityScore - SECOND_CANCELLATION_PENALTY,
      MIN_RELIABILITY_SCORE
    );
    
    // Update provider with penalty
    await updateDoc(providerRef, {
      reliabilityScore: newScore
    });
    
    return {
      ...reliabilityData,
      reliabilityScore: newScore
    };
  } catch (error) {
    console.error('Error applying second cancellation penalty:', error);
    throw error;
  }
};

/**
 * Increase reliability score after successful booking
 * @param {string} providerId - The provider's ID
 * @returns {Promise<Object>} - Updated reliability data
 */
export const increaseReliabilityScore = async (providerId) => {
  try {
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    
    // Get current reliability data
    const reliabilityData = await getReliabilityData(providerId);
    
    // Only increase if below maximum
    if (reliabilityData.reliabilityScore < MAX_RELIABILITY_SCORE) {
      // Calculate new reliability score
      const newScore = Math.min(
        reliabilityData.reliabilityScore + SUCCESSFUL_BOOKING_BONUS,
        MAX_RELIABILITY_SCORE
      );
      
      // Update provider with new score
      await updateDoc(providerRef, {
        reliabilityScore: newScore
      });
      
      return {
        ...reliabilityData,
        reliabilityScore: newScore
      };
    }
    
    return reliabilityData;
  } catch (error) {
    console.error('Error increasing reliability score:', error);
    throw error;
  }
};

/**
 * Check if a provider is currently in a penalty period
 * @param {string} providerId - The provider's ID
 * @returns {Promise<boolean>} - True if provider is in penalty period
 */
export const isProviderInPenaltyPeriod = async (providerId) => {
  try {
    const reliabilityData = await getReliabilityData(providerId);
    
    // If booking is explicitly disabled
    if (reliabilityData.bookingEnabled === false) {
      // Check if penalty period has ended
      if (reliabilityData.penaltyEndDate) {
        const penaltyEndDate = new Date(reliabilityData.penaltyEndDate);
        const now = new Date();
        
        // If penalty period has ended, update provider status
        if (now > penaltyEndDate) {
          const db = getFirestore();
          const providerRef = doc(db, 'serviceProviders', providerId);
          
          await updateDoc(providerRef, {
            bookingEnabled: true
          });
          
          return false;
        }
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking penalty period:', error);
    throw error;
  }
};
