import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Truck, 
  Star,
  ArrowLeft,
  Save,
  Camera,
  MapPin,
  Award
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const DriverProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_type: '',
    vehicle_number: '',
    is_available: true,
    is_verified: false,
    total_deliveries: 0,
    total_earnings: 0,
    rating: 0,
    rating_count: 0,
    current_lat: null,
    current_lng: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/driver/profile');
      setProfile(response.data);
      
      // Also get profile image if available
      try {
        const imageResponse = await api.get('/customer/profile/image');
        if (imageResponse.data.profile_image) {
          setImagePreview(imageResponse.data.profile_image);
        }
      } catch (error) {
        // No profile image or error fetching it
      }
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size should be less than 2MB');
        return;
      }
      
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update profile
      await api.put('/driver/profile', {
        name: profile.name,
        phone: profile.phone,
        license_number: profile.license_number,
        vehicle_type: profile.vehicle_type,
        vehicle_number: profile.vehicle_number
      });

      // Update profile image if changed
      if (profileImage) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await api.post('/customer/profile/image', {
              image: reader.result
            });
          } catch (error) {
            console.log('Failed to update profile image');
          }
        };
        reader.readAsDataURL(profileImage);
      }

      // Update user context
      updateUser({
        ...user,
        name: profile.name
      });

      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const removeProfileImage = async () => {
    try {
      await api.post('/customer/profile/remove_image');
      setImagePreview(null);
      setProfileImage(null);
      toast.success('Profile image removed');
    } catch (error) {
      toast.error('Failed to remove profile image');
    }
  };

  const vehicleTypes = [
    'Motorcycle',
    'Scooter',
    'Car',
    'Van',
    'Truck',
    'Bicycle',
    'Other'
  ];

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Driver Profile
          </h1>
          <p className="text-neutral-600">
            Manage your profile information and vehicle details
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 text-center">
              {/* Profile Image */}
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-white" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-neutral-50 transition-colors duration-200">
                  <Camera className="h-4 w-4 text-neutral-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                {profile.name}
              </h3>
              <p className="text-sm text-neutral-600 mb-4">
                Driver ID: #{profile.driver_id}
              </p>

              {imagePreview && (
                <button
                  onClick={removeProfileImage}
                  className="text-sm text-danger-600 hover:text-danger-700 mb-4"
                >
                  Remove Image
                </button>
              )}

              {/* Verification Status */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                profile.is_verified 
                  ? 'bg-success-100 text-success-800' 
                  : 'bg-warning-100 text-warning-800'
              }`}>
                <Award className="h-4 w-4 mr-1" />
                {profile.is_verified ? 'Verified Driver' : 'Pending Verification'}
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Total Deliveries</span>
                  <span className="font-semibold text-neutral-900">{profile.total_deliveries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Total Earnings</span>
                  <span className="font-semibold text-success-600">₹{profile.total_earnings.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-warning-400 fill-current" />
                    <span className="font-semibold text-neutral-900">
                      {profile.rating.toFixed(1)} ({profile.rating_count})
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Joined</span>
                  <span className="font-semibold text-neutral-900">
                    {new Date().getFullYear()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-primary-500" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={profile.name}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      className="input bg-neutral-50"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={profile.license_number}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter your license number"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                  <Truck className="h-5 w-5 mr-2 text-secondary-500" />
                  Vehicle Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Vehicle Type
                    </label>
                    <select
                      name="vehicle_type"
                      value={profile.vehicle_type}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="">Select vehicle type</option>
                      {vehicleTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      name="vehicle_number"
                      value={profile.vehicle_number}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter vehicle number"
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              {(profile.current_lat && profile.current_lng) && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-accent-500" />
                    Current Location
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={profile.current_lat?.toFixed(6) || 'Not available'}
                        className="input bg-neutral-50"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={profile.current_lng?.toFixed(6) || 'Not available'}
                        className="input bg-neutral-50"
                        disabled
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-neutral-600 mt-2">
                    Location is updated when you use the "Update Location" feature on your dashboard.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/driver')}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </div>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default DriverProfile;