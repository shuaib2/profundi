// Reliability score constants
export const INITIAL_RELIABILITY_SCORE = 100;
export const SECOND_CANCELLATION_PENALTY = 5;
export const THIRD_CANCELLATION_PENALTY = 15;
export const SUCCESSFUL_BOOKING_BONUS = 1;
export const MAX_RELIABILITY_SCORE = 100;
export const MIN_RELIABILITY_SCORE = 0;
export const PENALTY_DURATION_DAYS = 7; // 1 week booking suspension

// Booking status constants
export const BOOKING_STATUS = {
  PENDING: 'pending',
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DECLINED: 'declined',
  PENDING_PAYMENT: 'pending_payment'
};
