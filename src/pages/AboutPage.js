import React from 'react';
import { Link } from 'react-router-dom';
import { FaHandshake, FaTools, FaUsers, FaMapMarkedAlt, FaLightbulb } from 'react-icons/fa';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="hero-content">
          <h1>About ProFundi</h1>
          <div className="subtitle-line"></div>
          <p className="tagline">Connecting clients with skilled professionals across South Africa, with a focus on showcasing talent from all communities</p>
        </div>
        <div className="hero-pattern"></div>
      </div>

      <div className="mission-section">
        <div className="container">
          <h2>Our Mission <FaHandshake className="section-icon" /></h2>
          <p>
            ProFundi is dedicated to connecting clients with skilled professionals across South Africa, with a special focus on empowering service providers from underserved communities by giving them a platform to showcase their expertise.
          </p>
          <p>
            We believe that talent exists everywhere, but opportunity does not. Our mission is to bridge this gap by providing a digital platform that makes it easy for customers to find and book services from qualified professionals from all backgrounds and communities.
          </p>
        </div>
      </div>

      <div className="vision-section">
        <div className="container">
          <h2>Our Vision <FaLightbulb className="section-icon" /></h2>
          <p>
            We envision a South Africa where skilled professionals from all communities have equal access to economic opportunities, regardless of their location or background.
          </p>
          <p>
            By connecting service providers with clients who need their expertise, we aim to create sustainable livelihoods, reduce unemployment, and contribute to the growth of the South African economy while highlighting talent from underserved areas.
          </p>
        </div>
      </div>

      <div className="how-it-works">
        <div className="container">
          <h2>How It Works <FaTools className="section-icon" /></h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Service Providers Register</h3>
              <p>Skilled professionals from townships and rural areas register on our platform, listing their services, skills, and availability.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Customers Search</h3>
              <p>Customers search for service providers based on location, service type, and reviews to find the right professional for their needs.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Book Services</h3>
              <p>Customers book services directly through the platform, specifying the date, time, and details of the job.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Service Delivery</h3>
              <p>Service providers receive bookings, confirm appointments, and deliver quality services to customers.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="impact-section">
        <div className="container">
          <h2>Our Impact <FaUsers className="section-icon" /></h2>
          <div className="impact-stats">
            <div className="stat">
              <h3>Economic Empowerment</h3>
              <p>By connecting skilled professionals with customers, we help create sustainable income opportunities for people in underserved communities.</p>
            </div>
            <div className="stat">
              <h3>Community Development</h3>
              <p>When local service providers thrive, they reinvest in their communities, creating a positive cycle of economic growth and development.</p>
            </div>
            <div className="stat">
              <h3>Skills Recognition</h3>
              <p>We highlight the skills and expertise that exist in townships and rural areas, challenging stereotypes and promoting recognition of talent.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="communities-section">
        <div className="container">
          <h2>Communities We Serve <FaMapMarkedAlt className="section-icon" /></h2>
          <p>
            ProFundi is committed to serving skilled professionals across South Africa, with a special focus on highlighting talent from underserved communities, including:
          </p>
          <div className="communities-grid">
            <div className="community">Soweto, Gauteng</div>
            <div className="community">Khayelitsha, Western Cape</div>
            <div className="community">Umlazi, KwaZulu-Natal</div>
            <div className="community">Mdantsane, Eastern Cape</div>
            <div className="community">Soshanguve, Gauteng</div>
            <div className="community">Gugulethu, Western Cape</div>
            <div className="community">Mamelodi, Gauteng</div>
            <div className="community">And many more rural and township areas</div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="container">
          <h2>Join the ProFundi Community</h2>
          <div className="subtitle-line"></div>
          <p>Whether you're a skilled professional looking to grow your business or a client in need of quality services, ProFundi is here to connect you with the right people.</p>
          <div className="cta-buttons">
            <Link to="/register/provider" className="cta-button provider">Join as a Professional</Link>
            <Link to="/register/user" className="cta-button">Find a Professional</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
