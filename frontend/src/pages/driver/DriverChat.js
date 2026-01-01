import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  Headphones
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const DriverChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      type: 'system',
      message: 'Welcome to Loadmatrix Driver Support! How can we help you today?',
      timestamp: new Date().toISOString()
    }
  ]);

  const quickMessages = [
    'I need help with an order',
    'Payment issue',
    'Vehicle breakdown',
    'Customer complaint',
    'App technical issue',
    'Account verification'
  ];

  const supportInfo = [
    {
      icon: Phone,
      title: 'Call Support',
      description: '+91 98765 43210',
      action: 'tel:+919876543210'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'loadmatrixteam@gmail.com',
      action: 'mailto:loadmatrixteam@gmail.com'
    },
    {
      icon: Clock,
      title: 'Support Hours',
      description: '24/7 Available',
      action: null
    }
  ];

  const handleSendMessage = async (messageText = message) => {
    if (!messageText.trim()) return;

    setSending(true);
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: messageText,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');

    try {
      await api.post('/driver/chat', { message: messageText });
      
      // Add confirmation message
      const confirmMessage = {
        id: Date.now() + 1,
        type: 'system',
        message: 'Your message has been sent to our support team. We\'ll get back to you as soon as possible!',
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, confirmMessage]);
      toast.success('Message sent successfully!');
      
    } catch (error) {
      toast.error('Failed to send message');
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        message: 'Failed to send message. Please try again or contact support directly.',
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickMessage = (quickMsg) => {
    setMessage(quickMsg);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                Driver Support
              </h1>
              <p className="text-neutral-600">
                Get help from our support team
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Support Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Contact Methods */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Contact Support
              </h3>
              <div className="space-y-4">
                {supportInfo.map((info, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <info.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{info.title}</p>
                      {info.action ? (
                        <a
                          href={info.action}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          {info.description}
                        </a>
                      ) : (
                        <p className="text-sm text-neutral-600">{info.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Messages */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Quick Messages
              </h3>
              <div className="space-y-2">
                {quickMessages.map((quickMsg, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickMessage(quickMsg)}
                    className="w-full text-left p-3 text-sm bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors duration-200"
                  >
                    {quickMsg}
                  </button>
                ))}
              </div>
            </div>

            {/* Driver Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Your Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Name:</span>
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Role:</span>
                  <span className="font-medium capitalize">{user?.role}</span>
                </div>
                {user?.driver_id && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Driver ID:</span>
                    <span className="font-medium">#{user.driver_id}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="card h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Support Chat</h3>
                    <p className="text-sm text-success-600 flex items-center">
                      <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                      Online
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatHistory.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      chat.type === 'user' 
                        ? 'bg-primary-500 text-white' 
                        : chat.type === 'error'
                        ? 'bg-danger-100 text-danger-800 border border-danger-200'
                        : 'bg-neutral-100 text-neutral-900'
                    }`}>
                      <p className="text-sm">{chat.message}</p>
                      <p className={`text-xs mt-1 ${
                        chat.type === 'user' 
                          ? 'text-primary-100' 
                          : 'text-neutral-500'
                      }`}>
                        {new Date(chat.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm">Sending...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-neutral-200">
                <div className="flex space-x-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                    className="flex-1 resize-none border border-neutral-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows="2"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!message.trim() || sending}
                    className="btn btn-primary px-4 py-2 h-fit"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Frequently Asked Questions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">How do I update my location?</h4>
                <p className="text-sm text-neutral-600">
                  Use the "Update Location" button on your dashboard to share your current location with customers.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">When do I get paid?</h4>
                <p className="text-sm text-neutral-600">
                  Payments are processed weekly on Fridays. You'll receive 90% of the total fare for each completed delivery.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">How do I handle customer complaints?</h4>
                <p className="text-sm text-neutral-600">
                  Contact support immediately through this chat or call our support line. We'll help resolve any issues.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">Can I cancel an accepted order?</h4>
                <p className="text-sm text-neutral-600">
                  Contact support to cancel an order. Frequent cancellations may affect your driver rating.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default DriverChat;