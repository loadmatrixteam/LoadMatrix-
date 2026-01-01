import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  Plus, 
  MapPin, 
  Clock, 
  DollarSign,
  TrendingUp,
  Eye,
  MessageCircle
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    activeOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersResponse, profileResponse] = await Promise.all([
        api.get('/customer/orders'),
        api.get('/customer/profile')
      ]);

      const ordersData = ordersResponse.data;
      const profileData = profileResponse.data;

      setOrders(ordersData.slice(0, 5)); // Show only recent 5 orders
      
      setStats({
        totalOrders: profileData.total_orders || 0,
        totalSpent: profileData.total_spent || 0,
        activeOrders: ordersData.filter(order => 
          ['pending', 'pending_driver_selection', 'requested', 'accepted', 'assigned', 'picked', 'delivering'].includes(order.status)
        ).length,
        completedOrders: ordersData.filter(order => order.status === 'delivered').length
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-warning-100 text-warning-800',
      pending_driver_selection: 'bg-secondary-100 text-secondary-800',
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
    const statusMap = {
      pending: 'Pending',
      pending_driver_selection: 'Select Driver',
      requested: 'Driver Requested',
      accepted: 'Accepted',
      assigned: 'Assigned',
      picked: 'Picked Up',
      delivering: 'Delivering',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            Manage your deliveries and track your packages
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8"
        >
          <div className="card p-3 sm:p-6 card-hover touch-manipulation">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-600">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-neutral-900">{stats.totalOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6 card-hover touch-manipulation">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-600">Total Spent</p>
                <p className="text-lg sm:text-2xl font-bold text-neutral-900">₹{stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6 card-hover touch-manipulation">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-600">Active Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-neutral-900">{stats.activeOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6 card-hover touch-manipulation">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-neutral-600">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-neutral-900">{stats.completedOrders}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-accent-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <Link
            to="/customer/create-order"
            className="card p-4 sm:p-6 card-hover group cursor-pointer bg-gradient-to-br from-primary-500 to-primary-600 text-white touch-manipulation"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Create New Order</h3>
                <p className="text-sm text-primary-100">Send a package quickly and easily</p>
              </div>
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Link
              to="/customer/track-order"
              className="card p-4 sm:p-6 card-hover group cursor-pointer touch-manipulation"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1 sm:mb-2">Track Orders</h3>
                  <p className="text-sm text-neutral-600">Monitor your deliveries in real-time</p>
                </div>
                <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-secondary-500 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </Link>

            <Link
              to="/customer/chat"
              className="card p-4 sm:p-6 card-hover group cursor-pointer touch-manipulation"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1 sm:mb-2">Support Chat</h3>
                  <p className="text-sm text-neutral-600">Get help from our support team</p>
                </div>
                <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-accent-500 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900">Recent Orders</h2>
              <Link
                to="/customer/orders"
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
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center justify-between p-3 sm:p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors duration-200 touch-manipulation"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                        <span className="font-medium text-neutral-900 text-sm sm:text-base truncate">
                          Order #{order.id}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} whitespace-nowrap`}>
                          {formatStatus(order.status)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">
                        Distance: {order.distance_km}km • Fare: ₹{order.fare_total}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Action Button */}
                    {order.status === 'pending_driver_selection' ? (
                      <Link
                        to={`/customer/select-driver?order_id=${order.id}`}
                        className="btn btn-primary text-sm ml-2 touch-manipulation"
                      >
                        Select Driver
                      </Link>
                    ) : (
                      <Link
                        to={`/customer/track-order?id=${order.id}`}
                        className="btn btn-ghost p-2 ml-2 touch-manipulation"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No orders yet</h3>
                <p className="text-neutral-600 mb-4">
                  Create your first order to get started
                </p>
                <Link
                  to="/customer/create-order"
                  className="btn btn-primary"
                >
                  Create Order
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;