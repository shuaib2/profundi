import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component that scrolls the window to the top
 * whenever the route changes.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top with a slight delay to ensure the new page has rendered
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Use 'instant' instead of 'smooth' to avoid animation issues
      });
    }, 0);
  }, [pathname]);

  return null; // This component doesn't render anything
}

export default ScrollToTop;
