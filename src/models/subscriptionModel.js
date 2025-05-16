/**
 * Subscription Model
 * 
 * This file defines the structure and helper functions for user subscriptions
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Subscription status constants
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

/**
 * Create a new subscription for a user
 * @param {string} userId - The user's ID
 * @param {Object} subscriptionData - The subscription data
 * @returns {Promise<Object>} - The created subscription
 */
export const createSubscription = async (userId, subscriptionData) => {
  try {
    const db = getFirestore();
    const subscriptionRef = doc(db, 'subscriptions', userId);
    
    const subscription = {
      userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      startDate: new Date().toISOString(),
      endDate: calculateEndDate(new Date()),
      paymentAmount: 35, // R35 monthly fee
      paymentMethod: subscriptionData.paymentMethod,
      paymentId: subscriptionData.paymentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoRenew: true
    };
    
    await setDoc(subscriptionRef, subscription);
    return { id: userId, ...subscription };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

/**
 * Get a user's subscription
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - The subscription or null if not found
 */
export const getSubscription = async (userId) => {
  try {
    const db = getFirestore();
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const subscriptionDoc = await getDoc(subscriptionRef);
    
    if (subscriptionDoc.exists()) {
      return { id: subscriptionDoc.id, ...subscriptionDoc.data() };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
};

/**
 * Check if a user has an active subscription
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - True if the user has an active subscription
 */
export const hasActiveSubscription = async (userId) => {
  try {
    const subscription = await getSubscription(userId);
    
    if (!subscription) {
      return false;
    }
    
    // Check if subscription is active and not expired
    return (
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
      new Date(subscription.endDate) > new Date()
    );
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Cancel a user's subscription
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The updated subscription
 */
export const cancelSubscription = async (userId) => {
  try {
    const db = getFirestore();
    const subscriptionRef = doc(db, 'subscriptions', userId);
    
    await updateDoc(subscriptionRef, {
      status: SUBSCRIPTION_STATUS.CANCELLED,
      autoRenew: false,
      updatedAt: new Date().toISOString()
    });
    
    const updatedSubscription = await getSubscription(userId);
    return updatedSubscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

/**
 * Renew a user's subscription
 * @param {string} userId - The user's ID
 * @param {Object} paymentData - The payment data for renewal
 * @returns {Promise<Object>} - The updated subscription
 */
export const renewSubscription = async (userId, paymentData) => {
  try {
    const db = getFirestore();
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const subscription = await getSubscription(userId);
    
    // Calculate new end date based on current end date or current date if expired
    const baseDate = new Date(subscription.endDate) > new Date() 
      ? new Date(subscription.endDate) 
      : new Date();
    
    const newEndDate = calculateEndDate(baseDate);
    
    await updateDoc(subscriptionRef, {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: newEndDate.toISOString(),
      paymentAmount: 35, // R35 monthly fee
      paymentMethod: paymentData.paymentMethod,
      paymentId: paymentData.paymentId,
      updatedAt: new Date().toISOString(),
      autoRenew: true
    });
    
    const updatedSubscription = await getSubscription(userId);
    return updatedSubscription;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
};

/**
 * Calculate the end date for a subscription (1 month from start date)
 * @param {Date} startDate - The start date
 * @returns {Date} - The end date
 */
const calculateEndDate = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return endDate;
};
