import React from 'react';
import { Link } from 'react-router-dom';
import './TermsAndConditions.css';

function TermsAndConditions() {
  return (
    <div className="terms-page">
      <div className="terms-container">
        <h1>Terms and Conditions</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="terms-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Profundi. These Terms and Conditions govern your use of our platform,
            including our website, mobile applications, and services (collectively, the "Platform").
          </p>
          <p>
            By accessing or using our Platform, you agree to be bound by these Terms and Conditions.
            If you do not agree to these terms, please do not use our Platform.
          </p>
        </div>

        <div className="terms-section">
          <h2>2. Platform Overview</h2>
          <p>
            Profundi is a platform that connects users seeking services with verified service providers.
            We do not provide the services ourselves, but rather facilitate connections between users and
            independent service providers.
          </p>
          <p>
            <strong>How We Help:</strong> Profundi verifies the identity of service providers through ID verification
            and profile review to help ensure they are real individuals. However, Profundi is primarily a connection
            platform. Service providers are independent professionals who use our Platform to find clients.
          </p>
        </div>

        <div className="terms-section">
          <h2>3. Our Verification Process and Limitations</h2>
          <p>
            <strong>3.1 Verification Process:</strong> Profundi takes steps to verify service providers by:
          </p>
          <ul>
            <li>Reviewing ID documents submitted during registration</li>
            <li>Checking profile information for completeness</li>
            <li>Requiring profile photos to help users identify providers</li>
          </ul>
          <p>
            <strong>3.2 What We Don't Guarantee:</strong> While we make efforts to verify basic identity information, Profundi cannot guarantee:
          </p>
          <ul>
            <li>The quality or satisfaction level of services provided</li>
            <li>The professional qualifications or licensing status of service providers</li>
            <li>The accuracy of all information in provider profiles</li>
            <li>The timeliness or availability of service providers</li>
          </ul>
          <p>
            <strong>3.3 Responsibility Limits:</strong> As a connection platform, Profundi is not responsible for:
          </p>
          <ul>
            <li>Resolving disputes between users and service providers</li>
            <li>The outcome of services arranged through our platform</li>
            <li>Payment arrangements made between users and service providers</li>
            <li>Any issues that arise during service delivery</li>
          </ul>
          <p>
            <strong>3.4 Platform Provided "As Is":</strong> While we strive to provide a helpful service,
            the Platform is provided on an "as is" and "as available" basis.
          </p>
        </div>

        <div className="terms-section">
          <h2>4. Tips for a Great Experience</h2>
          <p>
            <strong>4.1 Making Good Choices:</strong> To have the best experience, we recommend:
          </p>
          <ul>
            <li>Reading provider profiles and reviews before booking</li>
            <li>Clearly discussing your needs and expectations with providers</li>
            <li>Agreeing on pricing and payment terms before services begin</li>
            <li>Taking normal safety precautions when meeting service providers</li>
          </ul>
          <p>
            <strong>4.2 Working Together:</strong> Please remember that:
          </p>
          <ul>
            <li>Service arrangements are made directly between you and the provider</li>
            <li>Profundi helps you connect but isn't involved in the service delivery</li>
            <li>Both users and providers are expected to honor their commitments to each other</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>5. Payments and Fees</h2>
          <p>
            <strong>5.1 Booking Fees:</strong> Profundi charges a small booking fee for connecting
            you with verified service providers. This helps us maintain the platform and verification processes.
          </p>
          <p>
            <strong>5.2 Service Payments:</strong> A few things to know about payments:
          </p>
          <ul>
            <li>You'll arrange payment for services directly with your service provider</li>
            <li>Profundi doesn't process payments between users and service providers</li>
            <li>We recommend discussing and agreeing on rates before services begin</li>
            <li>You're free to use whatever payment method works best for both parties</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>6. Community Guidelines</h2>
          <p>
            To keep Profundi a safe and helpful platform for everyone, please don't:
          </p>
          <ul>
            <li>Arrange bookings outside the platform to avoid booking fees</li>
            <li>Provide false or misleading information in your profile</li>
            <li>Use the platform for any illegal activities</li>
            <li>Harass or be disrespectful to other users or service providers</li>
            <li>Pretend to be someone else</li>
            <li>Try to hack or misuse the platform</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>7. If Problems Arise</h2>
          <p>
            <strong>7.1 Working Together:</strong> If you experience any issues with a service,
            we encourage you to first communicate directly with your service provider to find a solution.
          </p>
          <p>
            <strong>7.2 Our Support:</strong> While Profundi may try to help with communication between parties,
            we can't guarantee specific outcomes since we're not directly involved in service delivery.
          </p>
          <p>
            <strong>7.3 Formal Disputes:</strong> Any formal disputes between users and Profundi
            will be handled through arbitration rather than court proceedings.
          </p>
        </div>

        <div className="terms-section">
          <h2>8. Legal Protection</h2>
          <p>
            By using Profundi, you agree not to hold Profundi responsible for issues arising from:
          </p>
          <ul>
            <li>Your interactions with service providers</li>
            <li>The quality or outcome of services you receive</li>
            <li>Any agreements you make with service providers</li>
            <li>Any violations of these terms and conditions</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>9. Account Access</h2>
          <p>
            Profundi may need to suspend or terminate account access in certain situations,
            such as violation of our community guidelines or misuse of the platform.
          </p>
        </div>

        <div className="terms-section">
          <h2>10. Updates to Terms</h2>
          <p>
            Profundi may update these Terms and Conditions periodically to reflect changes in our services.
            We'll notify users of significant changes, and continued use of the platform means you accept the updated terms.
          </p>
        </div>

        <div className="terms-section">
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at support@profundi.app.
          </p>
        </div>

        <div className="terms-actions">
          <Link to="/" className="back-button">Return to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditions;
