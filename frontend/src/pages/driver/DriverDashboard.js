import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Package, 
  Clock, 
  TrendingUp,
  Navigation,
  Star,
  Eye,
  AlertCircle,
  Truck,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import LocationPermissionModal from '../../components/LocationPermissionModal';

const DriverDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    deliveredCount: 0,
    activeOrders: 0,
    rating: 0,
    ratingCount: 0
  });
  const [orders, setOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [requestedOrders, setRequestedOrders] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Location permission states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [dashboardBlocked, setDashboardBlocked] = useState(true);
  const [permissionCheckComplete, setPermissionCheckComplete] = useState(false);

  useEffect(() => {
    // Check location permission status on component mount
    checkLocationPermissionStatus();
  }, []);

  useEffect(() => {
    // Only fetch dashboard data if location permission is granted
    if (locationPermissionGranted) {
      fetchDashboardData();
    }
  }, [locationPermissionGranted]);

  /**
   * Check if location permission has been granted and driver is online
   */
  const checkLocationPermissionStatus = async () => {
    try {
      // Check if geolocation is supported
      if (!('geolocation' in navigator)) {
        toast.error('Your browser does not support location services');
        setShowLocationModal(true);
        setPermissionCheckComplete(true);
        return;
      }

      // First, check if we have a stored permission status for this user
      const userLocationKey = `driverLocationPermission_${user?.id}`;
      const userLocationTimeKey = `driverLocationPermissionTime_${user?.id}`;
      
      const storedPermission = localStorage.getItem(userLocationKey);
      const lastPermissionCheck = localStorage.getItem(userLocationTimeKey);
      
      // If permission was granted recently (within last 7 days), try to use it
      if (storedPermission === 'granted' && lastPermissionCheck) {
        const timeDiff = Date.now() - parseInt(lastPermissionCheck);
        const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days instead of 24 hours
        
        if (timeDiff < sevenDays) {
          // Try to get location silently without showing modal first
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Permission still valid, proceed silently
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              
              setCurrentLocation(location);
              setLocationPermissionGranted(true);
              setDashboardBlocked(false);
              setPermissionCheckComplete(true);
              
              // Start live tracking immediately
              startLiveLocationTracking(location);
              
              // Only show success message if it's been more than 1 hour since last check
              const oneHour = 60 * 60 * 1000;
              if (timeDiff > oneHour) {
                toast.success('Welcome back! Location tracking resumed.');
              }
            },
            (error) => {
              // Permission was revoked or expired, show modal
              console.log('Stored permission no longer valid:', error);
              localStorage.removeItem(userLocationKey);
              localStorage.removeItem(userLocationTimeKey);
              setShowLocationModal(true);
              setLocationPermissionGranted(false);
              setDashboardBlocked(true);
              setPermissionCheckComplete(true);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 300000 // 5 minutes
            }
          );
          return;
        }
      }

      // No stored permission or expired, check fresh but silently first
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Permission granted, store it with user-specific key
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          localStorage.setItem(userLocationKey, 'granted');
          localStorage.setItem(userLocationTimeKey, Date.now().toString());
          
          setCurrentLocation(location);
          setLocationPermissionGranted(true);
          setDashboardBlocked(false);
          setPermissionCheckComplete(true);
          
          // Start live tracking
          startLiveLocationTracking(location);
          
          // Show welcome message for new permission
          toast.success('Location access enabled! You are now online.');
        },
        (error) => {
          // Permission denied or error, show modal
          console.log('Location permission check failed:', error);
          localStorage.setItem(userLocationKey, 'denied');
          setShowLocationModal(true);
          setLocationPermissionGranted(false);
          setDashboardBlocked(true);
          setPermissionCheckComplete(true);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } catch (error) {
      console.error('Error checking location permission:', error);
      setShowLocationModal(true);
      setLocationPermissionGranted(false);
      setDashboardBlocked(true);
      setPermissionCheckComplete(true);
    }
  };

  /**
   * Start live location tracking - sends location updates every 7 seconds
   */
  const startLiveLocationTracking = (initialLocation) => {
    // Send initial location
    sendLocationUpdate(initialLocation);

    // Set up interval for live tracking
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setCurrentLocation(location);
          sendLocationUpdate(location);
        },
        (error) => {
          console.error('Live location tracking error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            // Permission was revoked, clear stored permission and show modal
            const userLocationKey = `driverLocationPermission_${user?.id}`;
            const userLocationTimeKey = `driverLocationPermissionTime_${user?.id}`;
            
            localStorage.removeItem(userLocationKey);
            localStorage.removeItem(userLocationTimeKey);
            clearInterval(interval);
            setShowLocationModal(true);
            setLocationPermissionGranted(false);
            setDashboardBlocked(true);
            toast.error('Location access was disabled. Please re-enable to stay online.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000
        }
      );
    }, 7000); // Update every 7 seconds

    // Store interval reference for cleanup
    window.driverLocationInterval = interval;
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
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  /**
   * Handle location permission granted from modal
   */
  const handleLocationEnabled = (location) => {
    // Store permission in localStorage with user-specific key
    const userLocationKey = `driverLocationPermission_${user?.id}`;
    const userLocationTimeKey = `driverLocationPermissionTime_${user?.id}`;
    
    localStorage.setItem(userLocationKey, 'granted');
    localStorage.setItem(userLocationTimeKey, Date.now().toString());
    
    setCurrentLocation(location);
    setLocationPermissionGranted(true);
    setDashboardBlocked(false);
    setShowLocationModal(false);
    setPermissionCheckComplete(true);
    
    // Start live tracking
    startLiveLocationTracking(location);
    
    toast.success('Welcome! You are now online and ready to receive orders.');
  };

  const fetchDashboardData = async () => {
    try {
      const [
        earningsResponse,
        ordersResponse,
        availableOrdersResponse,
        profileResponse
      ] = await Promise.all([
        api.get('/driver/earnings'),
        api.get('/driver/orders'),
        api.get('/driver/orders/available'),
        api.get('/driver/profile')
      ]);

      const earningsData = earningsResponse.data;
      const ordersData = ordersResponse.data;
      const availableOrdersData = availableOrdersResponse.data;
      const profileData = profileResponse.data;

      setStats({
        totalEarnings: earningsData.total_earnings || 0,
        deliveredCount: earningsData.delivered_count || 0,
        activeOrders: ordersData.filter(order => 
          ['accepted', 'assigned', 'picked', 'delivering'].includes(order.status)
        ).length,
        rating: profileData.rating || 0,
        ratingCount: profileData.rating_count || 0
      });

      setOrders(ordersData.slice(0, 5)); // Recent 5 orders
      setAvailableOrders(availableOrdersData.slice(0, 3)); // Top 3 available orders
      setDriverProfile(profileData);

      // Fetch requested orders if driver has profile
      if (profileData.driver_id) {
        try {
          const requestedResponse = await api.get(`/driver/orders/requested/${profileData.driver_id}`);
          setRequestedOrders(requestedResponse.data);
        } catch (error) {
          console.log('No requested orders or error fetching them');
        }
      }

    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location error:', error);
          // If location fails after permission was granted, show modal again
          if (locationPermissionGranted) {
            const userLocationKey = `driverLocationPermission_${user?.id}`;
            const userLocationTimeKey = `driverLocationPermissionTime_${user?.id}`;
            
            localStorage.removeItem(userLocationKey);
            localStorage.removeItem(userLocationTimeKey);
            toast.error('Location access lost. Please re-enable location permissions.');
            setShowLocationModal(true);
            setLocationPermissionGranted(false);
            setDashboardBlocked(true);
          }
        }
      );
    }
  };

  // Cleanup location tracking on component unmount
  useEffect(() => {
    return () => {
      if (window.driverLocationInterval) {
        clearInterval(window.driverLocationInterval);
        window.driverLocationInterval = null;
      }
    };
  }, []);

  const updateLocation = async () => {
    if (!currentLocation) {
      toast.error('Location not available. Please enable location services.');
      return;
    }

    setLocationLoading(true);
    try {
      await api.post('/driver/location', {
        lat: currentLocation.lat,
        lng: currentLocation.lng
      });
      toast.success('Location updated successfully!');
    } catch (error) {
      toast.error('Failed to update location');
    } finally {
      setLocationLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await api.post(`/driver/orders/${orderId}/accept`);
      toast.success('Order accepted successfully!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const acceptOrderRequest = async (orderId) => {
    try {
      await api.post(`/driver/orders/${orderId}/accept_request`);
      toast.success('Order request accepted!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to accept order request');
    }
  };

  const rejectOrderRequest = async (orderId) => {
    try {
      await api.post(`/driver/orders/${orderId}/reject_request`);
      toast.success('Order request rejected');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to reject order request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-warning-100 text-warning-800',
      requested: 'bg-secondary-100 text-secondary-800',
      accepted: 'bg-primary-100 text-primary-800',
      assigned: 'bg-primary-100 text-primary-800',
      picked: 'bg-accent-100 text-accent-800',
      delivering: 'bg-accent-100 text-accent-800',
      delivered: 'bg-success-100 text-success-800',
      cancelled: 'bg-danger-100 text-danger-800'
    };
    return colors[status] || 'bg-neutral-100 text-neutral-800';
  };

  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading || !permissionCheckComplete) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="xl" />
        </div>
      </Layout>
    );
  }

  // Show blocked dashboard if location permission not granted
  if (dashboardBlocked) {
    return (
      <Layout>
        <LocationPermissionModal 
          isOpen={showLocationModal} 
          onLocationEnabled={handleLocationEnabled}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-warning-100 mb-6">
              <Navigation className="h-12 w-12 text-warning-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">
              Location Access Required
            </h1>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              To access your driver dashboard and receive delivery orders, you must enable location permissions. 
              This allows us to match you with nearby orders and provide real-time tracking to customers.
            </p>
            <button
              onClick={() => setShowLocationModal(true)}
              className="btn btn-primary"
            >
              Enable Location Access
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Location Permission Modal */}
      <LocationPermissionModal 
        isOpen={showLocationModal} 
        onLocationEnabled={handleLocationEnabled}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-neutral-600">
                Manage your deliveries and track your earnings
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                className="btn btn-ghost p-2"
                title="Refresh Dashboard"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              {driverProfile && (
                <div className="text-right">
                  <p className="text-sm text-neutral-600">Driver ID</p>
                  <p className="font-semibold text-neutral-900">#{driverProfile.driver_id}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="card p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Earnings</p>
                <p className="text-2xl font-bold text-neutral-900">₹{stats.totalEarnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Deliveries</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.deliveredCount}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Orders</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.activeOrders}</p>
              </div>
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="card p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Rating</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-neutral-900">{stats.rating.toFixed(1)}</p>
                  <Star className="h-5 w-5 text-warning-400 fill-current" />
                </div>
                <p className="text-xs text-neutral-500">({stats.ratingCount} reviews)</p>
              </div>
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <button
            onClick={updateLocation}
            disabled={locationLoading}
            className="card p-6 card-hover group cursor-pointer bg-gradient-to-br from-primary-500 to-primary-600 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Update Location</h3>
                <p className="text-primary-100">Share your current location</p>
              </div>
              {locationLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Navigation className="h-8 w-8 group-hover:scale-110 transition-transform duration-200" />
              )}
            </div>
          </button>

          <Link
            to="/driver/orders"
            className="card p-6 card-hover group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">View Orders</h3>
                <p className="text-neutral-600">See all available orders</p>
              </div>
              <Package className="h-8 w-8 text-secondary-500 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </Link>

          <Link
            to="/driver/profile"
            className="card p-6 card-hover group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">My Profile</h3>
                <p className="text-neutral-600">Update your information</p>
              </div>
              <Truck className="h-8 w-8 text-accent-500 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </Link>

          <Link
            to="/driver/chat"
            className="card p-6 card-hover group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Support Chat</h3>
                <p className="text-neutral-600">Get help from support</p>
              </div>
              <MessageCircle className="h-8 w-8 text-success-500 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Requests */}
          {requestedOrders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-neutral-900 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-warning-500" />
                    Order Requests
                  </h2>
                  <span className="bg-warning-100 text-warning-800 px-2 py-1 rounded-full text-sm font-medium">
                    {requestedOrders.length} pending
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {requestedOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 bg-warning-50 border border-warning-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-neutral-900">Order #{order.id}</p>
                          <p className="text-sm text-neutral-600">Customer: {order.customer_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success-600">₹{order.fare_total}</p>
                          <p className="text-sm text-neutral-500">{order.distance_km}km</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-neutral-600">
                          <p>{order.pickup_address}</p>
                          <p>→ {order.drop_address}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => acceptOrderRequest(order.id)}
                            className="btn btn-primary text-sm px-3 py-1"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectOrderRequest(order.id)}
                            className="btn btn-ghost text-sm px-3 py-1"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Available Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">Available Orders</h2>
                <Link
                  to="/driver/orders"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                >
                  View All
                </Link>
              </div>
            </div>

            <div className="p-6">
              {availableOrders.length > 0 ? (
                <div className="space-y-4">
                  {availableOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium text-neutral-900">
                            Order #{order.id}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                            ₹{order.fare_total}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mb-1">
                          {order.pickup_address} → {order.drop_address}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Distance: {order.pickup && order.drop ? 
                            Math.sqrt(
                              Math.pow(order.drop[0] - order.pickup[0], 2) + 
                              Math.pow(order.drop[1] - order.pickup[1], 2)
                            ).toFixed(1) : 'N/A'
                          }km
                        </p>
                      </div>
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="btn btn-primary text-sm"
                      >
                        Accept
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No orders available</h3>
                  <p className="text-neutral-600 mb-4">
                    Check back later for new delivery opportunities
                  </p>
                  <button
                    onClick={fetchDashboardData}
                    className="btn btn-outline"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">Recent Orders</h2>
                <Link
                  to="/driver/orders"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                >
                  View All
                </Link>
              </div>
            </div>

            <div className="p-6">
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium text-neutral-900">
                            Order #{order.id}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mb-1">
                          Distance: {order.distance_km}km • Earnings: ₹{order.driver_share}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="btn btn-ghost p-2">
                        <Eye className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No orders yet</h3>
                  <p className="text-neutral-600 mb-4">
                    Start accepting orders to see them here
                  </p>
                  <Link
                    to="/driver/orders"
                    className="btn btn-primary"
                  >
                    View Available Orders
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default DriverDashboard;