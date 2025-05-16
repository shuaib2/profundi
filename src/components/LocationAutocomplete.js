import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import OSMLocationAutocomplete from './OSMLocationAutocomplete';

/**
 * This component is a wrapper around OSMLocationAutocomplete
 * to maintain backward compatibility with existing code.
 *
 * We've switched from Google Maps API to OpenStreetMap's Nominatim API
 * to avoid the billing requirements and API key setup.
 */
const LocationAutocomplete = forwardRef((props, ref) => {
  console.log('Using OpenStreetMap location autocomplete (no API key or billing required)');

  // Create a ref to the OSM component to access its isValidSelection state
  const osmRef = useRef();

  // Extend the onChange handler to include validation
  const handleChange = (value) => {
    // Call the original onChange handler with the value
    if (props.onChange) {
      props.onChange(value);
    }
  };

  // Check if the current selection is valid
  const isValidSelection = () => {
    return osmRef.current && osmRef.current.isValidSelection;
  };

  // Expose the isValidSelection method to parent components
  useImperativeHandle(ref, () => ({
    isValidSelection: isValidSelection
  }));

  // Pass all props to the OSM component along with the ref
  return <OSMLocationAutocomplete
    {...props}
    ref={osmRef}
    onChange={handleChange}
  />;
});

export default LocationAutocomplete;
