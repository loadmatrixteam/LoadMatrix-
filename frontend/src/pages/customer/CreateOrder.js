import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Package, 
  Camera, 
  Calculator,
  ArrowLeft,
  Navigation,
  Loader
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for pickup and drop locations
const createCustomIcon = (color, symbol) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
      ">
        ${symbol}
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const pickupIcon = createCustomIcon('#22c55e', 'P');
const dropIcon = createCustomIcon('#ef4444', 'D');

// Component to update map view when coordinates change
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

const CreateOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pickup_location: '',
    pickup_lat: '',
    pickup_lng: '',
    drop_location: '',
    drop_lat: '',
    drop_lng: '',
    material_type: '',
    material_description: '',
    material_weight: '',
    distance_km: '',
    fare_total: ''
  });
  
  const [materialPhoto, setMaterialPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fareCalculated, setFareCalculated] = useState(false);
  
  // Geocoding and location states
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDrop, setGeocodingDrop] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Default to Mumbai
  const [mapZoom, setMapZoom] = useState(10);
  
  // Debounce timers for address input
  const pickupTimeoutRef = useRef(null);
  const dropTimeoutRef = useRef(null);

  // Handle authentication errors
  useEffect(() => {
    const handleAuthError = (event) => {
      console.log('CreateOrder: Auth error received', event.detail);
      toast.error('Session expired. Please login again.');
      // The API interceptor will handle the redirect
    };

    window.addEventListener('authError', handleAuthError);
    
    return () => {
      window.removeEventListener('authError', handleAuthError);
    };
  }, []);

  // Geocoding function using OpenStreetMap Nominatim API
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=in`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Reverse geocoding function
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Handle address input changes with debounced geocoding
  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear existing timeout
    const timeoutRef = field === 'pickup_location' ? pickupTimeoutRef : dropTimeoutRef;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for geocoding
    if (value.trim().length > 3) {
      timeoutRef.current = setTimeout(async () => {
        const isPickup = field === 'pickup_location';
        isPickup ? setGeocodingPickup(true) : setGeocodingDrop(true);

        const result = await geocodeAddress(value);
        if (result) {
          setFormData(prev => ({
            ...prev,
            [isPickup ? 'pickup_lat' : 'drop_lat']: result.lat.toString(),
            [isPickup ? 'pickup_lng' : 'drop_lng']: result.lng.toString()
          }));

          // Update map center if this is the first location set
          if (isPickup && (!formData.pickup_lat || !formData.pickup_lng)) {
            setMapCenter([result.lat, result.lng]);
            setMapZoom(15);
          }
          
          toast.success(`${isPickup ? 'Pickup' : 'Drop'} location found!`);
        } else {
          toast.error(`Could not find ${isPickup ? 'pickup' : 'drop'} location. Please check the address.`);
        }

        isPickup ? setGeocodingPickup(false) : setGeocodingDrop(false);
      }, 1000); // 1 second delay
    }
  };

  // Get current location using browser geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        const address = await reverseGeocode(latitude, longitude);
        
        setFormData(prev => ({
          ...prev,
          pickup_location: address,
          pickup_lat: latitude.toString(),
          pickup_lng: longitude.toString()
        }));

        // Update map center
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
        
        setGettingLocation(false);
        toast.success('Current location set as pickup location!');
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'Unable to get your location';
            break;
        }
        
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle address fields with geocoding
    if (name === 'pickup_location' || name === 'drop_location') {
      handleAddressChange(name, value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update map center when coordinates are manually changed
    if ((name === 'pickup_lat' || name === 'pickup_lng') && formData.pickup_lat && formData.pickup_lng) {
      const lat = name === 'pickup_lat' ? parseFloat(value) : parseFloat(formData.pickup_lat);
      const lng = name === 'pickup_lng' ? parseFloat(value) : parseFloat(formData.pickup_lng);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
        setMapZoom(15);
      }
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size should be less than 2MB');
        return;
      }
      
      setMaterialPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateFare = () => {
    const { pickup_lat, pickup_lng, drop_lat, drop_lng, material_weight } = formData;
    
    if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng || !material_weight) {
      toast.error('Please fill in all location coordinates and weight');
      return;
    }

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (parseFloat(drop_lat) - parseFloat(pickup_lat)) * Math.PI / 180;
    const dLng = (parseFloat(drop_lng) - parseFloat(pickup_lng)) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(parseFloat(pickup_lat) * Math.PI / 180) * Math.cos(parseFloat(drop_lat) * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Calculate fare: Base ₹30 + ₹10/km + ₹5/kg
    const baseFare = 30;
    const distanceFare = distance * 10;
    const weightFare = parseFloat(material_weight) * 5;
    const totalFare = baseFare + distanceFare + weightFare;

    setFormData(prev => ({
      ...prev,
      distance_km: distance.toFixed(2),
      fare_total: totalFare.toFixed(2)
    }));
    
    setFareCalculated(true);
    toast.success('Fare calculated successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fareCalculated) {
      toast.error('Please calculate fare before submitting');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      // Add photo if selected
      if (materialPhoto) {
        submitData.append('material_photo', materialPhoto);
      }

      const response = await api.post('/customer/orders/simple', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Order created successfully!');
      // Redirect to driver selection page instead of dashboard
      navigate(`/customer/select-driver?order_id=${response.data.order_id.replace('ORD', '')}`, { 
        state: { 
          message: `Order created successfully! Please select a driver.`,
          orderData: response.data
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        // Authentication error - will be handled by the auth event listener
        toast.error('Session expired. Please login again.');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  // Calculate map bounds to show both pickup and drop locations (for future use)
  // const getMapBounds = () => {
  //   const { pickup_lat, pickup_lng, drop_lat, drop_lng } = formData;
    
  //   if (pickup_lat && pickup_lng && drop_lat && drop_lng) {
  //     return [
  //       [parseFloat(pickup_lat), parseFloat(pickup_lng)],
  //       [parseFloat(drop_lat), parseFloat(drop_lng)]
  //     ];
  //   }
  //   return null;
  // };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <button
            onClick={() => navigate('/customer')}
            className="inline-flex items-center text-neutral-600 hover:text-primary-600 transition-colors duration-200 mb-4 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
            Create New Order
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            Fill in the details to send your package with interactive location selection
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pickup & Drop Locations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card p-4 sm:p-6"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary-500" />
                  Pickup & Drop Locations
                </h2>
                
                {/* Pickup Location */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Pickup Location
                    </label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="btn btn-ghost text-xs px-2 py-1 touch-manipulation"
                    >
                      {gettingLocation ? (
                        <Loader className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Navigation className="h-3 w-3 mr-1" />
                      )}
                      Use Current Location
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      name="pickup_location"
                      value={formData.pickup_location}
                      onChange={handleChange}
                      className="input pr-10"
                      placeholder="Enter pickup address"
                      required
                    />
                    {geocodingPickup && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader className="h-4 w-4 animate-spin text-primary-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="number"
                      name="pickup_lat"
                      value={formData.pickup_lat}
                      onChange={handleCoordinateChange}
                      className="input text-xs"
                      placeholder="Latitude"
                      step="any"
                      required
                    />
                    <input
                      type="number"
                      name="pickup_lng"
                      value={formData.pickup_lng}
                      onChange={handleCoordinateChange}
                      className="input text-xs"
                      placeholder="Longitude"
                      step="any"
                      required
                    />
                  </div>
                </div>

                {/* Drop Location */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Drop Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="drop_location"
                      value={formData.drop_location}
                      onChange={handleChange}
                      className="input pr-10"
                      placeholder="Enter drop address"
                      required
                    />
                    {geocodingDrop && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader className="h-4 w-4 animate-spin text-primary-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="number"
                      name="drop_lat"
                      value={formData.drop_lat}
                      onChange={handleCoordinateChange}
                      className="input text-xs"
                      placeholder="Latitude"
                      step="any"
                      required
                    />
                    <input
                      type="number"
                      name="drop_lng"
                      value={formData.drop_lng}
                      onChange={handleCoordinateChange}
                      className="input text-xs"
                      placeholder="Longitude"
                      step="any"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* Package Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-4 sm:p-6"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-secondary-500" />
                  Package Details
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Material Type
                    </label>
                    <select
                      name="material_type"
                      value={formData.material_type}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="">Select material type</option>
                      <option value="Documents">Documents</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Food">Food</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="material_weight"
                      value={formData.material_weight}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter weight in kg"
                      min="0.1"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    name="material_description"
                    value={formData.material_description}
                    onChange={handleChange}
                    className="input"
                    rows="3"
                    placeholder="Describe your package..."
                  />
                </div>

                {/* Photo Upload */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Package Photo (Optional)
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="btn btn-outline cursor-pointer touch-manipulation">
                      <Camera className="h-4 w-4 mr-2" />
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    {photoPreview && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Fare Calculation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-4 sm:p-6"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-accent-500" />
                  Fare Calculation
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Distance (km)
                    </label>
                    <input
                      type="number"
                      name="distance_km"
                      value={formData.distance_km}
                      className="input"
                      placeholder="Auto-calculated"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Total Fare (₹)
                    </label>
                    <input
                      type="number"
                      name="fare_total"
                      value={formData.fare_total}
                      className="input"
                      placeholder="Auto-calculated"
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={calculateFare}
                      className="btn btn-secondary w-full touch-manipulation"
                    >
                      Calculate Fare
                    </button>
                  </div>
                </div>

                {fareCalculated && (
                  <div className="p-3 sm:p-4 bg-success-50 border border-success-200 rounded-lg">
                    <p className="text-success-800 text-xs sm:text-sm">
                      <strong>Fare Breakdown:</strong> Base ₹30 + Distance (₹{(parseFloat(formData.distance_km) * 10).toFixed(2)}) + Weight (₹{(parseFloat(formData.material_weight) * 5).toFixed(2)}) = ₹{formData.fare_total}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4"
              >
                <button
                  type="button"
                  onClick={() => navigate('/customer')}
                  className="btn btn-ghost touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !fareCalculated}
                  className="btn btn-primary touch-manipulation"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating Order...
                    </div>
                  ) : (
                    'Create Order'
                  )}
                </button>
              </motion.div>
            </form>
          </div>

          {/* Right Column - Interactive Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-8"
          >
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900">Interactive Map</h3>
                <p className="text-sm text-neutral-600">
                  Pickup and drop locations will appear here
                </p>
              </div>
              
              <div className="h-64 sm:h-80 lg:h-96 relative">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Pickup Location Marker */}
                  {formData.pickup_lat && formData.pickup_lng && (
                    <Marker 
                      position={[parseFloat(formData.pickup_lat), parseFloat(formData.pickup_lng)]} 
                      icon={pickupIcon}
                    >
                      <Popup>
                        <div className="text-center">
                          <strong>Pickup Location</strong><br />
                          {formData.pickup_location || 'Pickup Address'}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  
                  {/* Drop Location Marker */}
                  {formData.drop_lat && formData.drop_lng && (
                    <Marker 
                      position={[parseFloat(formData.drop_lat), parseFloat(formData.drop_lng)]} 
                      icon={dropIcon}
                    >
                      <Popup>
                        <div className="text-center">
                          <strong>Drop Location</strong><br />
                          {formData.drop_location || 'Drop Address'}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  
                  {/* Update map view when coordinates change */}
                  <MapUpdater center={mapCenter} zoom={mapZoom} />
                </MapContainer>
              </div>
              
              {/* Map Legend */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-success-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-neutral-600">Pickup (P)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-danger-500 rounded-full border-2 border-white shadow"></div>
                    <span className="text-neutral-600">Drop (D)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateOrder;