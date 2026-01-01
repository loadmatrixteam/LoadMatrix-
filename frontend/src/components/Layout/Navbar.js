import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut, 
  Truck,
  ChevronDown,
  Home,
  Package,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Close mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const getProfileLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'customer':
        return '/customer';
      case 'driver':
        return '/driver';
      case 'admin':
        return '/admin';
      default:
        return '/';
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getNavigationItems = () => {
    if (!isAuthenticated) return [];
    
    const baseItems = [
      { icon: Home, label: 'Dashboard', path: getProfileLink() },
      { icon: Settings, label: 'Profile', path: `${getProfileLink()}/profile` }
    ];

    if (user?.role === 'customer') {
      baseItems.splice(1, 0, 
        { icon: Package, label: 'Create Order', path: '/customer/create-order' },
        { icon: Package, label: 'Track Orders', path: '/customer/track-order' },
        { icon: MessageCircle, label: 'Support', path: '/customer/chat' }
      );
    } else if (user?.role === 'driver') {
      baseItems.splice(1, 0,
        { icon: Package, label: 'Orders', path: '/driver/orders' },
        { icon: MessageCircle, label: 'Support', path: '/driver/chat' }
      );
    } else if (user?.role === 'admin') {
      baseItems.splice(1, 0,
        { icon: User, label: 'Manage Users', path: '/admin/manage-users' }
      );
    }

    return baseItems;
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg group-hover:scale-105 transition-transform duration-200">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold gradient-text">Loadmatrix</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {getUserInitials()}
                  </div>
                  <span className="text-sm font-medium text-neutral-700 max-w-32 truncate">
                    {user?.name}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50"
                    >
                      {getNavigationItems().map((item, index) => (
                        <Link
                          key={index}
                          to={item.path}
                          className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors duration-200"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Link>
                      ))}
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="btn btn-ghost text-sm px-4 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary text-sm px-4 py-2"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200 touch-manipulation"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-neutral-600" />
              ) : (
                <Menu className="h-6 w-6 text-neutral-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-neutral-200 py-4 bg-white"
            >
              {isAuthenticated ? (
                <div className="space-y-1">
                  {/* User Info */}
                  <div className="flex items-center space-x-3 px-4 py-3 bg-neutral-50 rounded-lg mx-2 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {getUserInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{user?.name}</p>
                      <p className="text-sm text-neutral-500 capitalize">{user?.role}</p>
                    </div>
                  </div>

                  {/* Navigation Items */}
                  {getNavigationItems().map((item, index) => (
                    <Link
                      key={index}
                      to={item.path}
                      className="flex items-center px-4 py-3 text-neutral-700 hover:bg-neutral-100 transition-colors duration-200 touch-manipulation"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5 mr-3 text-neutral-500" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-danger-600 hover:bg-danger-50 transition-colors duration-200 touch-manipulation"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-neutral-700 hover:bg-neutral-100 transition-colors duration-200 font-medium touch-manipulation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 text-neutral-700 hover:bg-neutral-100 transition-colors duration-200 font-medium touch-manipulation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;