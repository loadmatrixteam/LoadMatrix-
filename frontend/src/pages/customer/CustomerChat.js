import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  MessageCircle, 
  User, 
  Bot, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const CustomerChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get('/customer/chat/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now(),
      message: messageText,
      is_from_admin: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await api.post('/customer/chat', {
        message: messageText
      });

      // Add auto-reply if available
      if (response.data.auto_reply) {
        const autoReply = {
          id: Date.now() + 1,
          message: response.data.auto_reply,
          is_from_admin: true,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, autoReply]);
      }

      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Remove the message from UI if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  const quickReplies = [
    { text: "Track my order", icon: "📦" },
    { text: "Pricing information", icon: "💰" },
    { text: "Cancel order", icon: "❌" },
    { text: "Delivery time", icon: "⏰" },
    { text: "Payment help", icon: "💳" },
    { text: "Contact support", icon: "📞" }
  ];

  const handleQuickReply = (text) => {
    setNewMessage(text);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Customer Support</h1>
                <p className="text-sm text-neutral-600">We're here to help you 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="btn btn-ghost p-2 sm:hidden touch-manipulation"
            >
              {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
            </button>
          </div>

          {/* Support Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="card p-3 sm:p-4 text-center">
              <Phone className="h-5 w-5 text-primary-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-neutral-900">Call Support</p>
              <p className="text-xs text-neutral-600">+91 98765 43210</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <Mail className="h-5 w-5 text-secondary-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-neutral-900">Email Support</p>
              <p className="text-xs text-neutral-600">loadmatrixteam@gmail.com</p>
            </div>
            <div className="card p-3 sm:p-4 text-center">
              <Clock className="h-5 w-5 text-accent-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-neutral-900">Response Time</p>
              <p className="text-xs text-neutral-600">Usually within 5 mins</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card overflow-hidden"
            >
              {/* Chat Messages */}
              <div className="h-96 sm:h-[500px] overflow-y-auto p-4 space-y-4 bg-neutral-50">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Welcome to Loadmatrix Support!</h3>
                    <p className="text-neutral-600 mb-4">How can we help you today?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickReply(reply.text)}
                          className="btn btn-ghost text-xs sm:text-sm p-2 touch-manipulation"
                        >
                          <span className="mr-1">{reply.icon}</span>
                          {reply.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.is_from_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-xs sm:max-w-md ${message.is_from_admin ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.is_from_admin 
                            ? 'bg-gradient-to-br from-secondary-500 to-accent-500' 
                            : 'bg-gradient-to-br from-primary-500 to-secondary-500'
                        }`}>
                          {message.is_from_admin ? (
                            <Bot className="h-4 w-4 text-white" />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                          message.is_from_admin
                            ? 'bg-white border border-neutral-200'
                            : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                        }`}>
                          <p className="text-sm sm:text-base">{message.message}</p>
                          <div className={`flex items-center justify-end mt-1 space-x-1 ${
                            message.is_from_admin ? 'text-neutral-500' : 'text-primary-100'
                          }`}>
                            <span className="text-xs">{formatTime(message.created_at)}</span>
                            {!message.is_from_admin && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length > 0 && (
                <div className="border-t border-neutral-200 p-3">
                  <p className="text-xs text-neutral-600 mb-2">Quick replies:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.slice(0, 4).map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickReply(reply.text)}
                        className="btn btn-ghost text-xs px-2 py-1 touch-manipulation"
                      >
                        <span className="mr-1">{reply.icon}</span>
                        {reply.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={sendMessage} className="border-t border-neutral-200 p-4">
                <div className="flex items-center space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="input flex-1 text-sm sm:text-base"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="btn btn-primary p-3 touch-manipulation"
                  >
                    {sending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Press Enter to send • Our team typically responds within 5 minutes
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Frequently Asked Questions</h3>
            <div className="space-y-3">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-neutral-700 hover:text-primary-600 touch-manipulation">
                  How do I track my order?
                  <span className="ml-2 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-sm text-neutral-600 pl-4">
                  You can track your order in real-time from the "Track Orders" section in your dashboard. 
                  You'll see the driver's location and estimated delivery time.
                </p>
              </details>
              
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-neutral-700 hover:text-primary-600 touch-manipulation">
                  What are your delivery charges?
                  <span className="ml-2 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-sm text-neutral-600 pl-4">
                  Our pricing is transparent: ₹30 base fare + ₹10 per km + ₹5 per kg. 
                  You'll see the exact fare before confirming your order.
                </p>
              </details>
              
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-neutral-700 hover:text-primary-600 touch-manipulation">
                  How long does delivery take?
                  <span className="ml-2 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-sm text-neutral-600 pl-4">
                  Delivery times depend on distance and driver availability. Typically, orders are picked up 
                  within 30 minutes and delivered based on the distance.
                </p>
              </details>
              
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-neutral-700 hover:text-primary-600 touch-manipulation">
                  Can I cancel my order?
                  <span className="ml-2 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-sm text-neutral-600 pl-4">
                  You can cancel orders that haven't been picked up yet from your orders page. 
                  For orders already in progress, please contact our support team.
                </p>
              </details>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default CustomerChat;