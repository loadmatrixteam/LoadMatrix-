import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  MapPin, 
  Clock, 
  DollarSign,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  Navigation,
  RefreshCw,
  Search
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const DriverOrders = () => {
  const navigate = useNavigate();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [requestedOrders, setRequestedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [availableResponse, myOrdersResponse] = await Promise.all([
        api.get('/driver/orders/available'),
        api.get('/driver/orders')
      ]);

      setAvailableOrders(availableResponse.data);
      setMyOrders(myOrdersResponse.data);

      // Try to fetch requested orders if we have driver profile
      try {
        const profileResponse = await api.get('/driver/profile');
        if (profileResponse.data.driver_id) {
          const requestedResponse = await api.get(`/driver/orders/requested/${profileResponse.data.driver_id}`);
          setRequestedOrders(requestedResponse.data);
        }
      } catch (error) {
        console.log('No requested orders');
      }

    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await api.post(`/driver/orders/${orderId}/accept`);
      toast.success('Order accepted successfully!');
      fetchOrders(); // Refresh data
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const acceptOrderRequest = async (orderId) => {
    try {
      await api.post(`/driver/orders/${orderId}/accept_request`);
      toast.success('Order request accepted!');
      fetchOrders(); // Refresh data
    } catch (error) {
      toast.error('Failed to accept order request');
    }
  };

  const rejectOrderRequest = async (orderId) => {
    try {
      await api.post(`/driver/orders/${orderId}/reject_request`);
      toast.success('Order request rejected');
      fetchOrders(); // Refresh data
    } catch (error) {
      toast.error('Failed to reject order request');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.post(`/driver/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders(); // Refresh data
    } catch (error) {
      toast.error('Failed to update order status');
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

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'accepted': 'picked',
      'assigned': 'picked',
      'picked': 'delivering',
      'delivering': 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getStatusAction = (status) => {
    const actions = {
      'accepted': 'Mark as Picked',
      'assigned': 'Mark as Picked',
      'picked': 'Mark as Delivering',
      'delivering': 'Mark as Delivered'
    };
    return actions[status];
  };

  const filteredMyOrders = myOrders.filter(order => {
    const matchesSearch = order.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.drop_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/driver')}
            className="inline-flex items-center text-neutral-600 hover:text-primary-600 transition-colors duration-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Orders Management
              </h1>
              <p className="text-neutral-600">
                Manage your deliveries and find new opportunities
              </p>
            </div>
            <button
              onClick={fetchOrders}
              className="btn btn-outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="border-b border-neutral-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'available'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                Available Orders ({availableOrders.length})
              </button>
              {requestedOrders.length > 0 && (
                <button
                  onClick={() => setActiveTab('requested')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'requested'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  Requests ({requestedOrders.length})
                </button>
              )}
              <button
                onClick={() => setActiveTab('my-orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'my-orders'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                My Orders ({myOrders.length})
              </button>
            </nav>
          </div>
        </motion.div>

        {/* Search and Filter for My Orders */}
        {activeTab === 'my-orders' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 flex flex-col sm:flex-row gap-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full sm:w-48"
            >
              <option value="all">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="assigned">Assigned</option>
              <option value="picked">Picked</option>
              <option value="delivering">Delivering</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </motion.div>
        )}

        {/* Content based on active tab */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Available Orders Tab */}
          {activeTab === 'available' && (
            <div className="space-y-4">
              {availableOrders.length > 0 ? (
                availableOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-6 card-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-neutral-900">
                            Order #{order.id}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                            ₹{order.fare_total}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-primary-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-700">Pickup</p>
                              <p className="text-sm text-neutral-600">{order.pickup_address}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-secondary-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-700">Drop</p>
                              <p className="text-sm text-neutral-600">{order.drop_address}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-neutral-600">
                          <div className="flex items-center space-x-1">
                            <Navigation className="h-4 w-4" />
                            <span>
                              {order.pickup && order.drop ? 
                                Math.sqrt(
                                  Math.pow(order.drop[0] - order.pickup[0], 2) + 
                                  Math.pow(order.drop[1] - order.pickup[1], 2)
                                ).toFixed(1) : 'N/A'
                              }km
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>₹{order.fare_total} total</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => acceptOrder(order.id)}
                          className="btn btn-primary"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept Order
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="card p-12 text-center">
                  <Package className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Available Orders</h3>
                  <p className="text-neutral-600 mb-4">
                    Check back later for new delivery opportunities
                  </p>
                  <button
                    onClick={fetchOrders}
                    className="btn btn-primary"
                  >
                    Refresh Orders
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Requested Orders Tab */}
          {activeTab === 'requested' && (
            <div className="space-y-4">
              {requestedOrders.length > 0 ? (
                requestedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-6 border-l-4 border-l-warning-400"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-neutral-900">
                            Order #{order.id}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-800">
                            Customer Request
                          </span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                            ₹{order.fare_total}
                          </span>
                        </div>
                        
                        <p className="text-sm text-neutral-600 mb-3">
                          <strong>Customer:</strong> {order.customer_name}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-primary-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-700">Pickup</p>
                              <p className="text-sm text-neutral-600">{order.pickup_address}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-secondary-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-700">Drop</p>
                              <p className="text-sm text-neutral-600">{order.drop_address}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-neutral-600">
                          <div className="flex items-center space-x-1">
                            <Navigation className="h-4 w-4" />
                            <span>{order.distance_km}km</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => acceptOrderRequest(order.id)}
                          className="btn btn-primary"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept Request
                        </button>
                        <button
                          onClick={() => rejectOrderRequest(order.id)}
                          className="btn btn-outline"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="card p-12 text-center">
                  <Package className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Order Requests</h3>
                  <p className="text-neutral-600">
                    You don't have any pending order requests from customers
                  </p>
                </div>
              )}
            </div>
          )}

          {/* My Orders Tab */}
          {activeTab === 'my-orders' && (
            <div className="space-y-4">
              {filteredMyOrders.length > 0 ? (
                filteredMyOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-neutral-900">
                            Order #{order.id}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                            ₹{order.driver_share}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-primary-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-700">Pickup</p>
                              <p className="text-sm text-neutral-600">{order.pickup_address}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-secondary-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-700">Drop</p>
                              <p className="text-sm text-neutral-600">{order.drop_address}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-neutral-600">
                          <div className="flex items-center space-x-1">
                            <Navigation className="h-4 w-4" />
                            <span>{order.distance_km}km</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>₹{order.driver_share} earnings</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                            className="btn btn-primary"
                          >
                            {getStatusAction(order.status)}
                          </button>
                        )}
                        <button className="btn btn-ghost">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="card p-12 text-center">
                  <Package className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                    {searchTerm || statusFilter !== 'all' ? 'No matching orders' : 'No orders yet'}
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Start accepting orders to see them here'
                    }
                  </p>
                  {searchTerm || statusFilter !== 'all' ? (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="btn btn-outline"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('available')}
                      className="btn btn-primary"
                    >
                      View Available Orders
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default DriverOrders;