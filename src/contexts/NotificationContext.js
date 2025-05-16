import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import useUserRole from '../hooks/useUserRole';

// Create the context
export const NotificationContext = createContext();

// Create a provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();
  const { userRole } = useUserRole();

  useEffect(() => {
    const user = auth.currentUser;

    if (!user || !userRole) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirestore();

    // Create a query based on user role
    let notificationsQuery;

    if (userRole === 'provider') {
      // For providers, get notifications where providerId matches user.uid
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('providerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      // For regular users, get notifications where userId matches user.uid
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(notificationsQuery,
      (snapshot) => {
        // Get all notifications
        let notificationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamp to Date if it exists
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date()
        }));

        // Filter out admin notifications for non-admin users
        // In a real system, you would check if the current user is an admin
        const isAdmin = false; // Replace with actual admin check

        if (!isAdmin) {
          notificationsList = notificationsList.filter(notification =>
            !notification.adminNotification ||
            (notification.adminNotification && notification.userId === auth.currentUser?.uid)
          );
        }

        // Filter out deleted notifications
        notificationsList = notificationsList.filter(notification => !notification.deleted);

        setNotifications(notificationsList);

        // Count unread notifications
        const unreadNotifications = notificationsList.filter(notification => !notification.read);
        setUnreadCount(unreadNotifications.length);

        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notifications:', err);

        // If it's a permission error, log a more helpful message
        if (err.code === 'permission-denied') {
          console.warn('Permission denied when fetching notifications. Please check Firestore security rules.');
          console.warn('You may need to deploy updated security rules that allow notification access.');

          // Set empty notifications to prevent breaking the UI
          setNotifications([]);
          setUnreadCount(0);
        } else {
          setError('Failed to load notifications');
        }

        setLoading(false);
      }
    );

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  // Function to mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });

      // Update local state in case Firestore update fails
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);

      // If it's a permission error, log a more helpful message
      if (err.code === 'permission-denied') {
        console.warn('Permission denied when updating notification. Please check Firestore security rules.');

        // Still update the UI state even if the database update failed
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );

        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setError('Failed to update notification');
      }
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const db = getFirestore();
      const unreadNotifications = notifications.filter(notification => !notification.read);

      // Update each unread notification
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          read: true
        })
      );

      await Promise.all(updatePromises);

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );

      // Update unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);

      // If it's a permission error, log a more helpful message
      if (err.code === 'permission-denied') {
        console.warn('Permission denied when updating notifications. Please check Firestore security rules.');

        // Still update the UI state even if the database update failed
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        );

        // Update unread count
        setUnreadCount(0);
      } else {
        setError('Failed to update notifications');
      }
    }
  };

  // Function to delete a notification
  const deleteNotification = async (notificationId) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'notifications', notificationId), {
        deleted: true
      });

      // Update local state to remove the deleted notification
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      // Update unread count if needed
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);

      // If it's a permission error, log a more helpful message
      if (err.code === 'permission-denied') {
        console.warn('Permission denied when deleting notification. Please check Firestore security rules.');

        // Still update the UI state even if the database update failed
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

        // Update unread count if needed
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else {
        setError('Failed to delete notification');
      }
    }
  };

  // Value to be provided to consumers
  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
