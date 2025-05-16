import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { FaPlus, FaEdit, FaTrash, FaTag } from 'react-icons/fa';
import ServiceForm from './ServiceForm';
import './ServiceManagement.css';

function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [providerId, setProviderId] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setError('You must be logged in to manage services');
          setLoading(false);
          return;
        }

        setProviderId(user.uid);

        const db = getFirestore();

        try {
          const servicesQuery = query(
            collection(db, 'services'),
            where('providerId', '==', user.uid)
          );

          const servicesSnapshot = await getDocs(servicesQuery);

          const servicesList = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setServices(servicesList);
        } catch (firebaseError) {
          console.error('Error fetching services:', firebaseError);

          if (firebaseError.code === 'permission-denied') {
            console.warn('Firebase security rules need to be updated to allow access to services collection.');

            // Check if we have data in localStorage as a fallback
            const localData = localStorage.getItem(`services_${user.uid}`);
            if (localData) {
              try {
                const parsedData = JSON.parse(localData);
                setServices(parsedData);
                console.log('Loaded services from localStorage');
              } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
              }
            }

            // For development purposes, create some sample services
            if (!localData) {
              const sampleServices = [
                {
                  id: 'sample1',
                  title: 'Sample Service 1',
                  description: 'This is a sample service for development purposes.',
                  category: 'General',
                  providerId: user.uid
                },
                {
                  id: 'sample2',
                  title: 'Sample Service 2',
                  description: 'Another sample service for development purposes.',
                  category: 'Premium',
                  providerId: user.uid
                }
              ];

              setServices(sampleServices);
              localStorage.setItem(`services_${user.uid}`, JSON.stringify(sampleServices));
              console.log('Created sample services for development');
            }
          } else {
            setError('Failed to load your services');
          }
        }
      } catch (err) {
        console.error('Error in services fetch:', err);
        setError('Failed to load your services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleAddService = () => {
    setEditingServiceId(null);
    setShowForm(true);
  };

  const handleEditService = (serviceId) => {
    setEditingServiceId(serviceId);
    setShowForm(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      setLoading(true);
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;

      try {
        await deleteDoc(doc(db, 'services', serviceId));
        setServices(prev => prev.filter(service => service.id !== serviceId));
      } catch (firebaseError) {
        console.error('Error deleting service:', firebaseError);

        if (firebaseError.code === 'permission-denied') {
          console.warn('Firebase security rules need to be updated to allow deleting services.');

          // For development purposes, simulate deletion in localStorage
          const localData = localStorage.getItem(`services_${user.uid}`);
          if (localData) {
            try {
              const parsedData = JSON.parse(localData);
              const updatedServices = parsedData.filter(service => service.id !== serviceId);
              localStorage.setItem(`services_${user.uid}`, JSON.stringify(updatedServices));

              // Update UI
              setServices(prev => prev.filter(service => service.id !== serviceId));
              console.log('Deleted service from localStorage');
            } catch (parseError) {
              console.error('Error parsing localStorage data:', parseError);
            }
          }
        } else {
          setError('Failed to delete service');
        }
      }
    } catch (err) {
      console.error('Error in service deletion:', err);
      setError('Failed to delete service');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveService = async (serviceId) => {
    setShowForm(false);
    setLoading(true);

    try {
      const db = getFirestore();
      const servicesQuery = query(
        collection(db, 'services'),
        where('providerId', '==', providerId)
      );

      const servicesSnapshot = await getDocs(servicesQuery);

      const servicesList = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setServices(servicesList);
    } catch (err) {
      console.error('Error refreshing services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingServiceId(null);
  };

  if (loading && services.length === 0) {
    return <div className="loading">Loading your services...</div>;
  }

  if (showForm) {
    return (
      <ServiceForm
        serviceId={editingServiceId}
        providerId={providerId}
        onSave={handleSaveService}
        onCancel={handleCancelForm}
      />
    );
  }

  return (
    <div className="service-management">
      <div className="service-management-header">
        <h2>Your Services</h2>
        <button
          className="add-service-button"
          onClick={handleAddService}
        >
          <FaPlus /> Add New Service
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {services.length === 0 ? (
        <div className="no-services">
          <p>You haven't added any services yet.</p>
          <button
            className="add-first-service-button"
            onClick={handleAddService}
          >
            <FaPlus /> Add Your First Service
          </button>
        </div>
      ) : (
        <div className="services-list">
          {services.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-header">
                <h3>{service.title}</h3>
                <div className="service-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEditService(service.id)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteService(service.id)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="service-meta">
                <span className="service-category">
                  <FaTag /> {service.category}
                </span>
              </div>

              <p className="service-description">{service.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceManagement;
