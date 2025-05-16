import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';
import { getImageUrl } from '../utils/imageUtils';
import { professions } from '../utils/professionsList';
import LocationAutocomplete from './LocationAutocomplete';
import './ProfileEditor.css';

function ProfileEditor({ userId }) {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    location: '',
    profession: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isServiceProvider, setIsServiceProvider] = useState(false);

  // Clear all states when component unmounts
  useEffect(() => {
    return () => {
      setProfile({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        location: '',
        profession: ''
      });
      setLoading(false);
      setError(null);
      setSuccess(null);
    };
  }, []);

  // First, determine if the user is a service provider
  useEffect(() => {
    const checkUserRole = async () => {
      if (!userId) {
        setError('User ID not found');
        setLoading(false);
        return;
      }

      try {
        // First check if user exists in serviceProviders collection
        const db = getFirestore();
        const providersRef = collection(db, 'serviceProviders');
        const q = query(providersRef, where('__name__', '==', userId));
        const querySnapshot = await getDocs(q);

        const isProvider = !querySnapshot.empty;
        setIsServiceProvider(isProvider);

        // Store the role in localStorage for future reference
        localStorage.setItem('userRole', isProvider ? 'provider' : 'user');

        // Now fetch the profile from the appropriate collection
        const collectionName = isProvider ? 'serviceProviders' : 'users';
        const docRef = doc(db, collectionName, userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phoneNumber: data.phoneNumber || '',
            location: data.location || '',
            profession: data.profession || '',
            profileImagePath: data.profileImagePath || '' // Add profile image path
          });
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const db = getFirestore();
      const collectionName = isServiceProvider ? 'serviceProviders' : 'users';
      const docRef = doc(db, collectionName, userId);

      await updateDoc(docRef, profile);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading) return <div className="loading">Loading your profile...</div>;

  return (
    <div className="profile-editor">
      <h2>{isServiceProvider ? 'Edit Service Provider Profile' : 'Edit User Profile'}</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isServiceProvider && profile.profileImagePath && (
        <div className="profile-image-container">
          <img
            src={getImageUrl(profile.profileImagePath)}
            alt="Profile"
            className="profile-image"
            onError={(e) => {
              e.target.src = '/images/default-avatar.png';
            }}
          />
        </div>
      )}

      {isServiceProvider && (
        <div className="document-notice">
          <h3>ID Document and Profile Image Updates</h3>
          <p>
            To update your ID document or profile image, please contact our support team.
            This helps us maintain the security and integrity of our platform.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={profile.firstName || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={profile.lastName || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={profile.phoneNumber || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <LocationAutocomplete
            value={profile.location || ''}
            onChange={(value) => setProfile(prev => ({ ...prev, location: value }))}
            placeholder="Enter your location"
            required
          />
        </div>

        {isServiceProvider && (
          <div className="form-group">
            <label htmlFor="profession">Profession</label>
            <select
              id="profession"
              name="profession"
              value={profile.profession || ''}
              onChange={handleChange}
              required
              className="profession-select"
            >
              <option value="">Select your profession</option>
              {professions.map(profession => (
                <option key={profession} value={profession}>
                  {profession}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}

export default ProfileEditor;

