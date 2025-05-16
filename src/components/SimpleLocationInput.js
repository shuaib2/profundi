import React, { useState } from 'react';
import './LocationAutocomplete.css';

// Common South African cities and towns for basic autocomplete
const COMMON_SA_LOCATIONS = [
  'Cape Town',
  'Johannesburg',
  'Durban',
  'Pretoria',
  'Port Elizabeth',
  'Bloemfontein',
  'East London',
  'Nelspruit',
  'Kimberley',
  'Polokwane',
  'Pietermaritzburg',
  'Rustenburg',
  'Potchefstroom',
  'Stellenbosch',
  'George',
  'Upington',
  'Oudtshoorn',
  'Knysna',
  'Grahamstown',
  'Paarl',
  'Worcester',
  'Mossel Bay',
  'Hermanus',
  'Witbank',
  'Midrand',
  'Centurion',
  'Sandton',
  'Soweto',
  'Randburg',
  'Roodepoort',
  'Boksburg',
  'Benoni',
  'Springs',
  'Germiston',
  'Alberton',
  'Krugersdorp',
  'Vereeniging',
  'Vanderbijlpark',
  'Secunda',
  'Newcastle',
  'Richards Bay',
  'Ladysmith',
  'Empangeni',
  'Umhlanga',
  'Ballito',
  'Margate',
  'Port Shepstone',
  'Welkom',
  'Bethlehem',
  'Harrismith'
];

function SimpleLocationInput({ value, onChange, placeholder, required, className }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState([]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    onChange(value);

    // Filter locations based on input
    if (value.trim()) {
      const filtered = COMMON_SA_LOCATIONS.filter(location => 
        location.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      
      setFilteredLocations(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredLocations([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (location) => {
    setInputValue(location);
    onChange(location);
    setShowSuggestions(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="location-autocomplete">
      <div className="input-wrapper">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowSuggestions(filteredLocations.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder || "Enter location"}
          required={required}
          className={className || "location-input"}
          title="Enter a location in South Africa"
        />
        <div className="api-error-indicator" title="Using basic location input. Google Maps API is not available.">
          🏙️
        </div>
      </div>
      {showSuggestions && filteredLocations.length > 0 && (
        <ul className="suggestions-list">
          {filteredLocations.map((location) => (
            <li
              key={location}
              onClick={() => handleSuggestionClick(location)}
              className="suggestion-item"
            >
              {location}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SimpleLocationInput;
