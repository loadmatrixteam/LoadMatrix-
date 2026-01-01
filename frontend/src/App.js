import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CreateOrder from './pages/customer/CreateOrder';
import SelectDriver from './pages/customer/SelectDriver';
import TrackOrder from './pages/customer/TrackOrder';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerChat from './pages/customer/CustomerChat';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverOrders from './pages/driver/DriverOrders';
import DriverProfile from './pages/driver/DriverProfile';
import DriverChat from './pages/driver/DriverChat';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import AdminProfile from './pages/admin/AdminProfile';

// Create router with v7 future flag
const router = createBrowserRouter([
  // Public Routes
  {
    path: "/",
    element: <LandingPage />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />
  },
  
  // Customer Routes
  {
    path: "/customer",
    element: (
      <ProtectedRoute allowedRoles={['customer']}>
        <CustomerDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/customer/create-order",
    element: (
      <ProtectedRoute allowedRoles={['customer']}>
        <CreateOrder />
      </ProtectedRoute>
    )
  },
  {
    path: "/customer/select-driver",
    element: (
      <ProtectedRoute allowedRoles={['customer']}>
        <SelectDriver />
      </ProtectedRoute>
    )
  },
  {
    path: "/customer/track-order",
    element: (
      <ProtectedRoute allowedRoles={['customer']}>
        <TrackOrder />
      </ProtectedRoute>
    )
  },
  {
    path: "/customer/profile",
    element: (
      <ProtectedRoute allowedRoles={['customer']}>
        <CustomerProfile />
      </ProtectedRoute>
    )
  },
  {
    path: "/customer/chat",
    element: (
      <ProtectedRoute allowedRoles={['customer']}>
        <CustomerChat />
      </ProtectedRoute>
    )
  },
  
  // Driver Routes
  {
    path: "/driver",
    element: (
      <ProtectedRoute allowedRoles={['driver']}>
        <DriverDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/driver/orders",
    element: (
      <ProtectedRoute allowedRoles={['driver']}>
        <DriverOrders />
      </ProtectedRoute>
    )
  },
  {
    path: "/driver/profile",
    element: (
      <ProtectedRoute allowedRoles={['driver']}>
        <DriverProfile />
      </ProtectedRoute>
    )
  },
  {
    path: "/driver/chat",
    element: (
      <ProtectedRoute allowedRoles={['driver']}>
        <DriverChat />
      </ProtectedRoute>
    )
  },
  
  // Admin Routes
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/admin/manage-users",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <ManageUsers />
      </ProtectedRoute>
    )
  },
  {
    path: "/admin/profile",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminProfile />
      </ProtectedRoute>
    )
  },
  
  // Catch all route
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
], {
  future: {
    v7_startTransition: true,  // ✅ Opt-in early for React Router v7
    v7_relativeSplatPath: true, // ✅ Fix relative path resolution in splat routes
  },
});

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-neutral-50">
        <RouterProvider router={router} />
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;