import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  User, 
  Star, 
  Truck, 
  Phone, 
  ArrowLeft,
  Navigation,
  Clock,
  CheckCircle,
  Loader,
  RefreshCw
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const SelectDriver = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderAndDrivers();
    } else {
      toast.error('Order ID is required');
      navigate('/customer');
    }

    // Listen for authentication errors
    const handleAuthError = (event) => {
      console.log('SelectDriver: Auth error received', event.detail);
      setAuthError(true);
      toast.error('Session expired. Please login again to continue.');
    };

    window.addEventListener('authError', handleAuthError);
    
    return () => {
      window.removeEventListener('authError', handleAuthError);
    };
  }, [orderId, navigate]);

  const fetchOrderAndDrivers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch order details first
      const orderResponse = await api.get(`/customer/orders/${orderId}`);
      const orderData = orderResponse.data;
      setOrder(orderData);

      // Check if order is in the right status for driver selection
      if (orderData.status !== 'pending_driver_selection') {
        if (orderData.status === 'requested') {
          toast.info('Driver request already sent. Redirecting to tracking...');
          navigate(`/customer/track-order?id=${orderId}`);
          return;
        } else if (['accepted', 'assigned', 'picked', 'delivering', 'delivered'].includes(orderData.status)) {
          toast.info('Order already has a driver. Redirecting to tracking...');
          navigate(`/customer/track-order?id=${orderId}`);
          return;
        }
      }

      // Fetch available drivers near pickup location
      const driversResponse = await api.get('/customer/drivers/available', {
        params: {
          pickup_lat: orderData.pickup_lat,
          pickup_lng: orderData.pickup_lng
        }
      });

      setDrivers(driversResponse.data);
      
      if (isRefresh) {
        toast.success('Driver list updated');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        // Authentication error - will be handled by the auth event listener
        setAuthError(true);
        return;
      } else if (error.response?.status === 404) {
        toast.error('Order not found');
        navigate('/customer');
      } else {
        toast.error('Failed to load order details');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectDriver = async (driverId) => {
    setSelecting(true);
    setSelectedDriverId(driverId);

    try {
      const response = await api.post(`/customer/orders/${orderId}/select_driver`, {
        driver_id: driverId
      });

      toast.success('Driver request sent successfully!');
      
      // Redirect to tracking page
      navigate(`/customer/track-order?id=${orderId}`, {
        state: {
          message: 'Driver request sent! Waiting for driver to accept.',
          driverName: response.data.driver_name
        }
      });
    } catch (error) {
      console.error('Error selecting driver:', error);
      if (error.response?.status === 401) {
        // Authentication error - will be handled by the auth event listener
        setAuthError(true);
        toast.error('Session expired. Please login again to continue.');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to send driver request');
    } finally {
      setSelecting(false);
      setSelectedDriverId(null);
    }
  };

  const getDistanceColor = (distance) => {
    if (distance <= 2) return 'text-success-600 bg-success-100';
    if (distance <= 5) return 'text-warning-600 bg-warning-100';
    return 'text-neutral-600 bg-neutral-100';
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-success-600';
    if (rating >= 4.0) return 'text-warning-600';
    return 'text-neutral-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="xl" />
        </div>
      </Layout>
    );
  }

  if (authError) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="card p-6 sm:p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 mb-4">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Session Expired</h2>
            <p className="text-neutral-600 mb-4">
              Your session has expired. Please login again to continue with your order.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => window.location.href = '/login'}
                className="btn btn-primary"
              >
                Login Again
              </button>
              <button 
                onClick={() => navigate('/customer')} 
                className="btn btn-ghost"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="card p-6 sm:p-8 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Order Not Found</h2>
            <p className="text-neutral-600 mb-4">
              The order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button onClick={() => navigate('/customer')} className="btn btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/customer')}
            className="inline-flex items-center text-neutral-600 hover:text-primary-600 transition-colors duration-200 mb-4 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">
                Select Driver
              </h1>
              <p className="text-sm sm:text-base text-neutral-600">
                Choose from available drivers near your pickup location
              </p>
            </div>
            
            <button
              onClick={() => fetchOrderAndDrivers(true)}
              disabled={refreshing}
              className="btn btn-outline touch-manipulation"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 sm:p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Order Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Distance</p>
                <p className="text-sm text-neutral-600">{order.distance_km} km</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Material</p>
                <p className="text-sm text-neutral-600">{order.material_type}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Weight</p>
                <p className="text-sm text-neutral-600">{order.weight_kg} kg</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Estimated Fare</p>
                <p className="text-sm text-success-600 font-semibold">₹{order.fare_total}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-neutral-900 mb-1">Pickup Location:</p>
                <p className="text-neutral-600">{order.pickup_address}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-900 mb-1">Drop Location:</p>
                <p className="text-neutral-600">{order.drop_address}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Available Drivers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900">
                Available Drivers ({drivers.length})
              </h2>
              {drivers.length > 0 && (
                <p className="text-sm text-neutral-600">
                  Sorted by distance from pickup location
                </p>
              )}
            </div>
          </div>

          <div className="p-6">
            {drivers.length > 0 ? (
              <div className="space-y-4">
                {drivers.map((driver, index) => (
                  <motion.div
                    key={driver.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Driver Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        
                        {/* Driver Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-neutral-900 truncate">
                              {driver.name}
                            </h3>
                            {driver.is_verified && (
                              <CheckCircle className="h-4 w-4 text-success-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-neutral-600">
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-warning-400 fill-current" />
                              <span className={getRatingColor(driver.rating)}>
                                {driver.rating.toFixed(1)} ({driver.rating_count})
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Truck className="h-3 w-3" />
                              <span>{driver.vehicle_type}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Navigation className="h-3 w-3" />
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDistanceColor(driver.distance_km)}`}>
                                {driver.distance_km} km away
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-neutral-500">
                            Vehicle: {driver.vehicle_number} • Phone: {driver.phone}
                          </div>
                        </div>
                      </div>
                      
                      {/* Select Button */}
                      <button
                        onClick={() => selectDriver(driver.id)}
                        disabled={selecting}
                        className="btn btn-primary ml-4 touch-manipulation"
                      >
                        {selecting && selectedDriverId === driver.id ? (
                          <div className="flex items-center">
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Selecting...
                          </div>
                        ) : (
                          'Select Driver'
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No Drivers Available</h3>
                <p className="text-neutral-600 mb-4">
                  There are no drivers online near your pickup location at the moment.
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => fetchOrderAndDrivers(true)}
                    className="btn btn-outline touch-manipulation"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh List
                  </button>
                  <button
                    onClick={() => navigate('/customer')}
                    className="btn btn-ghost touch-manipulation"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 bg-neutral-50 rounded-lg"
        >
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-0.5">
              <CheckCircle className="h-4 w-4 text-primary-600" />
            </div>
            <div className="text-sm text-neutral-600">
              <p className="font-medium text-neutral-900 mb-1">How it works:</p>
              <ul className="space-y-1">
                <li>• Select a driver from the list above</li>
                <li>• We'll send your order request to the driver</li>
                <li>• You'll be redirected to track the order status</li>
                <li>• The driver will accept or decline your request</li>
                <li>• Once accepted, you can track your delivery in real-time</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default SelectDriver;