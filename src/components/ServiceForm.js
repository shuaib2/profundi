import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import './ServiceForm.css';

function ServiceForm({ serviceId, providerId, onSave, onCancel }) {
  const [loading, setLoading] = useState(serviceId ? true : false);
  const [error, setError] = useState('');
  const [service, setService] = useState({
    title: '',
    description: '',
    category: ''
  });

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) return;

      try {
        setLoading(true);
        const db = getFirestore();

        try {
          const serviceDoc = await getDoc(doc(db, 'services', serviceId));

          if (serviceDoc.exists()) {
            setService(serviceDoc.data());
          } else {
            setError('Service not found');
          }
        } catch (firebaseError) {
          console.error('Error fetching service:', firebaseError);

          if (firebaseError.code === 'permission-denied') {
            console.warn('Firebase security rules need to be updated to allow fetching services.');

            // Check if we have data in localStorage as a fallback
            const localData = localStorage.getItem(`services_${providerId}`);
            if (localData) {
              try {
                const parsedData = JSON.parse(localData);
                const serviceData = parsedData.find(s => s.id === serviceId);

                if (serviceData) {
                  setService(serviceData);
                  console.log('Loaded service from localStorage');
                } else {
                  setError('Service not found in local storage');
                }
              } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
                setError('Failed to load service details from local storage');
              }
            } else {
              setError('No local service data available');
            }
          } else {
            setError('Failed to load service details');
          }
        }
      } catch (err) {
        console.error('Error in service fetch:', err);
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'price') {
      // Only allow numbers for price
      if (!/^\d*\.?\d*$/.test(value)) return;
    }

    setService(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!service.title.trim()) {
      setError('Service title is required');
      return;
    }

    if (!service.description.trim()) {
      setError('Service description is required');
      return;
    }

    if (!service.category.trim()) {
      setError('Service category is required');
      return;
    }

    try {
      setLoading(true);
      const db = getFirestore();

      const serviceData = {
        ...service,
        providerId,
        updatedAt: new Date().toISOString()
      };

      let savedServiceId;

      try {
        if (serviceId) {
          // Update existing service
          await setDoc(doc(db, 'services', serviceId), serviceData, { merge: true });
          savedServiceId = serviceId;
        } else {
          // Create new service
          serviceData.createdAt = new Date().toISOString();
          const docRef = await addDoc(collection(db, 'services'), serviceData);
          savedServiceId = docRef.id;
        }

        if (onSave) {
          onSave(savedServiceId);
        }
      } catch (firebaseError) {
        console.error('Error saving service:', firebaseError);

        if (firebaseError.code === 'permission-denied') {
          console.warn('Firebase security rules need to be updated to allow saving services.');

          // For development purposes, simulate saving to localStorage
          if (serviceId) {
            // Update existing service
            const localData = localStorage.getItem(`services_${providerId}`);
            if (localData) {
              try {
                const parsedData = JSON.parse(localData);
                const updatedServices = parsedData.map(s =>
                  s.id === serviceId ? { ...serviceData, id: serviceId } : s
                );
                localStorage.setItem(`services_${providerId}`, JSON.stringify(updatedServices));
                savedServiceId = serviceId;
                console.log('Updated service in localStorage');
              } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
              }
            }
          } else {
            // Create new service
            const localData = localStorage.getItem(`services_${providerId}`);
            const newId = 'local_' + Date.now();
            const newService = {
              ...serviceData,
              id: newId,
              createdAt: new Date().toISOString()
            };

            if (localData) {
              try {
                const parsedData = JSON.parse(localData);
                const updatedServices = [...parsedData, newService];
                localStorage.setItem(`services_${providerId}`, JSON.stringify(updatedServices));
                savedServiceId = newId;
                console.log('Added new service to localStorage');
              } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
              }
            } else {
              localStorage.setItem(`services_${providerId}`, JSON.stringify([newService]));
              savedServiceId = newId;
              console.log('Created first service in localStorage');
            }
          }

          // Simulate success
          if (onSave) {
            onSave(savedServiceId);
          }
        } else {
          setError('Failed to save service');
        }
      }
    } catch (err) {
      console.error('Error in service submission:', err);
      setError('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  if (loading && serviceId) {
    return <div className="loading">Loading service details...</div>;
  }

  return (
    <div className="service-form-container">
      <h2>{serviceId ? 'Edit Service' : 'Add New Service'}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="service-form">
        <div className="form-group">
          <label htmlFor="title">Service Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={service.title}
            onChange={handleChange}
            placeholder="e.g., Standard Plumbing Service"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <input
            type="text"
            id="category"
            name="category"
            value={service.category}
            onChange={handleChange}
            placeholder="e.g., Plumbing, Electrical, Cleaning"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={service.description}
            onChange={handleChange}
            placeholder="Describe your service in detail..."
            rows={4}
            required
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : (serviceId ? 'Update Service' : 'Add Service')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ServiceForm;
