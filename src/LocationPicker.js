import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';
import L from 'leaflet';

// Default marker icon fix for React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationPicker = () => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [pincode, setPincode] = useState('');
  const [mode, setMode] = useState('coordinates'); // 'coordinates' or 'name'
  const [position, setPosition] = useState([37.7749, -122.4194]); // Default position
  const [message, setMessage] = useState(''); // State for the message
  const [nearbyLocations, setNearbyLocations] = useState([]); // State for nearby locations

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'coordinates') {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);

        // Display message with coordinates
        setMessage(`Coordinates:\nLatitude: ${lat}\nLongitude: ${lng}`);
        // Hide the message after 5 seconds
        setTimeout(() => {
          setMessage('');
        }, 5000);

        // Optionally update the location name based on the coordinates
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await response.json();
          if (data && data.address) {
            setLocationName(data.address.city || data.address.road || 'Unknown Location');
          }
        } catch (error) {
          console.error('Error fetching location name:', error);
        }
      } else {
        setMessage('Invalid coordinates. Please enter valid latitude and longitude.');
      }
    } else if (mode === 'name') {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${locationName}&format=json&limit=1`);
        const data = await response.json();
        if (data.length > 0) {
          const { lat, lon } = data[0];
          setPosition([parseFloat(lat), parseFloat(lon)]);
          setLatitude(lat);
          setLongitude(lon);
          setMessage(`Location found:\nLatitude: ${lat}\nLongitude: ${lon}`);
          // Hide the message after 5 seconds
          setTimeout(() => {
            setMessage('');
          }, 5000);
        } else {
          setMessage('Location not found. Please enter a valid location name.');
        }
      } catch (error) {
        setMessage('Error fetching location. Please try again.');
      }
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setPosition([latitude, longitude]);
        setLatitude(latitude);
        setLongitude(longitude);
      });
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Update latitude and longitude when marker is dragged
  const handleMarkerDrag = (e) => {
    const { lat, lng } = e.target.getLatLng();
    setPosition([lat, lng]);
    setLatitude(lat);
    setLongitude(lng);

    // Optionally update the location name based on the coordinates
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.address) {
          setLocationName(data.address.city || data.address.road || 'Unknown Location');
        }
      })
      .catch((error) => {
        console.error('Error fetching location name:', error);
      });

    // Fetch nearby locations
    fetch(`https://nominatim.openstreetmap.org/search?lat=${lat}&lon=${lng}&format=json&addressdetails=1`)
      .then((response) => response.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const nearby = data.slice(0, 5).map((item) => ({
            name: item.display_name,
            lat: item.lat,
            lon: item.lon
          }));
          setNearbyLocations(nearby);
        }
      })
      .catch((error) => {
        console.error('Error fetching nearby locations:', error);
      });
  };

  // Custom hook to update map view
  const MapViewUpdater = () => {
    const map = useMap();
    map.setView(position, 13); // Update map view
    return null;
  };

  return (
    <div className="location-form-container">
      <h2 className="heading">Locate Position on Leaflet Maps</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>
            <input
              type="radio"
              value="coordinates"
              checked={mode === 'coordinates'}
              onChange={() => setMode('coordinates')}
            />
            Enter Coordinates
          </label>
          <label>
            <input
              type="radio"
              value="name"
              checked={mode === 'name'}
              onChange={() => setMode('name')}
            />
            Enter Location Name
          </label>
        </div>

        {mode === 'coordinates' ? (
          <>
            <label className="label">
              Latitude:
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Enter latitude"
                className="input"
              />
            </label>
            <label className="label">
              Longitude:
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Enter longitude"
                className="input"
              />
            </label>
          </>
        ) : (
          <>
            <label className="label">
              Location Name:
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Enter location name"
                className="input"
              />
            </label>
            <label className="label">
              Pincode (Optional):
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter pincode"
                className="input"
              />
            </label>
          </>
        )}

        <button type="submit" className="submit-button">Submit</button>
        <button type="button" onClick={handleCurrentLocation} className="current-location-button">
          Use My Current Location
        </button>
      </form>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {nearbyLocations.length > 0 && (
        <div className="nearby-locations">
          <h3>Nearby Locations:</h3>
          <ul>
            {nearbyLocations.map((loc, index) => (
              <li key={index}>
                {loc.name} (Lat: {loc.lat}, Lon: {loc.lon})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="map-container">
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '500px', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{ drag: handleMarkerDrag }}
          >
            <Popup>
              {locationName || 'Drag the marker to set the location'}
            </Popup>
          </Marker>
          <MapViewUpdater />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
