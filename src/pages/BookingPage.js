import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaTag } from 'react-icons/fa';
import { notifyProvider } from '../utils/notificationUtils';
import useUserRole from '../hooks/useUserRole';
import { getImageUrl } from '../utils/imageUtils';
import ContactReminderModal from '../components/ContactReminderModal';
import LocationAutocomplete from '../components/LocationAutocomplete';
import './BookingPage.css';

function BookingPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    description: '',
    location: '',
    termsAccepted: false
  });

  // Get user role from Firestore using our custom hook
  const { userRole } = useUserRole();

  // Redirect providers to home page with a message
  useEffect(() => {
    if (userRole === 'provider') {
      navigate('/', {
        state: {
          error: 'Providers cannot book other providers. Please login as a user to book services.'
        }
      });
    }
  }, [userRole, navigate]);

  // Clear all states when component unmounts
  useEffect(() => {
    return () => {
      setProvider(null);
      setServices([]);
      setSelectedService(null);
      setAvailabilityData(null);
      setAvailableTimes([]);
      setLoading(false);
      setError(null);
      setBookingData({
        date: '',
        time: '',
        description: '',
        location: '',
        termsAccepted: false
      });
    };
  }, []);

  useEffect(() => {
    const fetchProviderDetails = async () => {
      try {
        const db = getFirestore();
        const providerDoc = await getDoc(doc(db, 'serviceProviders', providerId));

        if (!providerDoc.exists()) {
          throw new Error('Service provider not found');
        }

        const providerData = providerDoc.data();

        // Check if provider is verified
        if (!providerData.documentsVerified) {
          throw new Error('This service provider has not been verified by an administrator yet and cannot be booked.');
        }

        setProvider({ id: providerDoc.id, ...providerData });

        // Fetch provider services
        const servicesQuery = query(
          collection(db, 'services'),
          where('providerId', '==', providerId)
        );

        const servicesSnapshot = await getDocs(servicesQuery);

        if (!servicesSnapshot.empty) {
          const servicesList = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setServices(servicesList);

          // If there's only one service, select it by default
          if (servicesList.length === 1) {
            setSelectedService(servicesList[0]);
          }
        }

        // Fetch provider availability
        try {
          const availabilityDoc = await getDoc(doc(db, 'providerAvailability', providerId));

          if (availabilityDoc.exists()) {
            const availabilityData = availabilityDoc.data();
            setAvailabilityData(availabilityData);
          } else {
            // If no availability data exists, use default (all days available)
            const defaultAvailability = {
              monday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
              tuesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
              wednesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
              thursday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
              friday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
              saturday: { isAvailable: true, startTime: '09:00', endTime: '14:00' },
              sunday: { isAvailable: false, startTime: '09:00', endTime: '14:00' }
            };
            setAvailabilityData(defaultAvailability);
          }
        } catch (availabilityError) {
          console.warn('Error fetching availability:', availabilityError);
          // Use default availability if there's an error
          const defaultAvailability = {
            monday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
            tuesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
            wednesday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
            thursday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
            friday: { isAvailable: true, startTime: '08:00', endTime: '17:00' },
            saturday: { isAvailable: true, startTime: '09:00', endTime: '14:00' },
            sunday: { isAvailable: false, startTime: '09:00', endTime: '14:00' }
          };
          setAvailabilityData(defaultAvailability);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderDetails();
  }, [providerId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'date') {
      // Reset time when date changes
      setBookingData({
        ...bookingData,
        [name]: type === 'checkbox' ? checked : value,
        time: ''
      });

      // The useEffect will handle updating available times
    } else {
      setBookingData({
        ...bookingData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Function to format date as YYYY-MM-DD for special dates lookup
  const formatDate = useCallback((date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }, []);

  // Function to check if a date is available
  const isDateAvailable = useCallback((dateString) => {
    if (!availabilityData) return true; // Default to available if no data

    console.log("Checking availability for date:", dateString);
    console.log("Availability data:", availabilityData);

    // First check special dates (these override weekly schedule)
    if (availabilityData.specialDates) {
      const formattedDate = formatDate(dateString);
      console.log("Formatted date for special dates check:", formattedDate);

      if (availabilityData.specialDates[formattedDate]) {
        const isAvailable = availabilityData.specialDates[formattedDate].available;
        console.log("Special date found, available:", isAvailable);
        return isAvailable;
      }
    }

    // Then check weekly schedule
    if (availabilityData.weeklySchedule) {
      const date = new Date(dateString);
      const dayOfWeek = date.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      console.log("Checking weekly schedule for day:", dayName);

      // Check if day exists in weekly schedule and is marked as unavailable
      if (availabilityData.weeklySchedule[dayName]) {
        const isAvailable = availabilityData.weeklySchedule[dayName].available;
        console.log("Weekly schedule for day found, available:", isAvailable);
        return isAvailable;
      }
    }

    // Default to available if no specific settings found
    console.log("No specific availability settings found, defaulting to available");
    return true;
  }, [availabilityData, formatDate]);

  // Define updateAvailableTimes with useCallback to prevent unnecessary re-renders
  const updateAvailableTimes = useCallback((dateString) => {
    if (!dateString || !availabilityData) {
      console.log("No date string or availability data");
      return;
    }

    console.log("Updating available times for date:", dateString);
    console.log("Availability data:", availabilityData);

    // First check if this is a special date (overrides weekly schedule)
    if (availabilityData.specialDates) {
      const formattedDate = formatDate(dateString);
      console.log("Checking special dates for:", formattedDate);

      if (availabilityData.specialDates[formattedDate]) {
        const specialDate = availabilityData.specialDates[formattedDate];
        console.log("Special date found:", specialDate);

        // If the special date is marked as unavailable, no time slots are available
        if (!specialDate.available) {
          console.log("Special date is marked as unavailable");
          setAvailableTimes([]);
          return;
        }

        // If the special date has custom hours, use those
        if (specialDate.startTime && specialDate.endTime) {
          console.log("Special date has custom hours");
          const startTime = specialDate.startTime;
          const endTime = specialDate.endTime;

          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);

          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;

          const timeSlots = [];

          for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            const hour = Math.floor(minutes / 60);
            const minute = minutes % 60;
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeSlots.push(timeString);
          }

          console.log("Generated time slots for special date:", timeSlots);
          setAvailableTimes(timeSlots);
          return;
        }
      }
    }

    // If not a special date or special date doesn't have custom hours, check weekly schedule
    if (availabilityData.weeklySchedule) {
      const selectedDate = new Date(dateString);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Map day number to day name
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      console.log("Checking weekly schedule for day:", dayName);

      // Check if the day exists in the weekly schedule
      if (availabilityData.weeklySchedule[dayName]) {
        const daySchedule = availabilityData.weeklySchedule[dayName];
        console.log("Day schedule found:", daySchedule);

        // If the day is marked as unavailable in weekly schedule, no time slots are available
        if (!daySchedule.available) {
          console.log("Day is marked as unavailable in weekly schedule");
          setAvailableTimes([]);
          return;
        }

        // Generate available time slots based on weekly schedule
        const startTime = daySchedule.start || '09:00';
        const endTime = daySchedule.end || '17:00';

        console.log("Weekly schedule hours - Start:", startTime, "End:", endTime);

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        const timeSlots = [];

        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
          const hour = Math.floor(minutes / 60);
          const minute = minutes % 60;
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          timeSlots.push(timeString);
        }

        console.log("Generated time slots from weekly schedule:", timeSlots);
        setAvailableTimes(timeSlots);
        return;
      }
    }

    // If no specific settings found, use default availability
    console.log("No specific availability settings found, using default");
    const defaultAvailability = {
      startTime: '09:00',
      endTime: '17:00'
    };

    // Generate available time slots in 30-minute increments
    const startTime = defaultAvailability.startTime;
    const endTime = defaultAvailability.endTime;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    const timeSlots = [];

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }

    console.log("Generated default time slots:", timeSlots);
    setAvailableTimes(timeSlots);
  }, [availabilityData, formatDate]);

  // Update available times when date changes
  useEffect(() => {
    if (bookingData.date) {
      updateAvailableTimes(bookingData.date);
    }
  }, [bookingData.date, availabilityData, updateAvailableTimes]);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
  };

  const handleCloseContactModal = () => {
    setShowContactModal(false);
    // If user closes the modal without updating contact info, navigate back
    navigate(-1);
  };

  const handleContinueBooking = () => {
    setShowContactModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check if terms are accepted
    if (!bookingData.termsAccepted) {
      setError('You must accept the Terms and Conditions to proceed with booking.');
      setLoading(false);
      return;
    }

    // Check if the selected date is available
    if (bookingData.date && !isDateAvailable(bookingData.date)) {
      setError('The selected day is not available for booking');
      setLoading(false);
      return;
    }

    // Validate that the selected time is available
    if (bookingData.date && bookingData.time && availabilityData) {
      const selectedDate = new Date(bookingData.date);
      const dayOfWeek = selectedDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      // Check if the day is available
      const dayAvailability = availabilityData[dayName];

      // If the day is explicitly marked as unavailable
      if (dayAvailability && dayAvailability.isAvailable === false) {
        setError('The selected day is not available for booking');
        setLoading(false);
        return;
      }

      // Get the start and end times based on weekly schedule
      const startTime = dayAvailability?.start || '09:00';
      const endTime = dayAvailability?.end || '17:00';

      // Check if the time is within available hours
      const [selectedHour, selectedMinute] = bookingData.time.split(':').map(Number);
      const selectedMinutes = selectedHour * 60 + selectedMinute;

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (selectedMinutes < startMinutes || selectedMinutes >= endMinutes) {
        setError('The selected time is outside of available hours');
        setLoading(false);
        return;
      }
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in to book a service');
      }

      // Get user's profile data including phone number
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data() || {};

      // Get the provider's userId (which is what we need for notifications)
      // If provider.userId exists, use it; otherwise, use provider.id
      const providerUserId = provider.userId || provider.id;
      console.log('Provider object:', provider);
      console.log('Creating booking with provider user ID:', providerUserId);
      console.log('Provider document ID:', provider.id);

      const bookingRef = await addDoc(collection(db, 'bookings'), {
        userId: user.uid,
        providerId: providerUserId, // Use the provider's userId for notifications
        providerDocId: provider.id, // Store the provider's document ID separately
        providerName: provider.firstName || 'Provider',
        providerFirstName: provider.firstName || 'Provider', // Always store first name for user display
        customerName: user.displayName || userData.username || user.email,
        customerPhone: userData.phoneNumber || 'Not provided',
        status: 'pending_confirmation', // Set status to pending confirmation until provider accepts
        date: bookingData.date,
        time: bookingData.time,
        description: bookingData.description,
        location: bookingData.location,
        service: provider.profession,
        serviceId: selectedService?.id || null,
        serviceName: selectedService?.title || null,
        createdAt: serverTimestamp()
      });

      // Send notification to provider
      try {
        await notifyProvider(
          providerUserId,
          `New booking request from ${user.displayName || userData.username || user.email} for ${bookingData.date} at ${bookingData.time}. Please accept or decline.`,
          'booking_request',
          {
            bookingId: bookingRef.id,
            date: bookingData.date,
            time: bookingData.time
          }
        );
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Continue with redirect even if notification fails
      }

      // Redirect directly to booking confirmation page
      navigate(`/booking-confirmation/${bookingRef.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="booking-page loading">Loading...</div>;
  }

  if (error) {
    return <div className="booking-page error">{error}</div>;
  }

  // Make sure provider is not null before rendering
  if (!provider) {
    return <div className="booking-page error">Provider information could not be loaded. Please try again.</div>;
  }

  // Determine the correct image URL using our utility function
  const getProviderImageUrl = () => {
    if (!provider.profileImagePath) {
      return '/images/default-avatar.png';
    }
    return getImageUrl(provider.profileImagePath);
  };

  return (
    <div className="booking-page">
      {showContactModal && (
        <ContactReminderModal
          onClose={handleCloseContactModal}
          onContinue={handleContinueBooking}
        />
      )}
      <div className="provider-details">
        <img
          src={getProviderImageUrl()}
          alt={provider.firstName || 'Provider'}
          className="provider-image"
          onError={(e) => {
            e.target.src = '/images/default-avatar.png';
          }}
        />
        <div className="provider-info">
          <h2>Book {provider.firstName || 'Provider'}</h2>
          <p className="profession">{provider.profession}</p>
          <p className="location" title={provider.location}>{provider.location ? provider.location.split(' ')[0] : 'Location not available'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="booking-form">
        {services.length > 0 && (
          <div className="form-group">
            <label>Select Service</label>
            <div className="services-selection">
              {services.map(service => (
                <div
                  key={service.id}
                  className={`service-option ${selectedService?.id === service.id ? 'selected' : ''}`}
                  onClick={() => handleServiceSelect(service)}
                >
                  <div className="service-option-header">
                    <h3>{service.title}</h3>
                  </div>
                  <div className="service-option-meta">
                    <span className="service-category">
                      <FaTag /> {service.category}
                    </span>
                  </div>
                  <p className="service-description">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <div className="date-input-container">
            <input
              type="date"
              id="date"
              name="date"
              value={bookingData.date}
              onChange={(e) => {
                // Check if the selected date is available
                if (isDateAvailable(e.target.value)) {
                  handleChange(e);
                } else {
                  alert("This date is not available for booking. Please select another date.");
                }
              }}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <div className="date-availability-note">
              Note: Some dates may be unavailable based on the provider's schedule.
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="time">Time</label>
          {bookingData.date && availableTimes.length > 0 ? (
            <select
              id="time"
              name="time"
              value={bookingData.time}
              onChange={handleChange}
              required
            >
              <option value="">Select a time</option>
              {availableTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          ) : bookingData.date && availableTimes.length === 0 ? (
            <div className="no-availability-message">
              No available times on this date. Please select another date.
            </div>
          ) : (
            <select
              id="time"
              name="time"
              value={bookingData.time}
              onChange={handleChange}
              disabled
              required
            >
              <option value="">Please select a date first</option>
            </select>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <LocationAutocomplete
            value={bookingData.location}
            onChange={(value) => setBookingData(prev => ({ ...prev, location: value }))}
            placeholder="Enter service location"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description of Problem</label>
          <textarea
            id="description"
            name="description"
            value={bookingData.description}
            onChange={handleChange}
            placeholder="Describe what service you need..."
            required
          />
        </div>

        <div className="booking-summary">
          <h3>Booking Summary</h3>

          <div className="summary-item">
            <span className="summary-label">Service:</span>
            <span className="summary-value">{selectedService ? selectedService.title : 'General Service'}</span>
          </div>

          {bookingData.date && (
            <div className="summary-item">
              <span className="summary-label">Date:</span>
              <span className="summary-value">{new Date(bookingData.date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          )}

          {bookingData.time && (
            <div className="summary-item">
              <span className="summary-label">Time:</span>
              <span className="summary-value">{bookingData.time}</span>
            </div>
          )}

          <div className="summary-item">
            <span className="summary-label">Provider:</span>
            <span className="summary-value">{provider.firstName || 'Provider'}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Location:</span>
            <span className="summary-value">{bookingData.location || provider.location}</span>
          </div>

          <div className="price-summary">
            <div className="price-item">
              <span className="price-label">Booking Fee:</span>
              <span className="price-value">R0.00 (Included in subscription)</span>
            </div>

            <div className="price-item total">
              <span className="price-label">Total:</span>
              <span className="price-value">R0.00</span>
            </div>
          </div>
        </div>

        <div className="booking-fee-info">
          <p>Your subscription gives you access to book service providers without any additional booking fees.</p>
          <p className="fee-note">You will pay the service provider directly for their services.</p>
        </div>

        <div className="form-group terms-checkbox">
          <div className="checkbox-container">
            <input
              type="checkbox"
              id="termsAccepted"
              name="termsAccepted"
              checked={bookingData.termsAccepted}
              onChange={handleChange}
              required
            />
            <label htmlFor="termsAccepted" className="checkbox-label">
              I agree to the <Link to="/terms" target="_blank" className="terms-link">Terms and Conditions</Link>
            </label>
          </div>
          <p className="terms-disclaimer">
            By proceeding with this booking, you acknowledge that while Profundi has verified this provider's identity,
            we are primarily a connection platform. Service quality and payment arrangements are handled directly between
            you and the service provider. We recommend discussing your expectations clearly before the service begins.
          </p>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
}

export default BookingPage;

