import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './LocationAutocomplete.css'; // Reuse the existing CSS
import { NOMINATIM_API_URL, NOMINATIM_USER_AGENT } from '../config';

/**
 * OpenStreetMap Location Autocomplete component
 * Uses the Nominatim API for geocoding and autocomplete
 * No API key required
 */
const OSMLocationAutocomplete = forwardRef(({ value, onChange, placeholder, required, className }, ref) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isValidSelection, setIsValidSelection] = useState(Boolean(value)); // Track if selection is valid

  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Initialize with the provided value
  useEffect(() => {
    if (value) {
      setInputValue(value);
      setIsValidSelection(true); // Assume initial value is valid if provided
    }
  }, [value]);

  // Expose the isValidSelection state to parent components
  useImperativeHandle(ref, () => ({
    isValidSelection: isValidSelection
  }));

  // Debounce function to limit API requests
  const debounce = (func, delay) => {
    return (...args) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Function to fetch suggestions from the API
  const fetchSuggestions = async (value) => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);

    try {
      // Use the Nominatim API for geocoding
      // Documentation: https://nominatim.org/release-docs/develop/api/Search/
      const response = await fetch(
        `${NOMINATIM_API_URL}?format=json&q=${encodeURIComponent(value)}&countrycodes=za&limit=5&addressdetails=1`,
        {
          headers: {
            // Add a custom User-Agent as required by Nominatim Usage Policy
            'User-Agent': NOMINATIM_USER_AGENT
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        setSuggestions(data);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setError(true);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced version of fetchSuggestions (500ms delay)
  const debouncedFetchSuggestions = useRef(debounce(fetchSuggestions, 500)).current;

  // Handle input change and trigger debounced fetch
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Mark as invalid when user types (they must select from suggestions)
    setIsValidSelection(false);

    // We don't update the parent component until a valid selection is made
    // This prevents form submission with invalid data

    // Clear suggestions if input is empty
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Use debounced function to limit API requests
    debouncedFetchSuggestions(value);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    // Format the display name to be more user-friendly
    const displayName = suggestion.display_name.split(',').slice(0, 3).join(', ');

    setInputValue(displayName);
    setSuggestions([]);
    setShowSuggestions(false);

    // Mark as valid selection and update parent component
    setIsValidSelection(true);
    onChange(displayName);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }

    // Prevent form submission on Enter unless a valid selection has been made
    if (e.key === 'Enter' && !isValidSelection) {
      e.preventDefault();
    }
  };

  // Handle input focus
  const handleFocus = () => {
    // If there's text in the input but no valid selection, show suggestions
    if (inputValue.trim() && !isValidSelection) {
      debouncedFetchSuggestions(inputValue);
    }
  };

  // Common South African cities for basic autocomplete
  const commonSACities = [
    'Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth',
    'Bloemfontein', 'East London', 'Nelspruit', 'Kimberley', 'Polokwane'
  ];

  // Filter common cities based on input when API fails
  const getFilteredCities = () => {
    if (!error || !inputValue.trim()) return [];

    return commonSACities.filter(city =>
      city.toLowerCase().includes(inputValue.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions
  };

  const filteredCities = getFilteredCities();
  const showFallbackSuggestions = error && filteredCities.length > 0;

  return (
    <div className="location-autocomplete" ref={autocompleteRef}>
      <div className={`input-wrapper ${error ? 'api-error' : ''} ${!isValidSelection && inputValue ? 'invalid-selection' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder || "Select a location from the suggestions"}
          required={required}
          className={className || "location-input"}
          title="You must select a location from the suggestions"
          // This prevents form submission with invalid data
          // The actual value sent to the parent component is controlled by our onChange calls
          name={isValidSelection ? undefined : "invalid-location"}
        />
        {loading && <div className="location-loading">Loading...</div>}
        {error && (
          <div className="api-error-indicator" title="Location autocomplete is using basic functionality. Please select from the suggestions.">
            🏙️
          </div>
        )}
        {!isValidSelection && inputValue && (
          <div className="invalid-selection-indicator" title="Please select a location from the suggestions">
            ⚠️
          </div>
        )}
      </div>

      {/* Show API-based suggestions when available */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-item"
            >
              {suggestion.display_name.split(',').slice(0, 3).join(', ')}
            </li>
          ))}
        </ul>
      )}

      {/* Show fallback suggestions when API fails */}
      {showFallbackSuggestions && (
        <ul className="suggestions-list fallback">
          {filteredCities.map((city) => (
            <li
              key={city}
              onClick={() => {
                setInputValue(city);
                setIsValidSelection(true); // Mark as valid selection
                onChange(city);
                setShowSuggestions(false);
              }}
              className="suggestion-item fallback"
            >
              {city} <small>(common city)</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default OSMLocationAutocomplete;
