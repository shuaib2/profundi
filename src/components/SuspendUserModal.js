import React, { useState } from 'react';
import { FaBan, FaTimes } from 'react-icons/fa';
import './SuspendUserModal.css';

function SuspendUserModal({ user, onClose, onSuspend }) {
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('indefinite');
  const [customDuration, setCustomDuration] = useState(7);
  const [isSuspending, setIsSuspending] = useState(false);

  // Function to handle suspension duration change
  const handleDurationChange = (e) => {
    setSuspensionDuration(e.target.value);
  };

  // Function to handle custom duration change
  const handleCustomDurationChange = (e) => {
    setCustomDuration(parseInt(e.target.value) || 1);
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!suspensionReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }
    
    try {
      setIsSuspending(true);
      
      let endDate = null;
      if (suspensionDuration !== 'indefinite') {
        endDate = new Date();
        if (suspensionDuration === 'custom') {
          endDate.setDate(endDate.getDate() + customDuration);
        } else {
          // Parse the duration value
          const days = parseInt(suspensionDuration);
          endDate.setDate(endDate.getDate() + days);
        }
      }
      
      await onSuspend(suspensionReason, endDate);
    } catch (error) {
      console.error('Error in suspension form:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSuspending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="suspend-user-modal">
        <div className="modal-header">
          <h2><FaBan /> Suspend Account</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="user-info">
            <p><strong>User:</strong> {user.fullName || user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {user.profession && (
              <p><strong>Profession:</strong> {user.profession}</p>
            )}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="suspensionReason">Reason for suspension:</label>
              <textarea
                id="suspensionReason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter reason for suspension"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="suspensionDuration">Suspension duration:</label>
              <select
                id="suspensionDuration"
                value={suspensionDuration}
                onChange={handleDurationChange}
              >
                <option value="indefinite">Indefinite</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            {suspensionDuration === 'custom' && (
              <div className="form-group">
                <label htmlFor="customDuration">Custom duration (days):</label>
                <input
                  type="number"
                  id="customDuration"
                  min="1"
                  max="365"
                  value={customDuration}
                  onChange={handleCustomDurationChange}
                />
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={onClose}
                disabled={isSuspending}
              >
                <FaTimes /> Cancel
              </button>
              <button 
                type="submit" 
                className="suspend-button"
                disabled={isSuspending || !suspensionReason.trim()}
              >
                <FaBan /> {isSuspending ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SuspendUserModal;
