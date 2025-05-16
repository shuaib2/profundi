import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import './AvailabilitySettings.css';

function AvailabilitySettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Define default availability structure
  const defaultAvailability = {
    weeklySchedule: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "10:00", end: "14:00", available: true },
      sunday: { start: "00:00", end: "00:00", available: false }
    },
    specialDates: {},
    timeSlotDuration: 60,
    bufferTime: 15
  };

  const [availability, setAvailability] = useState(defaultAvailability);

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

        try {
          const availabilityDoc = await getDoc(doc(db, 'providerAvailability', user.uid));

          if (availabilityDoc.exists()) {
            const data = availabilityDoc.data();

            // Ensure we have all required fields with proper defaults
            const completeData = {
              weeklySchedule: data.weeklySchedule || {
                monday: { start: "09:00", end: "17:00", available: true },
                tuesday: { start: "09:00", end: "17:00", available: true },
                wednesday: { start: "09:00", end: "17:00", available: true },
                thursday: { start: "09:00", end: "17:00", available: true },
                friday: { start: "09:00", end: "17:00", available: true },
                saturday: { start: "10:00", end: "14:00", available: true },
                sunday: { start: "00:00", end: "00:00", available: false }
              },
              specialDates: data.specialDates || {},
              timeSlotDuration: data.timeSlotDuration || 60,
              bufferTime: data.bufferTime !== undefined ? data.bufferTime : 15,
              providerId: user.uid,
              updatedAt: data.updatedAt || new Date().toISOString()
            };

            setAvailability(completeData);
          }
        } catch (firebaseError) {
          console.error('Error fetching availability:', firebaseError);

          if (firebaseError.code === 'permission-denied') {
            console.warn('Firebase security rules need to be updated to allow access to providerAvailability collection.');

            // Check if we have data in localStorage as a fallback
            const localData = localStorage.getItem(`providerAvailability_${user.uid}`);
            if (localData) {
              try {
                const parsedData = JSON.parse(localData);

                // Ensure we have all required fields with proper defaults
                const completeData = {
                  weeklySchedule: parsedData.weeklySchedule || {
                    monday: { start: "09:00", end: "17:00", available: true },
                    tuesday: { start: "09:00", end: "17:00", available: true },
                    wednesday: { start: "09:00", end: "17:00", available: true },
                    thursday: { start: "09:00", end: "17:00", available: true },
                    friday: { start: "09:00", end: "17:00", available: true },
                    saturday: { start: "10:00", end: "14:00", available: true },
                    sunday: { start: "00:00", end: "00:00", available: false }
                  },
                  specialDates: parsedData.specialDates || {},
                  timeSlotDuration: parsedData.timeSlotDuration || 60,
                  bufferTime: parsedData.bufferTime !== undefined ? parsedData.bufferTime : 15,
                  providerId: user.uid,
                  updatedAt: parsedData.updatedAt || new Date().toISOString()
                };

                setAvailability(completeData);
                console.log('Loaded availability from localStorage');
              } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
              }
            }
          } else {
            setError('Failed to load your availability settings');
          }
        }
      } catch (err) {
        console.error('Error in availability fetch:', err);
        setError('Failed to load your availability settings');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  const handleWeeklyScheduleChange = (day, field, value) => {
    setAvailability(prev => {
      // Create default weeklySchedule if it doesn't exist
      const weeklySchedule = prev.weeklySchedule || {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "10:00", end: "14:00", available: true },
        sunday: { start: "00:00", end: "00:00", available: false }
      };

      // Create default day schedule if it doesn't exist
      const daySchedule = weeklySchedule[day] || { start: "09:00", end: "17:00", available: true };

      return {
        ...prev,
        weeklySchedule: {
          ...weeklySchedule,
          [day]: {
            ...daySchedule,
            [field]: value
          }
        }
      };
    });
  };

  const handleAvailabilityToggle = (day) => {
    setAvailability(prev => {
      // Create default weeklySchedule if it doesn't exist
      const weeklySchedule = prev.weeklySchedule || {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "10:00", end: "14:00", available: true },
        sunday: { start: "00:00", end: "00:00", available: false }
      };

      // Create default day schedule if it doesn't exist
      const daySchedule = weeklySchedule[day] || { start: "09:00", end: "17:00", available: true };

      return {
        ...prev,
        weeklySchedule: {
          ...weeklySchedule,
          [day]: {
            ...daySchedule,
            available: !daySchedule.available
          }
        }
      };
    });
  };

  const handleDurationChange = (e) => {
    setAvailability(prev => ({
      ...prev,
      timeSlotDuration: parseInt(e.target.value)
    }));
  };

  const handleBufferChange = (e) => {
    setAvailability(prev => ({
      ...prev,
      bufferTime: parseInt(e.target.value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setError('You must be logged in to save your availability');
        return;
      }

      const db = getFirestore();

      try {
        // Ensure we have a valid availability object with all required fields
        const availabilityToSave = {
          weeklySchedule: availability.weeklySchedule || {
            monday: { start: "09:00", end: "17:00", available: true },
            tuesday: { start: "09:00", end: "17:00", available: true },
            wednesday: { start: "09:00", end: "17:00", available: true },
            thursday: { start: "09:00", end: "17:00", available: true },
            friday: { start: "09:00", end: "17:00", available: true },
            saturday: { start: "10:00", end: "14:00", available: true },
            sunday: { start: "00:00", end: "00:00", available: false }
          },
          specialDates: availability.specialDates || {},
          timeSlotDuration: availability.timeSlotDuration || 60,
          bufferTime: availability.bufferTime !== undefined ? availability.bufferTime : 15,
          providerId: user.uid,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'providerAvailability', user.uid), availabilityToSave, { merge: true });

        // Update the local state with the saved data
        setAvailability(availabilityToSave);
        setSuccess('Your availability settings have been saved successfully!');
      } catch (firebaseError) {
        console.error('Error saving availability:', firebaseError);

        if (firebaseError.code === 'permission-denied') {
          // Handle permission error gracefully
          setError('Permission denied. The Firebase security rules need to be updated. Please contact the administrator.');
          console.warn('Firebase security rules need to be updated to allow access to providerAvailability collection.');

          // For development purposes, we'll simulate success
          setSuccess('Your availability settings have been saved locally (Firebase rules need updating).');

          // Ensure we have a valid availability object with all required fields
          const availabilityToSave = {
            weeklySchedule: availability.weeklySchedule || {
              monday: { start: "09:00", end: "17:00", available: true },
              tuesday: { start: "09:00", end: "17:00", available: true },
              wednesday: { start: "09:00", end: "17:00", available: true },
              thursday: { start: "09:00", end: "17:00", available: true },
              friday: { start: "09:00", end: "17:00", available: true },
              saturday: { start: "10:00", end: "14:00", available: true },
              sunday: { start: "00:00", end: "00:00", available: false }
            },
            specialDates: availability.specialDates || {},
            timeSlotDuration: availability.timeSlotDuration || 60,
            bufferTime: availability.bufferTime !== undefined ? availability.bufferTime : 15,
            providerId: user.uid,
            updatedAt: new Date().toISOString()
          };

          // Store in localStorage as a temporary solution
          localStorage.setItem(`providerAvailability_${user.uid}`, JSON.stringify(availabilityToSave));

          // Update the local state with the saved data
          setAvailability(availabilityToSave);
        } else {
          setError('Failed to save your availability settings');
        }
      }
    } catch (err) {
      console.error('Error in availability submission:', err);
      setError('Failed to save your availability settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading your availability settings...</div>;
  }

  return (
    <div className="availability-settings">
      <h2>Manage Your Availability</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="weekly-schedule">
          <h3>Weekly Schedule</h3>
          <p className="schedule-info">Set your regular working hours for each day of the week.</p>

          <div className="days-container">
            {availability && availability.weeklySchedule && Object.entries(availability.weeklySchedule).map(([day, schedule]) => (
              <div key={day} className="day-schedule">
                <div className="day-header">
                  <label className="day-label">
                    <input
                      type="checkbox"
                      checked={schedule && schedule.available ? true : false}
                      onChange={() => handleAvailabilityToggle(day)}
                    />
                    <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                  </label>
                </div>

                {schedule && schedule.available && (
                  <div className="time-inputs">
                    <div className="time-field">
                      <label>Start:</label>
                      <input
                        type="time"
                        value={schedule.start || "09:00"}
                        onChange={(e) => handleWeeklyScheduleChange(day, 'start', e.target.value)}
                        disabled={!schedule.available}
                      />
                    </div>
                    <div className="time-field">
                      <label>End:</label>
                      <input
                        type="time"
                        value={schedule.end || "17:00"}
                        onChange={(e) => handleWeeklyScheduleChange(day, 'end', e.target.value)}
                        disabled={!schedule.available}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="appointment-settings">
          <h3>Appointment Settings</h3>

          <div className="setting-field">
            <label>Appointment Duration (minutes):</label>
            <select
              value={availability && availability.timeSlotDuration ? availability.timeSlotDuration : 60}
              onChange={handleDurationChange}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Buffer Time Between Appointments (minutes):</label>
            <select
              value={availability && availability.bufferTime !== undefined ? availability.bufferTime : 15}
              onChange={handleBufferChange}
            >
              <option value="0">No buffer</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={loading}>
            {loading ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AvailabilitySettings;
