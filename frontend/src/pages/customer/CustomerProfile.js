import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  DollarSign,
  Star,
  Edit3,
  Save,
  X,
  Camera,
  ArrowLeft,
  Shield,
  Award,
  TrendingUp,
  Clock
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const CustomerProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India'
  });

  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [profileResponse, imageResponse] = await Promise.all([
        api.get('/customer/profile'),
        api.get('/customer/profile/image')
      ]);

      const profileData = profileResponse.data;
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zip_code: profileData.zip_code || '',
        country: profileData.country || 'India'
      });

      setProfileImage(imageResponse.data.profile_image);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/customer/profile', formData);
      
      // Update the profile state
      setProfile(prev => ({
        ...prev,
        ...formData
      }));

      // Update the auth context if name changed
      if (formData.name !== user.name) {
        updateUser({ ...user, name: formData.name });
      }

      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: profile.name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      zip_code: profile.zip_code || '',
      country: profile.country || 'India'
    });
    setEditing(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setUploadingImage(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await api.post('/customer/profile/image', {
            image: reader.result
          });
          
          setProfileImage(reader.result);
          toast.success('Profile image updated successfully!');
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to update profile image');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await api.post('/customer/profile/remove_image');
      setProfileImage(null);
      toast.success('Profile image removed successfully!');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove profile image');
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLoyaltyLevel = (points) => {
    if (points >= 1000) return { level: 'Platinum', color: 'text-purple-600 bg-purple-100' };
    if (points >= 500) return { level: 'Gold', color: 'text-warning-600 bg-warning-100' };
    if (points >= 100) return { level: 'Silver', color: 'text-neutral-600 bg-neutral-100' };
    return { level: 'Bronze', color: 'text-accent-600 bg-accent-100' };
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

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="card p-6 sm:p-8 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Profile Not Found</h2>
            <p className="text-neutral-600 mb-4">
              Unable to load your profile information.
            </p>
            <Link to="/customer" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const loyaltyInfo = getLoyaltyLevel(profile.loyalty_points);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
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
                My Profile
              </h1>
              <p className="text-sm sm:text-base text-neutral-600">
                Manage your account information and preferences
              </p>
            </div>
            
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-primary touch-manipulation"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="card p-6">
              {/* Profile Image */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                      {getInitials(profile.name)}
                    </div>
                  )}
                  
                  {/* Image Upload Button */}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors duration-200 shadow-lg">
                    <Camera className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
                
                <h2 className="text-xl font-semibold text-neutral-900 mt-4">
                  {profile.name}
                </h2>
                <p className="text-sm text-neutral-600">
                  Customer ID: #{profile.customer_id}
                </p>
                
                {profileImage && (
                  <button
                    onClick={handleRemoveImage}
                    className="text-xs text-danger-600 hover:text-danger-700 mt-2"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Loyalty Status */}
              <div className="text-center p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Award className="h-5 w-5 text-primary-600" />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${loyaltyInfo.color}`}>
                    {loyaltyInfo.level} Member
                  </span>
                </div>
                <p className="text-sm text-neutral-600">
                  {profile.loyalty_points} Loyalty Points
                </p>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-success-600" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Total Orders</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {profile.total_orders}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Total Spent</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    ₹{profile.total_spent.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-accent-600" />
                    </div>
                    <span className="text-sm font-medium text-neutral-900">Member Since</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {formatDate(profile.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Personal Information */}
            <div className="card">
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary-500" />
                    Personal Information
                  </h3>
                  {editing && (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="btn btn-ghost text-sm touch-manipulation"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary text-sm touch-manipulation"
                      >
                        {saving ? (
                          <LoadingSpinner size="sm" className="mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Full Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-neutral-900 py-2">{profile.name || 'Not provided'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center space-x-2 py-2">
                      <Mail className="h-4 w-4 text-neutral-500" />
                      <span className="text-neutral-900">{profile.email}</span>
                      <Shield className="h-4 w-4 text-success-500" title="Verified" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Phone Number
                    </label>
                    {editing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 py-2">
                        <Phone className="h-4 w-4 text-neutral-500" />
                        <span className="text-neutral-900">{profile.phone || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Customer ID
                    </label>
                    <div className="flex items-center space-x-2 py-2">
                      <span className="text-neutral-900 font-mono">#{profile.customer_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="card">
              <div className="p-6 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-secondary-500" />
                  Address Information
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Street Address
                    </label>
                    {editing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="input"
                        rows="2"
                        placeholder="Enter your street address"
                      />
                    ) : (
                      <p className="text-neutral-900 py-2">{profile.address || 'Not provided'}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        City
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="input"
                          placeholder="City"
                        />
                      ) : (
                        <p className="text-neutral-900 py-2">{profile.city || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        State
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="input"
                          placeholder="State"
                        />
                      ) : (
                        <p className="text-neutral-900 py-2">{profile.state || 'Not provided'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        ZIP Code
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="zip_code"
                          value={formData.zip_code}
                          onChange={handleInputChange}
                          className="input"
                          placeholder="ZIP Code"
                        />
                      ) : (
                        <p className="text-neutral-900 py-2">{profile.zip_code || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Country
                    </label>
                    {editing ? (
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="input"
                      >
                        <option value="India">India</option>
                        <option value="USA">United States</option>
                        <option value="UK">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                      </select>
                    ) : (
                      <p className="text-neutral-900 py-2">{profile.country || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="card">
              <div className="p-6 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-accent-500" />
                  Account Statistics
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-lg">
                    <Package className="h-8 w-8 text-success-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-success-900">{profile.total_orders}</p>
                    <p className="text-sm text-success-700">Total Orders</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
                    <DollarSign className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-primary-900">₹{profile.total_spent.toFixed(0)}</p>
                    <p className="text-sm text-primary-700">Total Spent</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg">
                    <Star className="h-8 w-8 text-warning-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-warning-900">{profile.loyalty_points}</p>
                    <p className="text-sm text-warning-700">Loyalty Points</p>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg">
                    <Clock className="h-8 w-8 text-accent-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-accent-900">
                      {profile.last_order_date ? formatDate(profile.last_order_date) : 'No orders yet'}
                    </p>
                    <p className="text-sm text-accent-700">Last Order</p>
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

export default CustomerProfile;