import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

/**
 * Custom hook to get the current user's role from Firestore
 * @returns {Object} An object containing the user role and loading state
 */
function useUserRole() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      if (!user) {
        // User is not logged in
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // First check users collection
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          setUserRole('user');
          setLoading(false);
          return;
        }
        
        // Then check serviceProviders collection
        const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
        
        if (providerDoc.exists()) {
          setUserRole('provider');
          setLoading(false);
          return;
        }
        
        // If we get here, the user exists in Firebase Auth but not in Firestore
        console.warn('User exists in Firebase Auth but not in Firestore:', user.uid);
        setUserRole(null);
        setError('User data not found');
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { userRole, loading, error };
}

export default useUserRole;
