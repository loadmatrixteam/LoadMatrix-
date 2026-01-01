import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  Loader, 
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * LocationPermissionModal - Mandatory location permission modal for drivers
 * 
 * This modal:
 * - Cannot be closed without granting permission
 * - Blocks dashboard access until location is enabled
 * - Handles permission request and initial location fetch
 * - Delegates live tracking to parent component
 */
const LocationPermissionModal = ({ isOpen, onLocationEnabled }) => {
  const [permissionState, setPermissionState] = useState('requesting'); // requesting, granted, denied, error
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, getting, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check if geolocation is supported
  const isGeolocationSupported = 'geolocation' in navigator;

  useEffect(() => {
    if (isOpen && isGeolocationSupported) {
      requestLocationPermission();
    } else if (isOpen && !isGeolocationSupported) {
      setPermissionState('error');
      setErrorMessage('Your browser does not support location services. Please use a modern browser.');
    }
  }, [isOpen, isGeolocationSupported]);

  /**
   * Request location permission from the browser
   */
  const requestLocationPermission = () => {
    setLocationStatus('getting');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Permission granted successfully
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setCurrentLocation(location);
        setPermissionState('granted');
        setLocationStatus('success');
        
        // Send initial location update and notify parent
        sendLocationUpdate(location);
        
        toast.success('Location access granted! You are now online.');
      },
      (error) => {
        // Permission denied or error occurred
        handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  /**
   * Handle location permission errors
   */
  const handleLocationError = (error) => {
    setLocationStatus('error');
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setPermissionState('denied');
        setErrorMessage('Location access denied. Please enable location permissions in your browser settings and refresh the page.');
        break;
      case error.POSITION_UNAVAILABLE:
        setPermissionState('error');
        setErrorMessage('Location information is unavailable. Please check your device settings and try again.');
        break;
      case error.TIMEOUT:
        setPermissionState('error');
        setErrorMessage('Location request timed out. Please try again.');
        break;
      default:
        setPermissionState('error');
        setErrorMessage('Unable to get your location. Please try again.');
        break;
    }
  };

  /**
   * Send location update to backend API
   */
  const sendLocationUpdate = async (location) => {
    try {
      await api.post('/driver/location', {
        lat: location.lat,
        lng: location.lng
      });

      // Notify parent component that location is enabled
      if (permissionState === 'granted' && onLocationEnabled) {
        onLocationEnabled(location);
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      // Don't show toast for every failed update, just log it
    }
  };

  /**
   * Retry location permission request
   */
  const retryLocationRequest = () => {
    setRetryCount(prev => prev + 1);
    setPermissionState('requesting');
    setLocationStatus('idle');
    setErrorMessage('');
    
    // Small delay before retrying
    setTimeout(() => {
      requestLocationPermission();
    }, 500);
  };

  /**
   * Open browser settings (limited browser support)
   */
  const openBrowserSettings = () => {
    toast.error('Please manually enable location permissions in your browser settings and refresh the page.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop - cannot be clicked to close */}
        <div className="fixed inset-0 bg-black bg-opacity-75" />
        
        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 mb-4">
                {permissionState === 'requesting' && (
                  <Navigation className="h-8 w-8 text-primary-600 animate-pulse" />
                )}
                {permissionState === 'granted' && (
                  <CheckCircle className="h-8 w-8 text-success-600" />
                )}
                {(permissionState === 'denied' || permissionState === 'error') && (
                  <AlertTriangle className="h-8 w-8 text-danger-600" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                {permissionState === 'requesting' && 'Enable Location Access'}
                {permissionState === 'granted' && 'Location Enabled!'}
                {permissionState === 'denied' && 'Location Access Required'}
                {permissionState === 'error' && 'Location Error'}
              </h3>
              
              <p className="text-sm text-neutral-600">
                {permissionState === 'requesting' && 'Location access is required to go online and receive delivery orders.'}
                {permissionState === 'granted' && 'You are now online and can receive delivery orders.'}
                {permissionState === 'denied' && 'You must enable location access to use the driver dashboard.'}
                {permissionState === 'error' && 'There was an issue accessing your location.'}
              </p>
            </div>

            {/* Content based on state */}
            <div className="space-y-4">
              {/* Requesting State */}
              {permissionState === 'requesting' && (
                <div className="text-center">
                  {locationStatus === 'getting' && (
                    <div className="flex items-center justify-center space-x-2 text-primary-600">
                      <Loader className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Getting your location...</span>
                    </div>
                  )}
                  
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-primary-600 mt-0.5" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-primary-900">Why we need location access:</p>
                        <ul className="text-xs text-primary-700 mt-1 space-y-1">
                          <li>• Match you with nearby delivery orders</li>
                          <li>• Show your location to customers</li>
                          <li>• Enable real-time tracking</li>
                          <li>• Optimize delivery routes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Granted State */}
              {permissionState === 'granted' && (
                <div className="text-center">
                  <div className="p-4 bg-success-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-2 text-success-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Location access granted!</span>
                    </div>
                    {currentLocation && (
                      <p className="text-xs text-success-600 mt-2">
                        Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onLocationEnabled && onLocationEnabled(currentLocation)}
                    className="w-full btn btn-primary mt-4"
                  >
                    Continue to Dashboard
                  </button>
                </div>
              )}

              {/* Denied/Error State */}
              {(permissionState === 'denied' || permissionState === 'error') && (
                <div className="space-y-4">
                  {errorMessage && (
                    <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <XCircle className="h-5 w-5 text-danger-600 mt-0.5" />
                        <p className="text-sm text-danger-700">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="text-sm font-medium text-neutral-900 mb-2">To enable location access:</p>
                    <ol className="text-xs text-neutral-700 space-y-1">
                      <li>1. Click the location icon in your browser's address bar</li>
                      <li>2. Select "Allow" for location permissions</li>
                      <li>3. Refresh this page or click "Try Again" below</li>
                    </ol>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={retryLocationRequest}
                      className="flex-1 btn btn-primary"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </button>
                    <button
                      onClick={openBrowserSettings}
                      className="flex-1 btn btn-outline"
                    >
                      Help
                    </button>
                  </div>

                  {retryCount > 2 && (
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">
                        Having trouble? Contact support for assistance.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 text-center">
                Your location is only used for delivery services and is not stored permanently.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default LocationPermissionModal;