import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import './LoginPage.css';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loginRole, setLoginRole] = useState('user'); // 'user' or 'provider'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Clear all states when component unmounts
  useEffect(() => {
    return () => {
      setFormData({
        email: '',
        password: ''
      });
      setLoginRole('user');
      setError('');
      setLoading(false);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const auth = getAuth();

    try {
      // Attempt to sign in with Firebase Auth using email and password
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Login</h1>
        <div className="role-toggle">
          <button
            className={`role-button ${loginRole === 'user' ? 'active' : ''}`}
            onClick={() => setLoginRole('user')}
            type="button"
          >
            Login as User
          </button>
          <button
            className={`role-button ${loginRole === 'provider' ? 'active' : ''}`}
            onClick={() => setLoginRole('provider')}
            type="button"
          >
            Login as Provider
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
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
            />
            <div className="forgot-password">
              <Link to="/reset-password">Forgot Password?</Link>
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : `Login as ${loginRole === 'user' ? 'User' : 'Service Provider'}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;


