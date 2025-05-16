/**
 * Utility functions for handling image URLs in the application
 * This centralizes the logic for determining image URLs, making it easier to update for production
 */

// Base URL for development environment
const DEV_BASE_URL = 'http://192.168.0.247/TT/projectconnect';

/**
 * Get the correct URL for an image path
 * @param {string} imagePath - The image path from the database
 * @param {string} defaultImage - The default image to use if no path is provided
 * @returns {string} - The complete URL to the image
 */
export const getImageUrl = (imagePath, defaultImage = '/images/default-avatar.png') => {
  // If no image path is provided, return the default image
  if (!imagePath) {
    return defaultImage;
  }

  // If it's already a full URL (starts with http:// or https://), use it as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // For development environment
  if (process.env.NODE_ENV === 'development') {
    // Handle the case where the path might have a double slash
    // First, ensure the base URL doesn't end with a slash
    const baseUrl = DEV_BASE_URL.endsWith('/') ? DEV_BASE_URL.slice(0, -1) : DEV_BASE_URL;

    // Then ensure the image path doesn't start with a slash
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

    return `${baseUrl}/${cleanPath}`;
  }

  // For production environment
  // If it's a relative path starting with a slash, it's a local path
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  // Otherwise, it's a path that needs to be resolved relative to the public folder
  return `/${imagePath}`;
}

/**
 * Get the API endpoint for file uploads
 * @returns {string} - The URL for the upload endpoint
 */
export const getUploadEndpoint = () => {
  // Use the appropriate URL based on environment
  if (process.env.NODE_ENV === 'development') {
    // Ensure the base URL doesn't end with a slash
    const baseUrl = DEV_BASE_URL.endsWith('/') ? DEV_BASE_URL.slice(0, -1) : DEV_BASE_URL;
    return `${baseUrl}/upload.php`;
  }

  // In production, use a relative URL that works with the same domain
  return '/upload.php';
}
