import { getFirestore, collection, addDoc } from 'firebase/firestore';

/**
 * Creates a notification in Firestore
 * @param {Object} notificationData - The notification data
 * @param {string} notificationData.userId - The ID of the user who should receive the notification
 * @param {string} notificationData.providerId - The ID of the provider who should receive the notification
 * @param {string} notificationData.type - The type of notification (e.g., 'booking_created', 'booking_confirmed')
 * @param {string} notificationData.message - The notification message
 * @param {string} [notificationData.bookingId] - Optional booking ID related to the notification
 * @returns {Promise<string>} - The ID of the created notification
 */
export const createNotification = async (notificationData) => {
  try {
    const db = getFirestore();

    // Validate required fields
    if (!notificationData.message) {
      throw new Error('Notification message is required');
    }

    if (!notificationData.userId && !notificationData.providerId) {
      throw new Error('Either userId or providerId is required');
    }

    // Create the notification
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      createdAt: new Date().toISOString(),
      read: false
    });

    return notificationRef.id;
  } catch (error) {
    // Log the error but don't throw it to prevent breaking the app flow
    console.error('Error creating notification:', error);

    // If it's a permission error, log a more helpful message
    if (error.code === 'permission-denied') {
      console.warn('Permission denied when creating notification. Please check Firestore security rules.');
      console.warn('You may need to deploy updated security rules that allow notification creation.');
    }

    // Return null instead of throwing to allow the app to continue
    return null;
  }
};

/**
 * Creates a notification for a user
 * @param {string} userId - The ID of the user who should receive the notification
 * @param {string} message - The notification message
 * @param {string} type - The type of notification
 * @param {Object} additionalData - Additional data to include in the notification
 * @returns {Promise<string>} - The ID of the created notification
 */
export const notifyUser = async (userId, message, type, additionalData = {}) => {
  return createNotification({
    userId,
    message,
    type,
    ...additionalData
  });
};

/**
 * Creates a notification for a provider
 * @param {string} providerId - The ID of the provider who should receive the notification
 * @param {string} message - The notification message
 * @param {string} type - The type of notification
 * @param {Object} additionalData - Additional data to include in the notification
 * @returns {Promise<string>} - The ID of the created notification
 */
export const notifyProvider = async (providerId, message, type, additionalData = {}) => {
  return createNotification({
    providerId,
    message,
    type,
    ...additionalData
  });
};

/**
 * Creates a booking notification for both user and provider
 * @param {Object} bookingData - The booking data
 * @param {string} userMessage - The message for the user
 * @param {string} providerMessage - The message for the provider
 * @param {string} type - The type of notification
 * @returns {Promise<Array>} - Array of notification IDs
 */
export const notifyBookingParticipants = async (bookingData, userMessage, providerMessage, type) => {
  const notifications = [];

  // Notify user
  if (bookingData.userId) {
    const userNotificationId = await notifyUser(
      bookingData.userId,
      userMessage,
      type,
      { bookingId: bookingData.id }
    );
    notifications.push(userNotificationId);
  }

  // Notify provider
  if (bookingData.providerId) {
    const providerNotificationId = await notifyProvider(
      bookingData.providerId,
      providerMessage,
      type,
      { bookingId: bookingData.id }
    );
    notifications.push(providerNotificationId);
  }

  return notifications;
};
