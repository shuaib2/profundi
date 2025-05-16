import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './SpecialDatesCalendar.css';

function SpecialDatesCalendar() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availability, setAvailability] = useState({
    specialDates: {}
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateStatus, setDateStatus] = useState({ available: true, reason: '' });

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          setError('You must be logged in to access this page');
          setLoading(false);
          return;
        }
        
        const db = getFirestore();
        const availabilityDoc = await getDoc(doc(db, 'providerAvailability', user.uid));
        
        if (availabilityDoc.exists()) {
          const data = availabilityDoc.data();
          setAvailability({
            specialDates: data.specialDates || {}
          });
          
          // Check if selected date has special status
          const dateStr = formatDate(selectedDate);
          if (data.specialDates && data.specialDates[dateStr]) {
            setDateStatus(data.specialDates[dateStr]);
          } else {
            setDateStatus({ available: true, reason: '' });
          }
        }
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError('Failed to load your special dates');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailability();
  }, [selectedDate]);

  const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    
    // Check if date has special status
    const dateStr = formatDate(date);
    if (availability.specialDates[dateStr]) {
      setDateStatus(availability.specialDates[dateStr]);
    } else {
      setDateStatus({ available: true, reason: '' });
    }
  };

  const handleAvailabilityToggle = () => {
    setDateStatus(prev => ({
      ...prev,
      available: !prev.available
    }));
  };

  const handleReasonChange = (e) => {
    setDateStatus(prev => ({
      ...prev,
      reason: e.target.value
    }));
  };

  const handleSaveDate = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setError('You must be logged in to save special dates');
        return;
      }
      
      const dateStr = formatDate(selectedDate);
      const updatedSpecialDates = {
        ...availability.specialDates,
        [dateStr]: dateStatus
      };
      
      // If date is available and has no reason, remove it from special dates
      if (dateStatus.available && !dateStatus.reason) {
        delete updatedSpecialDates[dateStr];
      }
      
      const db = getFirestore();
      await setDoc(doc(db, 'providerAvailability', user.uid), {
        specialDates: updatedSpecialDates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setAvailability(prev => ({
        ...prev,
        specialDates: updatedSpecialDates
      }));
      
      setSuccess(`Date ${dateStr} updated successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving special date:', err);
      setError('Failed to save special date');
    } finally {
      setLoading(false);
    }
  };

  const tileClassName = ({ date }) => {
    const dateStr = formatDate(date);
    if (availability.specialDates[dateStr]) {
      return availability.specialDates[dateStr].available ? 'special-date-available' : 'special-date-unavailable';
    }
    return null;
  };

  if (loading && Object.keys(availability.specialDates).length === 0) {
    return <div className="loading">Loading your special dates...</div>;
  }

  return (
    <div className="special-dates-calendar">
      <h2>Special Dates</h2>
      <p className="calendar-info">Mark dates when you're unavailable or have special hours.</p>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="calendar-container">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileClassName={tileClassName}
          minDate={new Date()}
        />
        
        <div className="date-details">
          <h3>Selected Date: {formatDate(selectedDate)}</h3>
          
          <div className="date-status">
            <label className="availability-toggle">
              <input
                type="checkbox"
                checked={dateStatus.available}
                onChange={handleAvailabilityToggle}
              />
              <span className="toggle-label">
                {dateStatus.available ? 'Available' : 'Unavailable'}
              </span>
            </label>
            
            {!dateStatus.available && (
              <div className="reason-field">
                <label>Reason (optional):</label>
                <input
                  type="text"
                  value={dateStatus.reason || ''}
                  onChange={handleReasonChange}
                  placeholder="e.g., Holiday, Vacation, Personal day"
                />
              </div>
            )}
            
            <button
              className="save-date-button"
              onClick={handleSaveDate}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Date'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecialDatesCalendar;
