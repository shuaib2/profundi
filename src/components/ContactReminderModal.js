import React, { useState, useEffect } from 'react';
import { FaPhone, FaUser, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './ContactReminderModal.css';

function ContactReminderModal({ onClose, onContinue }) {
  const [userData, setUserData] = useState({
    fullName: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formChanged, setFormChanged] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error('You must be logged in to book a service');
        }

        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            fullName: data.fullName || '',
            phoneNumber: data.phoneNumber || ''
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormChanged(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone number
    if (!userData.phoneNumber) {
      setError('Phone number is required to proceed with booking');
      return;
    }
    
    // If no changes were made, just continue
    if (!formChanged) {
      onContinue();
      return;
    }
    
    try {
      setSaving(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to update your profile');
      }
      
      const db = getFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        updatedAt: new Date().toISOString()
      });
      
      onContinue();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="contact-reminder-modal">
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="modal-header">
          <FaExclamationTriangle className="warning-icon" />
          <h2>Verify Your Contact Information</h2>
        </div>
        
        <div className="modal-content">
          <p className="reminder-message">
            Please ensure your contact information is up to date. 
            The service provider will use this information to contact you after booking is confirmed.
          </p>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">
                <FaUser className="input-icon" /> Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={userData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phoneNumber">
                <FaPhone className="input-icon" /> Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={userData.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                required
              />
              <p className="field-hint">
                This number will be shared with the service provider
              </p>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="continue-button"
                disabled={saving || loading || !userData.phoneNumber}
              >
                {saving ? 'Saving...' : 'Continue to Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactReminderModal;
