import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  Phone, 
  MessageCircle,
  Navigation,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  User,
  Star
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Custom icons
const createCustomIcon = (color, icon) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
      ">
        ${icon}
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const pickupIcon = createCustomIcon('#10b981', '📦');
const dropIcon = createCustomIcon('#ef4444', '🏁');
const driverIcon = createCustomIcon('#f59e0b', '🚛');

// Component to fit map bounds
const FitBounds = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds, map]);
  
  return null;
};

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const refreshInterval = useRef(null);

  const fetchOrderDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [orderResponse, trackResponse] = await Promise.all([
        api.get(`/customer/orders/${orderId}`),
        api.get(`/customer/orders/${orderId}/track`)
      ]);

      setOrder(orderResponse.data);
      
      if (trackResponse.data.driver) {
        setDriver(trackResponse.data.driver);
      }
      
      setLastUpdated(new Date());
      
      if (isRefresh) {
        toast.success('Location updated');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      if (!isRefresh) {
        toast.error('Failed to load order details');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      // Set up auto-refresh every 10 seconds for active orders
      refreshInterval.current = setInterval(() => {
        fetchOrderDetails(true);
      }, 10000);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { 
        color: 'text-warning-600 bg-warning-100', 
        icon: Clock, 
        text: 'Order Pending',
        description: 'Order is being processed'
      },
      pending_driver_selection: { 
        color: 'text-secondary-600 bg-secondary-100', 
        icon: User, 
        text: 'Select Driver',
        description: 'Please select a driver for your order'
      },
      requested: { 
        color: 'text-secondary-600 bg-secondary-100', 
        icon: User, 
        text: 'Driver Requested',
        description: 'Waiting for driver to accept'
      },
      accepted: { 
        color: 'text-primary-600 bg-primary-100', 
        icon: CheckCircle, 
        text: 'Order Accepted',
        description: 'Driver is on the way to pickup'
      },
      assigned: { 
        color: 'text-primary-600 bg-primary-100', 
        icon: Truck, 
        text: 'Driver Assigned',
        description: 'Driver is heading to pickup location'
      },
      picked: { 
        color: 'text-accent-600 bg-accent-100', 
        icon: Package, 
        text: 'Package Picked Up',
        description: 'Driver has collected your package'
      },
      delivering: { 
        color: 'text-accent-600 bg-accent-100', 
        icon: Navigation, 
        text: 'Out for Delivery',
        description: 'Package is on the way to destination'
      },
      delivered: { 
        color: 'text-success-600 bg-success-100', 
        icon: CheckCircle, 
        text: 'Delivered',
        description: 'Package has been delivered successfully'
      },
      cancelled: { 
        color: 'text-danger-600 bg-danger-100', 
        icon: AlertCircle, 
        text: 'Cancelled',
        description: 'Order has been cancelled'
      }
    };
    return statusMap[status] || statusMap.pending;
  };

  const getMapBounds = () => {
    if (!order) return null;
    
    const bounds = [
      [order.pickup_lat, order.pickup_lng],
      [order.drop_lat, order.drop_lng]
    ];
    
    if (driver && driver.lat && driver.lng) {
      bounds.push([driver.lat, driver.lng]);
    }
    
    return bounds;
  };

  const getRouteCoordinates = () => {
    if (!order || !driver || !driver.lat || !driver.lng) return [];
    
    // Simple route from driver to pickup (if not picked up) or to drop (if picked up)
    const driverPos = [driver.lat, driver.lng];
    
    if (order.status === 'assigned' || order.status === 'accepted') {
      // Driver going to pickup
      return [driverPos, [order.pickup_lat, order.pickup_lng]];
    } else if (order.status === 'picked' || order.status === 'delivering') {
      // Driver going to drop
      return [driverPos, [order.drop_lat, order.drop_lng]];
    }
    
    return [];
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

  if (!order) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="card p-6 sm:p-8 text-center">
            <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Order Not Found</h2>
            <p className="text-neutral-600 mb-4">
              The order you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link to="/customer" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const mapBounds = getMapBounds();
  const routeCoordinates = getRouteCoordinates();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link
            to="/customer"
            className="inline-flex items-center text-neutral-600 hover:text-primary-600 transition-colors duration-200 mb-4 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">
                Track Order #{order.id}
              </h1>
              <p className="text-sm sm:text-base text-neutral-600">
                Real-time tracking and delivery updates
              </p>
            </div>
            
            <button
              onClick={() => fetchOrderDetails(true)}
              disabled={refreshing}
              className="btn btn-outline touch-manipulation"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-neutral-200">
                <h2 className="text-lg font-semibold text-neutral-900">Live Tracking</h2>
                {lastUpdated && (
                  <p className="text-sm text-neutral-600">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
              
              <div className="h-64 sm:h-96 relative">
                <MapContainer
                  center={[order.pickup_lat, order.pickup_lng]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Pickup Location */}
                  <Marker position={[order.pickup_lat, order.pickup_lng]} icon={pickupIcon}>
                    <Popup>
                      <div className="text-center">
                        <strong>Pickup Location</strong><br />
                        {order.pickup_address}
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Drop Location */}
                  <Marker position={[order.drop_lat, order.drop_lng]} icon={dropIcon}>
                    <Popup>
                      <div className="text-center">
                        <strong>Drop Location</strong><br />
                        {order.drop_address}
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Driver Location */}
                  {driver && driver.lat && driver.lng && (
                    <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
                      <Popup>
                        <div className="text-center">
                          <strong>Driver Location</strong><br />
                          Current position
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  
                  {/* Route Line */}
                  {routeCoordinates.length > 0 && (
                    <Polyline
                      positions={routeCoordinates}
                      color="#f59e0b"
                      weight={4}
                      opacity={0.8}
                      dashArray="10, 10"
                    />
                  )}
                  
                  {/* Fit bounds to show all markers */}
                  {mapBounds && <FitBounds bounds={mapBounds} />}
                </MapContainer>
              </div>
            </div>
          </motion.div>

          {/* Order Details Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Status Card */}
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusInfo.color}`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">{statusInfo.text}</h3>
                  <p className="text-sm text-neutral-600">{statusInfo.description}</p>
                </div>
              </div>
              
              {/* Progress Steps */}
              <div className="space-y-3">
                {[
                  { key: 'pending_driver_selection', label: 'Order Placed' },
                  { key: 'requested', label: 'Driver Requested' },
                  { key: 'assigned', label: 'Driver Assigned' },
                  { key: 'picked', label: 'Package Picked Up' },
                  { key: 'delivering', label: 'Out for Delivery' },
                  { key: 'delivered', label: 'Delivered' }
                ].map((step, index) => {
                  const statusOrder = ['pending_driver_selection', 'requested', 'assigned', 'picked', 'delivering', 'delivered'];
                  const currentIndex = statusOrder.indexOf(order.status);
                  const stepIndex = statusOrder.indexOf(step.key);
                  
                  const isCompleted = currentIndex > stepIndex;
                  const isCurrent = step.key === order.status;
                  
                  return (
                    <div key={step.key} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isCompleted ? 'bg-success-500' : 
                        isCurrent ? 'bg-primary-500' : 'bg-neutral-300'
                      }`} />
                      <span className={`text-sm ${
                        isCompleted || isCurrent ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Driver Info */}
            {driver && (
              <div className="card p-4 sm:p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Driver Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Driver #{driver.id}</p>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-warning-400 fill-current" />
                        <span className="text-sm text-neutral-600">4.8 rating</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="btn btn-outline flex-1 text-sm touch-manipulation">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </button>
                    <Link
                      to="/customer/chat"
                      className="btn btn-primary flex-1 text-sm touch-manipulation"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Order Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Distance:</span>
                  <span className="font-medium">{order.distance_km} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Weight:</span>
                  <span className="font-medium">{order.weight_kg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Material:</span>
                  <span className="font-medium">{order.material_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Total Fare:</span>
                  <span className="font-medium text-primary-600">₹{order.fare_total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Order Time:</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Locations */}
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Locations</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center mt-1">
                    <Package className="h-4 w-4 text-success-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">Pickup</p>
                    <p className="text-sm text-neutral-600">{order.pickup_address}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-danger-100 rounded-full flex items-center justify-center mt-1">
                    <MapPin className="h-4 w-4 text-danger-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">Drop</p>
                    <p className="text-sm text-neutral-600">{order.drop_address}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile-friendly bottom actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 sm:hidden"
        >
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-outline touch-manipulation">
              <Phone className="h-4 w-4 mr-2" />
              Call Driver
            </button>
            <Link to="/customer/chat" className="btn btn-primary touch-manipulation">
              <MessageCircle className="h-4 w-4 mr-2" />
              Support
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default TrackOrder;