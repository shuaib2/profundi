import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

/**
 * Custom hook to check if the current user is an admin
 * @returns {Object} An object containing the admin status and loading state
 */
function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      if (!user) {
        // User is not logged in
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user is in the admins collection
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (adminDoc.exists()) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
        
        // If we get here, the user is not an admin
        setIsAdmin(false);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError(err.message);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isAdmin, loading, error };
}

export default useAdminStatus;
