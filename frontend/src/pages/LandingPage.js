import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  MapPin, 
  DollarSign, 
  Zap, 
  Star,
  ArrowRight,
  Truck,
  Users
} from 'lucide-react';
import Layout from '../components/Layout/Layout';

const LandingPage = () => {
  const features = [
    {
      icon: Package,
      title: 'Easy Ordering',
      description: 'Create orders in seconds with our intuitive interface',
      color: 'from-primary-500 to-primary-600'
    },
    {
      icon: MapPin,
      title: 'Live Tracking',
      description: 'Track your package in real-time on interactive maps',
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      icon: DollarSign,
      title: 'Fair Pricing',
      description: 'Transparent pricing: ₹30 base + ₹10/km + ₹5/kg',
      color: 'from-accent-500 to-accent-600'
    },
    {
      icon: Zap,
      title: 'Fast Delivery',
      description: 'Quick pickup and delivery by verified drivers',
      color: 'from-success-500 to-success-600'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Create Order',
      description: 'Enter pickup and delivery details with package information'
    },
    {
      number: '02',
      title: 'Driver Accepts',
      description: 'Nearby drivers receive notification and accept your order'
    },
    {
      number: '03',
      title: 'Track & Receive',
      description: 'Monitor live location and receive your package safely'
    }
  ];

  const testimonials = [
    {
      name: 'Shlok',
      role: 'Business Owner',
      content: 'As a business owner, Loadmatrix has revolutionized our logistics operations. The platform is reliable and the drivers are professional.',
      rating: 5
    },
    {
      name: 'Vard Raut',
      role: 'Customer',
      content: 'I\'ve been using Loadmatrix for all my package deliveries and I\'m extremely satisfied. The real-time tracking gives me peace of mind.',
      rating: 5
    },
    {
      name: 'Aeya Waghmare',
      role: 'Driver',
      content: 'Working as a driver with Loadmatrix has been a great experience. Fair compensation and excellent support from the team.',
      rating: 5
    }
  ];

  const stats = [
    { number: '1000+', label: 'Active Drivers' },
    { number: '5000+', label: 'Deliveries' },
    { number: '98%', label: 'Satisfaction' },
    { number: '24/7', label: 'Support' }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6 lg:space-y-8 text-center lg:text-left"
            >
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-neutral-900 leading-tight"
                >
                  Fast & Reliable{' '}
                  <span className="gradient-text">Logistics</span>{' '}
                  Platform
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-2xl mx-auto lg:mx-0"
                >
                  Loadmatrix connects customers with professional drivers for seamless package delivery. 
                  Track your orders in real-time with our advanced GPS tracking system.
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link
                  to="/register"
                  className="btn btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 group touch-manipulation"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="btn btn-outline text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 touch-manipulation"
                >
                  Sign In
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 lg:pt-8"
              >
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                      {stat.number}
                    </div>
                    <div className="text-xs sm:text-sm text-neutral-600 mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative order-first lg:order-last"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                    className="card card-hover p-4 sm:p-6 group touch-manipulation"
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2 text-sm sm:text-base">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
              Get your packages delivered in three simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="relative mb-6 lg:mb-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold group-hover:scale-110 transition-transform duration-300 touch-manipulation">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 sm:top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-secondary-200 -translate-x-10"></div>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-3 lg:mb-4">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-neutral-600">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-neutral-600">
              Trusted by thousands of customers and drivers
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.8 }}
                viewport={{ once: true }}
                className="card p-8 text-center group hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex justify-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-warning-400 fill-current" />
                  ))}
                </div>
                <p className="text-neutral-600 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-neutral-900">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {testimonial.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6 lg:space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Ready to Get Started?
            </h2>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
              Join thousands of satisfied customers and drivers on Loadmatrix
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md sm:max-w-none mx-auto">
              <Link
                to="/register?role=customer"
                className="btn bg-white text-primary-600 hover:bg-neutral-100 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 group touch-manipulation"
              >
                <Users className="mr-2 h-5 w-5" />
                Register as Customer
              </Link>
              <Link
                to="/register?role=driver"
                className="btn bg-white/20 text-white border-2 border-white hover:bg-white hover:text-primary-600 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 group touch-manipulation"
              >
                <Truck className="mr-2 h-5 w-5" />
                Register as Driver
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default LandingPage;