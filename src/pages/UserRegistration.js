import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
import LocationAutocomplete from '../components/LocationAutocomplete';
import './Registration.css';

function UserRegistration() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    location: '',
    phoneNumber: '',
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
    securityQuestion3: '',
    securityAnswer3: '',
    termsAccepted: false
  });

  // Security questions options
  const securityQuestions = [
    "What is your favorite color?",
    "In which city were you born?",
    "What was the name of your first pet?",
    "What was your childhood nickname?",
    "What is your mother's maiden name?",
    "What was the make of your first car?",
    "What is the name of the street you grew up on?",
    "What was the name of your first school?",
    "What is your favorite movie?",
    "What is your favorite book?"
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Clear all states when component unmounts
  useEffect(() => {
    return () => {
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        location: '',
        phoneNumber: '',
        securityQuestion1: '',
        securityAnswer1: '',
        securityQuestion2: '',
        securityAnswer2: '',
        securityQuestion3: '',
        securityAnswer3: '',
        termsAccepted: false
      });
      setError('');
      setLoading(false);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if terms are accepted
    if (!formData.termsAccepted) {
        setError('You must accept the Terms and Conditions to register.');
        setLoading(false);
        return;
    }

    // Validate that all security questions are unique
    const securityQuestions = [formData.securityQuestion1, formData.securityQuestion2, formData.securityQuestion3];
    const uniqueQuestions = new Set(securityQuestions);

    if (uniqueQuestions.size !== 3 || securityQuestions.includes('')) {
      setError('Please select three different security questions.');
      setLoading(false);
      return;
    }

    try {
        const auth = getAuth();
        const db = getFirestore();

        // Check if email exists in users collection
        const usersSnapshot = await getDocs(
            query(collection(db, 'users'), where('email', '==', formData.email))
        );

        if (!usersSnapshot.empty) {
            throw new Error('This email is already registered. Please use another one.');
        }

        // Create new user account with email and password
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
        );

        // Update the user profile with the username as displayName
        await updateProfile(userCredential.user, {
            displayName: formData.username
        });

        // Store user data in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            username: formData.username,
            location: formData.location,
            phoneNumber: formData.phoneNumber,
            createdAt: new Date().toISOString(),
            userId: userCredential.user.uid,
            isServiceProvider: false,
            // Store security questions and answers
            securityQuestions: {
                question1: formData.securityQuestion1,
                answer1: formData.securityAnswer1.toLowerCase().trim(),
                question2: formData.securityQuestion2,
                answer2: formData.securityAnswer2.toLowerCase().trim(),
                question3: formData.securityQuestion3,
                answer3: formData.securityAnswer3.toLowerCase().trim()
            }
        });

        navigate('/');
    } catch (error) {
        console.error('Registration error:', error);
        setError(error.message || 'Failed to register. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // For security questions, ensure no duplicates are selected
    if (name.startsWith('securityQuestion') && value) {
      const updatedFormData = {
        ...formData,
        [name]: value
      };

      // Check if this question is already selected in another dropdown
      const questionFields = ['securityQuestion1', 'securityQuestion2', 'securityQuestion3'];
      const otherQuestionFields = questionFields.filter(field => field !== name);

      // If the selected question is already used in another field, show an error
      if (otherQuestionFields.some(field => updatedFormData[field] === value)) {
        setError('Each security question must be unique. Please select a different question.');
        return;
      }

      // Clear the error if it was related to duplicate questions
      if (error === 'Each security question must be unique. Please select a different question.') {
        setError('');
      }

      setFormData(updatedFormData);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };



  return (
    <div className="registration-page">
      <div className="registration-container">
        <h1>Register as a User</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Enter your first name"
              />
            </div>
            <div className="form-group half">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
              pattern="[a-zA-Z0-9_]{3,20}"
              title="Username must be 3-20 characters and can only contain letters, numbers, and underscores"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <LocationAutocomplete
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              placeholder="Enter your location"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
          </div>

          <div className="security-questions-section">
            <h3>Security Questions</h3>
            <p className="security-note">Please set up security questions to help recover your account if you forget your password.</p>

            <div className="form-group">
              <label htmlFor="securityQuestion1">Security Question 1</label>
              <select
                id="securityQuestion1"
                name="securityQuestion1"
                value={formData.securityQuestion1}
                onChange={handleChange}
                required
                className={formData.securityQuestion1 && (formData.securityQuestion1 === formData.securityQuestion2 || formData.securityQuestion1 === formData.securityQuestion3) ? 'duplicate-question' : ''}
              >
                <option value="">Select a question</option>
                {securityQuestions.map((question, index) => (
                  <option
                    key={`q1-${index}`}
                    value={question}
                    disabled={question === formData.securityQuestion2 || question === formData.securityQuestion3}
                  >
                    {question}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="securityAnswer1">Answer</label>
              <input
                type="text"
                id="securityAnswer1"
                name="securityAnswer1"
                value={formData.securityAnswer1}
                onChange={handleChange}
                required
                placeholder="Your answer"
              />
            </div>

            <div className="form-group">
              <label htmlFor="securityQuestion2">Security Question 2</label>
              <select
                id="securityQuestion2"
                name="securityQuestion2"
                value={formData.securityQuestion2}
                onChange={handleChange}
                required
                className={formData.securityQuestion2 && (formData.securityQuestion2 === formData.securityQuestion1 || formData.securityQuestion2 === formData.securityQuestion3) ? 'duplicate-question' : ''}
              >
                <option value="">Select a question</option>
                {securityQuestions.map((question, index) => (
                  <option
                    key={`q2-${index}`}
                    value={question}
                    disabled={question === formData.securityQuestion1 || question === formData.securityQuestion3}
                  >
                    {question}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="securityAnswer2">Answer</label>
              <input
                type="text"
                id="securityAnswer2"
                name="securityAnswer2"
                value={formData.securityAnswer2}
                onChange={handleChange}
                required
                placeholder="Your answer"
              />
            </div>

            <div className="form-group">
              <label htmlFor="securityQuestion3">Security Question 3</label>
              <select
                id="securityQuestion3"
                name="securityQuestion3"
                value={formData.securityQuestion3}
                onChange={handleChange}
                required
                className={formData.securityQuestion3 && (formData.securityQuestion3 === formData.securityQuestion1 || formData.securityQuestion3 === formData.securityQuestion2) ? 'duplicate-question' : ''}
              >
                <option value="">Select a question</option>
                {securityQuestions.map((question, index) => (
                  <option
                    key={`q3-${index}`}
                    value={question}
                    disabled={question === formData.securityQuestion1 || question === formData.securityQuestion2}
                  >
                    {question}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="securityAnswer3">Answer</label>
              <input
                type="text"
                id="securityAnswer3"
                name="securityAnswer3"
                value={formData.securityAnswer3}
                onChange={handleChange}
                required
                placeholder="Your answer"
              />
            </div>
          </div>

          <div className="form-group terms-checkbox">
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="termsAccepted"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                required
              />
              <label htmlFor="termsAccepted" className="checkbox-label">
                I agree to the <Link to="/terms" target="_blank" className="terms-link">Terms and Conditions</Link>
              </label>
            </div>
            <p className="terms-disclaimer">
              By registering, you acknowledge that Profundi verifies service providers' identities but is primarily a connection platform.
              Service quality and payment arrangements are handled directly between you and the service provider.
            </p>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserRegistration;
