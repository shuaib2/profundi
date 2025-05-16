import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Register</h1>
        <div className="role-toggle">
          <button
            className="role-button"
            onClick={() => navigate('/register/user')}
            type="button"
          >
            Register as User
          </button>
          <button
            className="role-button"
            onClick={() => navigate('/register/provider')}
            type="button"
          >
            Register as Provider
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

