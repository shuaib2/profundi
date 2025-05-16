import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { FaCheckCircle, FaCreditCard, FaMoneyBillWave, FaRegClock, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import { createSubscription, renewSubscription, getSubscription, hasActiveSubscription, cancelSubscription } from '../models/subscriptionModel';
import useUserRole from '../hooks/useUserRole';
import './SubscriptionPage.css';

function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationProcessing, setCancellationProcessing] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState(false);
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const auth = getAuth();

  // Subscription fee amount in Rand
  const SUBSCRIPTION_FEE = 35;

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          navigate('/login');
          return;
        }

        // Check if user is a provider
        if (userRole === 'provider') {
          navigate('/');
          return;
        }

        // Get the user's subscription
        const subscriptionData = await getSubscription(user.uid);
        setSubscription(subscriptionData);

        // Check if the user has an active subscription
        const active = await hasActiveSubscription(user.uid);
        setIsSubscribed(active);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [auth.currentUser, navigate, userRole]);

  const handleSubscribe = async () => {
    setPaymentProcessing(true);
    setError(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in to subscribe');
      }

      // In a real implementation, this would integrate with a payment gateway
      // For now, we'll simulate a successful payment

      // Wait for 2 seconds to simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create or renew subscription
      const paymentData = {
        paymentMethod: 'credit_card',
        paymentId: 'sim_' + Math.random().toString(36).substring(2, 15)
      };

      let subscriptionData;

      if (subscription) {
        // Renew existing subscription
        subscriptionData = await renewSubscription(user.uid, paymentData);
      } else {
        // Create new subscription
        subscriptionData = await createSubscription(user.uid, paymentData);
      }

      setSubscription(subscriptionData);
      setIsSubscribed(true);
      setPaymentSuccess(true);

      // Wait 2 seconds before redirecting
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError('Subscription failed: ' + err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancellationProcessing(true);
    setError(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in to cancel your subscription');
      }

      // Wait for 1 second to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Cancel the subscription
      await cancelSubscription(user.uid);

      // Update state
      setCancellationSuccess(true);
      setShowCancelDialog(false);

      // Refresh subscription data
      const updatedSubscription = await getSubscription(user.uid);
      setSubscription(updatedSubscription);

      // Wait 2 seconds before redirecting
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError('Cancellation failed: ' + err.message);
      setShowCancelDialog(false);
    } finally {
      setCancellationProcessing(false);
    }
  };

  if (loading) {
    return <div className="subscription-page loading">Loading subscription details...</div>;
  }

  if (error) {
    return <div className="subscription-page error">{error}</div>;
  }

  if (paymentSuccess) {
    return (
      <div className="subscription-page success">
        <div className="success-container">
          <FaCheckCircle className="success-icon" />
          <h2>Subscription Successful!</h2>
          <p>Your subscription is now active.</p>
          <p>You can now book service providers.</p>
          <p>Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  if (cancellationSuccess) {
    return (
      <div className="subscription-page success cancellation">
        <div className="success-container">
          <FaTimesCircle className="success-icon cancellation" />
          <h2>Subscription Cancelled</h2>
          <p>Your subscription has been cancelled.</p>
          <p>You can still use your subscription until the end date.</p>
          <p>Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      {showCancelDialog && (
        <div className="cancel-dialog-overlay" onClick={(e) => {
          // Close dialog when clicking outside (but not when clicking inside)
          if (e.target.className === 'cancel-dialog-overlay') {
            setShowCancelDialog(false);
          }
        }}>
          <div className="cancel-dialog">
            <FaExclamationTriangle className="warning-icon" />
            <h2>Cancel Subscription?</h2>
            <p>Are you sure you want to cancel your subscription?</p>
            <p>You will still have access until <strong>{new Date(subscription.endDate).toLocaleDateString()}</strong>.</p>
            <p>After that, you won't be able to book service providers until you subscribe again.</p>

            <div className="dialog-actions">
              <button
                className="confirm-cancel-button"
                onClick={handleCancelSubscription}
                disabled={cancellationProcessing}
              >
                {cancellationProcessing ? 'Processing...' : 'Yes, Cancel'}
              </button>
              <button
                className="keep-button"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancellationProcessing}
              >
                No, Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-container">
        <h1>{isSubscribed ? 'Manage Your Subscription' : 'Subscribe to Profundi'}</h1>

        <div className="subscription-info">
          {isSubscribed ? (
            <div className="active-subscription">
              <div className="subscription-status">
                <FaCheckCircle className="status-icon active" />
                <h2>Active Subscription</h2>
              </div>

              <div className="subscription-details">
                <p><strong>Start Date:</strong> {new Date(subscription.startDate).toLocaleDateString()}</p>
                <p><strong>End Date:</strong> {new Date(subscription.endDate).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {subscription.status}</p>
                <p><strong>Auto-renew:</strong> {subscription.autoRenew ? 'Yes' : 'No'}</p>
              </div>

              <div className="subscription-benefits">
                <h3>Your Benefits</h3>
                <ul>
                  <li>Book any service provider</li>
                  <li>Access to all platform features</li>
                  <li>No booking fees</li>
                </ul>
              </div>

              <div className="subscription-actions">
                <button
                  className="renew-button"
                  onClick={handleSubscribe}
                  disabled={paymentProcessing}
                >
                  {paymentProcessing ? 'Processing...' : 'Renew Subscription'}
                </button>
                <button
                  className="back-button"
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </button>
                <button
                  className="cancel-subscription-button"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={paymentProcessing}
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          ) : (
            <div className="subscription-offer">
              <div className="subscription-plan">
                <h2>Monthly Subscription</h2>
                <div className="subscription-price">
                  <span className="price">R{SUBSCRIPTION_FEE}</span>
                  <span className="period">/ month</span>
                </div>

                <div className="subscription-features">
                  <h3>What You Get</h3>
                  <ul>
                    <li><FaCheckCircle /> Book any service provider</li>
                    <li><FaCheckCircle /> Access to all platform features</li>
                    <li><FaCheckCircle /> No booking fees</li>
                    <li><FaCheckCircle /> Cancel anytime</li>
                  </ul>
                </div>
              </div>

              <div className="payment-details">
                <h2>Payment Details</h2>
                <div className="payment-methods">
                  <h3>Select Payment Method</h3>
                  <div className="payment-method-options">
                    <div className="payment-method active">
                      <FaCreditCard className="payment-icon" />
                      <span>Credit/Debit Card</span>
                    </div>
                    <div className="payment-method disabled">
                      <FaMoneyBillWave className="payment-icon" />
                      <span>EFT (Coming Soon)</span>
                    </div>
                  </div>

                  {/* In a real implementation, this would be replaced with a proper payment form */}
                  <div className="card-details">
                    <div className="form-group">
                      <label htmlFor="cardNumber">Card Number</label>
                      <input
                        type="text"
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        value="4242 4242 4242 4242"
                        readOnly
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="expiryDate">Expiry Date</label>
                        <input
                          type="text"
                          id="expiryDate"
                          placeholder="MM/YY"
                          maxLength="5"
                          value="12/25"
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="cvv">CVV</label>
                        <input
                          type="text"
                          id="cvv"
                          placeholder="123"
                          maxLength="3"
                          value="123"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="cardName">Name on Card</label>
                      <input
                        type="text"
                        id="cardName"
                        placeholder="John Doe"
                        value="Test User"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="subscription-actions">
                  <button
                    className="subscribe-button"
                    onClick={handleSubscribe}
                    disabled={paymentProcessing}
                  >
                    {paymentProcessing ? 'Processing...' : `Subscribe for R${SUBSCRIPTION_FEE}/month`}
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => navigate('/')}
                    disabled={paymentProcessing}
                  >
                    Cancel
                  </button>
                </div>

                <div className="subscription-note">
                  <FaRegClock className="note-icon" />
                  <p>
                    Your subscription will begin immediately and renew automatically each month.
                    You can cancel anytime from your account settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;
