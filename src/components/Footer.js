import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Profundi</h3>
          <p>Connecting users with verified service providers.</p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Legal</h3>
          <ul className="footer-links">
            <li><Link to="/terms" className="terms-link">Terms and Conditions</Link></li>
            <li><Link to="/terms#privacy">Privacy Policy</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contact</h3>
          <p>Email: support@projectconnect.com</p>
          <p>Phone: +27 123 456 789</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Profundi. All rights reserved.</p>
        <p className="disclaimer">
          Profundi verifies service providers' identities but is primarily a connection platform.
          Service quality and arrangements are the responsibility of users and providers.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
