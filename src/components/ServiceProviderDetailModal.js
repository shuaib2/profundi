import React, { useState, useEffect } from 'react';
import { FaUser, FaMapMarkerAlt, FaPhone, FaIdCard, FaCalendarAlt, FaCheck, FaTimes, FaFileAlt, FaUpload, FaEdit, FaSave, FaShieldAlt, FaLock, FaLockOpen, FaBan, FaUnlock } from 'react-icons/fa';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getImageUrl } from '../utils/imageUtils';
import { updateProviderReliabilityScore, resetBookingRestrictions } from '../models/adminReliabilityModel';
import { suspendAccount, reinstateAccount } from '../models/suspensionModel';
import { professions } from '../utils/professionsList';
import LocationAutocomplete from './LocationAutocomplete';
import useAdminStatus from '../hooks/useAdminStatus';
import './ServiceProviderDetailModal.css';

function ServiceProviderDetailModal({ provider, onClose, onVerify, onReject, onUpdate }) {
  // Always declare hooks at the top level, regardless of conditions
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [idDocumentFile, setIdDocumentFile] = useState(null);
  const [previewProfileImage, setPreviewProfileImage] = useState(null);
  const [previewIdDocument, setPreviewIdDocument] = useState(null);

  // Add state for editable fields
  const [editableProvider, setEditableProvider] = useState({});
  const [reliabilityScore, setReliabilityScore] = useState(100);
  const [isResettingRestrictions, setIsResettingRestrictions] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('indefinite');
  const [customDuration, setCustomDuration] = useState(7);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);

  // Check if the current user is an admin
  const { isAdmin, loading: adminLoading, error: adminError } = useAdminStatus();

  // Initialize editable provider when provider changes or edit mode is enabled
  useEffect(() => {
    if (provider) {
      setEditableProvider({
        firstName: provider.firstName || '',
        lastName: provider.lastName || '',
        ...provider
      });
      setReliabilityScore(provider.reliabilityScore || 100);
    }
  }, [provider, editMode]);

  // Return null after hooks are declared
  if (!provider) return null;

  if (adminLoading) return <div>Loading...</div>;
  if (adminError) return <div>Error: {adminError}</div>;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Use the imported getImageUrl function from utils
  const getProviderImageUrl = (path) => {
    if (!path) return '/images/default-avatar.png';
    return getImageUrl(path);
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreviewProfileImage(previewUrl);
    }
  };

  const handleIdDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdDocumentFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreviewIdDocument(previewUrl);
    }
  };

  // Handle input changes for editable fields
  const handleInputChange = (field, value) => {
    setEditableProvider(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      setMessage('');
      const db = getFirestore();
      const updates = {};
      const userId = provider.id || provider.userId;

      // Compare editable fields with original provider data
      const fieldsToCheck = ['firstName', 'lastName', 'profession', 'location', 'phoneNumber', 'idNumber', 'username'];
      fieldsToCheck.forEach(field => {
        if (editableProvider[field] !== provider[field]) {
          updates[field] = editableProvider[field];
        }
      });

      // Handle file uploads to PHP backend
      if (profileImageFile || idDocumentFile) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('userId', userId);
        if (profileImageFile) formDataToUpload.append('profileImage', profileImageFile);
        if (idDocumentFile) formDataToUpload.append('idDocument', idDocumentFile);
        const uploadEndpoint = require('../utils/imageUtils').getUploadEndpoint();
        const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formDataToUpload
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) throw new Error('File upload failed');
        if (uploadResult.profileImagePath) {
          updates.profileImagePath = uploadResult.profileImagePath;
          setEditableProvider(prev => ({ ...prev, profileImagePath: uploadResult.profileImagePath }));
        }
        if (uploadResult.idDocumentPath) {
          updates.idDocumentPath = uploadResult.idDocumentPath;
          setEditableProvider(prev => ({ ...prev, idDocumentPath: uploadResult.idDocumentPath }));
        }
      }

      // Update Firestore if we have changes
      if (Object.keys(updates).length > 0) {
        const providerRef = doc(db, 'serviceProviders', userId);
        await updateDoc(providerRef, updates);
        setMessage('Provider information updated successfully');
        setMessageType('success');
        if (onUpdate) onUpdate(userId, updates);
        setEditMode(false);
      } else {
        setMessage('No changes to save');
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatus = () => {
    if (provider.documentsVerified) {
      return (
        <div className="verification-status verified">
          <FaCheck /> Verified on {formatDate(provider.verifiedAt)}
        </div>
      );
    } else if (provider.documentsRejected) {
      return (
        <div className="verification-status rejected">
          <FaTimes /> Rejected on {formatDate(provider.rejectedAt)}
        </div>
      );
    } else {
      return (
        <div className="verification-status pending">
          <FaIdCard /> Pending Verification
        </div>
      );
    }
  };

  // Function to handle reliability score updates
  const handleReliabilityScoreChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setReliabilityScore(value);
    }
  };

  // Function to update reliability score in Firestore
  const handleUpdateReliabilityScore = async () => {
    try {
      setLoading(true);
      setMessage('');

      await updateProviderReliabilityScore(provider.id, reliabilityScore);

      setMessage('Reliability score updated successfully');
      setMessageType('success');

      // Notify parent component about the update
      if (onUpdate) {
        onUpdate(provider.id, { reliabilityScore });
      }
    } catch (error) {
      console.error('Error updating reliability score:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Function to reset booking restrictions
  const handleResetRestrictions = async () => {
    try {
      setIsResettingRestrictions(true);
      setMessage('');

      await resetBookingRestrictions(provider.id);

      setMessage('Booking restrictions reset successfully');
      setMessageType('success');

      // Notify parent component about the update
      if (onUpdate) {
        onUpdate(provider.id, {
          bookingEnabled: true,
          penaltyEndDate: null,
          recentCancellations: 0
        });
      }
    } catch (error) {
      console.error('Error resetting booking restrictions:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsResettingRestrictions(false);
    }
  };

  // Function to toggle the suspension form
  const toggleSuspendForm = () => {
    setShowSuspendForm(prev => !prev);
    // Reset form when toggling
    setSuspensionReason('');
    setSuspensionDuration('indefinite');
    setCustomDuration(7);
  };

  // Function to handle suspension duration change
  const handleDurationChange = (e) => {
    setSuspensionDuration(e.target.value);
  };

  // Function to handle custom duration change
  const handleCustomDurationChange = (e) => {
    setCustomDuration(parseInt(e.target.value) || 1);
  };

  // Function to suspend provider account
  const handleSuspendAccount = async () => {
    if (!suspensionReason.trim()) {
      setMessage('Please provide a reason for suspension');
      setMessageType('error');
      return;
    }

    try {
      setIsSuspending(true);
      setMessage('');

      let endDate = null;
      if (suspensionDuration !== 'indefinite') {
        endDate = new Date();
        if (suspensionDuration === 'custom') {
          endDate.setDate(endDate.getDate() + customDuration);
        } else {
          // Parse the duration value (e.g., "7" from "7days")
          const days = parseInt(suspensionDuration);
          endDate.setDate(endDate.getDate() + days);
        }
      }

      await suspendAccount(
        provider.id,
        suspensionReason,
        suspensionDuration === 'custom' ? customDuration : suspensionDuration
      );

      setMessage(`Account suspended ${endDate ? 'until ' + endDate.toLocaleDateString() : 'indefinitely'}`);
      setMessageType('success');

      // Notify parent component about the update
      if (onUpdate) {
        onUpdate(provider.id, {
          suspended: true,
          suspensionReason,
          suspendedAt: new Date().toISOString(),
          suspensionEndDate: endDate ? endDate.toISOString() : null
        });
      }

      // Close the form
      setShowSuspendForm(false);
    } catch (error) {
      console.error('Error suspending account:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsSuspending(false);
    }
  };

  // Function to reinstate provider account
  const handleReinstateAccount = async () => {
    try {
      setIsReinstating(true);
      setMessage('');

      await reinstateAccount(provider.id, 'serviceProviders');

      setMessage('Account reinstated successfully');
      setMessageType('success');

      // Notify parent component about the update
      if (onUpdate) {
        onUpdate(provider.id, {
          suspended: false,
          suspensionReason: null,
          suspendedAt: null,
          suspensionEndDate: null,
          reinstatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error reinstating account:', error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsReinstating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Service Provider Details</h2>
          <div className="modal-actions">
            {!editMode && (
              <button
                className="edit-button"
                onClick={() => setEditMode(true)}
                title="Edit provider details"
              >
                <FaEdit /> Edit
              </button>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <div className="provider-profile-header">
            <div className="provider-image-container">
              {editMode ? (
                <div className="image-upload-container">
                  <img
                    src={previewProfileImage || getImageUrl(editableProvider.profileImagePath)}
                    alt={editableProvider.firstName}
                    className="provider-image"
                    onError={(e) => {
                      e.target.src = '/images/default-avatar.png';
                    }}
                  />
                  <label className="upload-button">
                    <FaUpload /> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              ) : (
                <>
                  {provider.profileImagePath && (
                    <div className="profile-image-container">
                      <img
                        src={getImageUrl(provider.profileImagePath)}
                        alt="Profile"
                        className="profile-image"
                        onError={(e) => {
                          e.target.src = '/images/default-avatar.png';
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="provider-basic-info">
              {editMode ? (
                <>
                  <input
                    type="text"
                    className="edit-input edit-name"
                    value={editableProvider.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                  <input
                    type="text"
                    className="edit-input edit-name"
                    value={editableProvider.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                  <select
                    className="edit-input edit-profession profession-select"
                    value={editableProvider.profession || ''}
                    onChange={(e) => handleInputChange('profession', e.target.value)}
                  >
                    <option value="">Select profession</option>
                    {professions.map(profession => (
                      <option key={profession} value={profession}>
                        {profession}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <h3>{provider.firstName} {provider.lastName}</h3>
                  <p className="provider-profession">{provider.profession}</p>
                </>
              )}
              {getVerificationStatus()}
            </div>
          </div>

          <div className="provider-details-section">
            <h4>Contact Information</h4>
            <div className="detail-item">
              <FaPhone className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Phone Number</p>
                {editMode ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editableProvider.phoneNumber || ''}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="detail-value">
                    {isAdmin ? (
                      provider.phoneNumber || 'Not provided'
                    ) : (
                      <span className="masked-info-modal">Provider will contact you after booking is confirmed</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="detail-item">
              <FaMapMarkerAlt className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Location</p>
                {editMode ? (
                  <LocationAutocomplete
                    value={editableProvider.location || ''}
                    onChange={(value) => handleInputChange('location', value)}
                    placeholder="Enter location"
                    required
                  />
                ) : (
                  <p className="detail-value" title={provider.location}>{provider.location}</p>
                )}
              </div>
            </div>

            <div className="detail-item">
              <FaUser className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Username</p>
                {editMode ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editableProvider.username || ''}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Enter username"
                  />
                ) : (
                  <p className="detail-value">{provider.username}</p>
                )}
              </div>
            </div>

            <div className="detail-item">
              <FaCalendarAlt className="detail-icon" />
              <div className="detail-content">
                <p className="detail-label">Registered On</p>
                <p className="detail-value">{formatDate(provider.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="provider-details-section">
            <h4>Identification Documents</h4>
            <div className="id-document-section">
              <div className="id-document-header">
                <FaIdCard className="document-icon" />
                <h5>ID Document</h5>
              </div>

              {editMode ? (
                <div className="document-upload-container">
                  {(previewIdDocument || provider.idDocumentPath) ? (
                    <div className="document-preview">
                      <p className="document-status">
                        <FaFileAlt className="document-icon" /> Document {previewIdDocument ? 'selected' : 'uploaded'}
                      </p>
                    </div>
                  ) : (
                    <p className="no-document">No ID document uploaded</p>
                  )}

                  <label className="upload-button document-upload">
                    <FaUpload /> {provider.idDocumentPath ? 'Replace ID Document' : 'Upload ID Document'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleIdDocumentChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              ) : (
                <>
                  {provider.idDocumentPath ? (
                    <div className="document-preview">
                      <a
                        href={getProviderImageUrl(provider.idDocumentPath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <FaFileAlt /> View ID Document
                      </a>
                      <p className="document-status">
                        <FaFileAlt className="document-icon" /> Document uploaded
                      </p>
                    </div>
                  ) : (
                    <p className="no-document">No ID document uploaded</p>
                  )}
                </>
              )}

              <div className="id-number-display">
                <p className="id-label">ID Number:</p>
                {editMode ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editableProvider.idNumber || ''}
                    onChange={(e) => handleInputChange('idNumber', e.target.value)}
                    placeholder="Enter ID number"
                  />
                ) : (
                  <p className="id-value">{provider.idNumber || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {editMode ? (
            <div className="edit-actions">
              <button
                className="action-button cancel"
                onClick={() => {
                  setEditMode(false);
                  setProfileImageFile(null);
                  setIdDocumentFile(null);
                  setPreviewProfileImage(null);
                  setPreviewIdDocument(null);
                  setMessage('');
                }}
                disabled={loading}
              >
                <FaTimes /> Cancel
              </button>
              <button
                className="action-button save"
                onClick={handleSaveChanges}
                disabled={loading}
              >
                <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <>
              {!provider.documentsVerified && !provider.documentsRejected && (
                <div className="verification-actions">
                  <button
                    className="action-button verify"
                    onClick={() => onVerify(provider.id)}
                  >
                    <FaCheck /> Verify Provider
                  </button>
                  <button
                    className="action-button reject"
                    onClick={() => onReject(provider.id)}
                  >
                    <FaTimes /> Reject
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="admin-actions">
                  <button
                    className="action-button edit"
                    onClick={() => setEditMode(true)}
                  >
                    <FaEdit /> Edit Provider
                  </button>

                  <div className="admin-section reliability-section">
                    <h4><FaShieldAlt /> Reliability Management</h4>

                    <div className="reliability-score-control">
                      <label htmlFor="reliabilityScore">Reliability Score:</label>
                      <div className="score-input-group">
                        <input
                          type="number"
                          id="reliabilityScore"
                          min="0"
                          max="100"
                          value={reliabilityScore}
                          onChange={handleReliabilityScoreChange}
                          className="reliability-input"
                        />
                        <span className="score-unit">%</span>
                        <button
                          className="action-button update-score"
                          onClick={handleUpdateReliabilityScore}
                          disabled={loading}
                        >
                          <FaSave /> Update Score
                        </button>
                      </div>
                    </div>

                    <div className="booking-restrictions">
                      <h5>Booking Status</h5>
                      <div className="restriction-status">
                        <div className={`status-indicator ${provider.bookingEnabled ? 'enabled' : 'disabled'}`}>
                          {provider.bookingEnabled ? (
                            <><FaLockOpen /> Bookings Enabled</>
                          ) : (
                            <><FaLock /> Bookings Disabled</>
                          )}
                        </div>

                        {!provider.bookingEnabled && provider.penaltyEndDate && (
                          <div className="penalty-info">
                            <p>Penalty ends: {formatDate(provider.penaltyEndDate)}</p>
                            <p>Recent cancellations: {provider.recentCancellations || 0}</p>
                          </div>
                        )}

                        {!provider.bookingEnabled && (
                          <button
                            className="action-button reset-restrictions"
                            onClick={handleResetRestrictions}
                            disabled={isResettingRestrictions}
                          >
                            <FaLockOpen /> {isResettingRestrictions ? 'Resetting...' : 'Reset Booking Restrictions'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="account-status-section">
                      <h5>Account Status</h5>
                      <div className="account-status">
                        <div className={`status-indicator ${provider.suspended ? 'suspended' : 'active'}`}>
                          {provider.suspended ? (
                            <><FaBan /> Account Suspended</>
                          ) : (
                            <><FaCheck /> Account Active</>
                          )}
                        </div>

                        {provider.suspended && (
                          <div className="suspension-info">
                            <p><strong>Reason:</strong> {provider.suspensionReason}</p>
                            {provider.suspensionEndDate && (
                              <p><strong>Suspended until:</strong> {formatDate(provider.suspensionEndDate)}</p>
                            )}
                            <p><strong>Suspended on:</strong> {formatDate(provider.suspendedAt)}</p>
                          </div>
                        )}

                        {provider.suspended ? (
                          <button
                            className="action-button reinstate"
                            onClick={handleReinstateAccount}
                            disabled={isReinstating}
                          >
                            <FaUnlock /> {isReinstating ? 'Reinstating...' : 'Reinstate Account'}
                          </button>
                        ) : (
                          <>
                            {showSuspendForm ? (
                              <div className="suspend-form">
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
                                    className="action-button cancel"
                                    onClick={toggleSuspendForm}
                                    disabled={isSuspending}
                                  >
                                    <FaTimes /> Cancel
                                  </button>
                                  <button
                                    className="action-button suspend"
                                    onClick={handleSuspendAccount}
                                    disabled={isSuspending || !suspensionReason.trim()}
                                  >
                                    <FaBan /> {isSuspending ? 'Suspending...' : 'Suspend Account'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className="action-button suspend"
                                onClick={toggleSuspendForm}
                              >
                                <FaBan /> Suspend Account
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServiceProviderDetailModal;
