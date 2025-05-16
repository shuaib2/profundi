import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { notifyProvider, notifyUser } from '../utils/notificationUtils';
import {
  updateCancellationAttempts,
  applySecondCancellationPenalty,
  applyThirdStrikePenalty
} from './reliabilityModel';

/**
 * Cancel a booking by a user
 * @param {string} bookingId - The booking ID
 * @param {string} userId - The user's ID
 * @param {string} reason - Optional reason for cancellation
 * @returns {Promise<Object>} - The updated booking
 */
/**
 * Request cancellation of a booking by a provider
 * @param {string} bookingId - The booking ID
 * @param {string} providerId - The provider's ID
 * @param {string} reason - Optional reason for cancellation
 * @returns {Promise<Object>} - The updated booking with cancellation status
 */
export const requestCancellation = async (bookingId, providerId, reason = '') => {
  try {
    const db = getFirestore();
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();

    // Verify that the booking belongs to the provider
    if (bookingData.providerId !== providerId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    // Update cancellation attempts and get updated booking data
    const updatedBooking = await updateCancellationAttempts(bookingId, providerId);
    const cancellationAttempts = updatedBooking.cancellationAttempts || 1;

    // Check if this is the third cancellation attempt
    if (cancellationAttempts >= 3) {
      // Apply third strike penalty
      await applyThirdStrikePenalty(providerId);

      // Auto-cancel the booking
      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledBy: 'provider',
        cancellationRequested: false,
        cancellationAutoApproved: true,
        thirdStrikeCancellation: true,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Notify the user
      try {
        const bookingData = bookingDoc.data();
        await notifyUser(
          bookingData.userId,
          `${bookingData.providerName} has cancelled your booking for ${bookingData.date} at ${bookingData.time}. Reason: ${reason || 'Provider requested cancellation'}`,
          'booking_cancelled_by_provider',
          {
            bookingId: bookingId,
            date: bookingData.date,
            time: bookingData.time,
            reason: reason || 'Provider requested cancellation',
            autoApproved: true
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification to user:', notifyError);
        // Continue even if notification fails
      }

      // Get the updated booking
      const updatedBookingDoc = await getDoc(bookingRef);
      return {
        id: updatedBookingDoc.id,
        ...updatedBookingDoc.data(),
        thirdStrike: true
      };
    }
    // Check if this is the second cancellation attempt
    else if (cancellationAttempts === 2) {
      // Apply second cancellation penalty
      await applySecondCancellationPenalty(providerId);

      // Update booking with cancellation request
      await updateDoc(bookingRef, {
        cancellationRequested: true,
        cancellationReason: reason,
        cancellationRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Notify the user
      try {
        const bookingData = bookingDoc.data();
        await notifyUser(
          bookingData.userId,
          `${bookingData.providerName} has requested to cancel your booking for ${bookingData.date} at ${bookingData.time}. Reason: ${reason || 'No reason provided'}`,
          'booking_cancellation_requested',
          {
            bookingId: bookingId,
            date: bookingData.date,
            time: bookingData.time,
            reason: reason || 'No reason provided',
            secondAttempt: true
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification to user:', notifyError);
        // Continue even if notification fails
      }

      // Get the updated booking
      const updatedBookingDoc = await getDoc(bookingRef);
      return {
        id: updatedBookingDoc.id,
        ...updatedBookingDoc.data(),
        secondAttempt: true
      };
    }
    // First cancellation attempt
    else {
      // Update booking with cancellation request
      await updateDoc(bookingRef, {
        cancellationRequested: true,
        cancellationReason: reason,
        cancellationRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Notify the user
      try {
        const bookingData = bookingDoc.data();
        await notifyUser(
          bookingData.userId,
          `${bookingData.providerName} has requested to cancel your booking for ${bookingData.date} at ${bookingData.time}. Reason: ${reason || 'No reason provided'}`,
          'booking_cancellation_requested',
          {
            bookingId: bookingId,
            date: bookingData.date,
            time: bookingData.time,
            reason: reason || 'No reason provided',
            firstAttempt: true
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification to user:', notifyError);
        // Continue even if notification fails
      }

      // Get the updated booking
      const updatedBookingDoc = await getDoc(bookingRef);
      return {
        id: updatedBookingDoc.id,
        ...updatedBookingDoc.data(),
        firstAttempt: true
      };
    }
  } catch (error) {
    console.error('Error requesting cancellation:', error);
    throw error;
  }
};

export const cancelBooking = async (bookingId, userId, reason = '') => {
  try {
    const db = getFirestore();
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();

    // Verify that the booking belongs to the user
    if (bookingData.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    // Update booking status
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledBy: 'user',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Send notification to the service provider
    try {
      await notifyProvider(
        bookingData.providerId,
        `A booking for ${bookingData.date} at ${bookingData.time} has been cancelled by the customer.${reason ? ` Reason: ${reason}` : ''}`,
        'booking_cancelled_by_user',
        {
          bookingId: bookingId,
          date: bookingData.date,
          time: bookingData.time,
          reason: reason
        }
      );
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
      // Continue with cancellation even if notification fails
    }

    // Get the updated booking
    const updatedBookingDoc = await getDoc(bookingRef);
    return { id: updatedBookingDoc.id, ...updatedBookingDoc.data() };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};
