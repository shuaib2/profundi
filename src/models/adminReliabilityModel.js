import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getReliabilityData } from './reliabilityModel';

/**
 * Update a provider's reliability score manually (admin function)
 * @param {string} providerId - The provider's ID
 * @param {number} newScore - The new reliability score
 * @returns {Promise<Object>} - Updated reliability data
 */
export const updateProviderReliabilityScore = async (providerId, newScore) => {
  try {
    // Validate the new score
    const validatedScore = Math.min(Math.max(parseInt(newScore), 0), 100);
    
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    
    // Get current reliability data
    const reliabilityData = await getReliabilityData(providerId);
    
    // Update provider with new score
    await updateDoc(providerRef, {
      reliabilityScore: validatedScore
    });
    
    return {
      ...reliabilityData,
      reliabilityScore: validatedScore
    };
  } catch (error) {
    console.error('Error updating reliability score:', error);
    throw error;
  }
};

/**
 * Reset booking restrictions for a provider (admin function)
 * @param {string} providerId - The provider's ID
 * @returns {Promise<Object>} - Updated provider data
 */
export const resetBookingRestrictions = async (providerId) => {
  try {
    const db = getFirestore();
    const providerRef = doc(db, 'serviceProviders', providerId);
    
    // Update provider to enable bookings and clear penalty data
    await updateDoc(providerRef, {
      bookingEnabled: true,
      penaltyEndDate: null,
      recentCancellations: 0
    });
    
    return {
      bookingEnabled: true,
      penaltyEndDate: null,
      recentCancellations: 0
    };
  } catch (error) {
    console.error('Error resetting booking restrictions:', error);
    throw error;
  }
};
