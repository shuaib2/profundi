import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Suspend a user or provider account
 * @param {string} userId - The user's ID
 * @param {string} reason - The reason for suspension
 * @param {string} collectionName - The collection name ('users' or 'serviceProviders')
 * @param {Date|null} endDate - Optional end date for temporary suspension (null for indefinite)
 * @returns {Promise<Object>} - Updated user data
 */
export const suspendAccount = async (userId, reason, collectionName, endDate = null) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, collectionName, userId);
    
    // Get current user data
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found in ${collectionName} collection`);
    }
    
    const suspensionData = {
      suspended: true,
      suspensionReason: reason,
      suspendedAt: new Date().toISOString(),
      suspensionEndDate: endDate ? endDate.toISOString() : null
    };
    
    // Update user with suspension data
    await updateDoc(userRef, suspensionData);
    
    return {
      ...userDoc.data(),
      ...suspensionData
    };
  } catch (error) {
    console.error('Error suspending account:', error);
    throw error;
  }
};

/**
 * Reinstate a suspended user or provider account
 * @param {string} userId - The user's ID
 * @param {string} collectionName - The collection name ('users' or 'serviceProviders')
 * @returns {Promise<Object>} - Updated user data
 */
export const reinstateAccount = async (userId, collectionName) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, collectionName, userId);
    
    // Get current user data
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found in ${collectionName} collection`);
    }
    
    const reinstateData = {
      suspended: false,
      suspensionReason: null,
      suspendedAt: null,
      suspensionEndDate: null,
      reinstatedAt: new Date().toISOString()
    };
    
    // Update user with reinstatement data
    await updateDoc(userRef, reinstateData);
    
    return {
      ...userDoc.data(),
      ...reinstateData
    };
  } catch (error) {
    console.error('Error reinstating account:', error);
    throw error;
  }
};

/**
 * Check if a user or provider account is suspended
 * @param {Object} userData - The user data object
 * @returns {boolean} - Whether the account is suspended
 */
export const isAccountSuspended = (userData) => {
  if (!userData || !userData.suspended) {
    return false;
  }
  
  // If there's no end date, the suspension is indefinite
  if (!userData.suspensionEndDate) {
    return true;
  }
  
  // Check if the suspension has expired
  const endDate = new Date(userData.suspensionEndDate);
  const now = new Date();
  
  return now < endDate;
};
