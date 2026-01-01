from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from ..database import db
from ..models import User, Driver, Order, OrderStatus
from ..utils.security import role_required
from ..utils.validators import validate_lat_lng
from flask_mail import Message
from datetime import datetime
import logging

driver_bp = Blueprint('driver', __name__)

@driver_bp.get('/orders/available')
@role_required('driver')
def available_orders():
    try:
        # simple: list pending orders
        orders = Order.query.filter_by(status=OrderStatus.PENDING.value).all()
        return jsonify([{ 
            "id": order.id, 
            "pickup": [order.pickup_lat or 0, order.pickup_lng or 0], 
            "drop": [order.drop_lat or 0, order.drop_lng or 0], 
            "pickup_address": order.pickup_address or "",
            "drop_address": order.drop_address or "",
            "fare_total": order.fare_total or 0
        } for order in orders] ), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error fetching available orders: {str(e)}")
        return jsonify({"message": "Unable to fetch available orders"}), 400, { "Content-Type": "application/json; charset=utf-8" }

@driver_bp.get('/orders')
@role_required('driver')
def all_orders():
    try:
        # Get all orders assigned to this driver
        # Get user ID from JWT identity (now a string)
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }

        orders = Order.query.filter_by(driver_id=driver.id).all()
        return jsonify([{
            "id": order.id,
            "status": order.status,
            "pickup_address": order.pickup_address or "",
            "drop_address": order.drop_address or "",
            "distance_km": order.distance_km or 0,
            "fare_total": order.fare_total or 0,
            "driver_share": order.driver_share or 0,
            "created_at": order.created_at.isoformat() if order.created_at else None
        } for order in orders]), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error fetching all orders: {str(e)}")
        return jsonify({"message": "Unable to fetch orders"}), 400, { "Content-Type": "application/json; charset=utf-8" }

# NEW: Get requested orders for a driver
@driver_bp.get('/orders/requested/<int:driver_id>')
@role_required('driver')
def get_requested_orders(driver_id):
    """Get all orders with status 'requested' for a specific driver"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        # Verify the driver ID matches the authenticated driver
        if driver.driver_id != driver_id:
            return jsonify({"message": "Unauthorized access to driver orders"}), 403, { "Content-Type": "application/json; charset=utf-8" }
            
        # Get requested orders for this driver
        orders = Order.query.filter_by(
            driver_id=driver.id,
            status=OrderStatus.REQUESTED.value
        ).all()
        
        # Format the response
        result = []
        for order in orders:
            result.append({
                "id": order.id,
                "customer_name": order.customer.user.name if order.customer and order.customer.user else "Unknown",
                "pickup_address": order.pickup_address or "",
                "drop_address": order.drop_address or "",
                "distance_km": order.distance_km or 0,
                "fare_total": order.fare_total or 0,
                "created_at": order.created_at.isoformat() if order.created_at else None
            })
            
        return jsonify(result), 200, { "Content-Type": "application/json; charset=utf-8" }
        
    except Exception as e:
        current_app.logger.error(f"Error fetching requested orders: {str(e)}")
        return jsonify({"message": "Unable to fetch requested orders"}), 400, { "Content-Type": "application/json; charset=utf-8" }

@driver_bp.post('/orders/<int:order_id>/accept')
@role_required('driver')
def accept_order(order_id):
    try:
        # Get user ID from JWT identity (now a string)
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }

        order = Order.query.get(order_id)
        if not order:
            return jsonify({"message": "Order not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        if order.status != OrderStatus.PENDING.value:
            return jsonify({"message": "Order not available"}), 400, { "Content-Type": "application/json; charset=utf-8" }
            
        order.driver_id = driver.id
        order.status = OrderStatus.ASSIGNED.value
        db.session.commit()
        return jsonify({"message": "Accepted", "order_id": order.id}), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error accepting order: {str(e)}")
        return jsonify({"message": "Unable to accept order"}), 400, { "Content-Type": "application/json; charset=utf-8" }

@driver_bp.post('/location')
@role_required('driver')
def update_location():
    try:
        data = request.get_json() or {}
        if not validate_lat_lng(data.get('lat'), data.get('lng')):
            return jsonify({"message": "Invalid coordinates"}), 400, { "Content-Type": "application/json; charset=utf-8" }
        
        # Get user ID from JWT identity (now a string)
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
        
        # Update location and online status
        driver.current_lat = float(data.get('lat', 0))
        driver.current_lng = float(data.get('lng', 0))
        driver.is_online = True  # Mark driver as online when location is updated
        driver.last_location_update = datetime.utcnow()  # Track when location was last updated
        
        db.session.commit()
        return jsonify({
            "message": "Location updated", 
            "is_online": driver.is_online,
            "timestamp": driver.last_location_update.isoformat()
        }), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error updating location: {str(e)}")
        return jsonify({"message": "Unable to update location"}), 400, { "Content-Type": "application/json; charset=utf-8" }

# New endpoint to set driver offline
@driver_bp.post('/offline')
@role_required('driver')
def set_offline():
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
        
        # Set driver offline
        driver.is_online = False
        db.session.commit()
        
        return jsonify({
            "message": "Driver set to offline", 
            "is_online": driver.is_online
        }), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error setting driver offline: {str(e)}")
        return jsonify({"message": "Unable to set offline"}), 400, { "Content-Type": "application/json; charset=utf-8" }

@driver_bp.post('/orders/<int:order_id>/status')
@role_required('driver')
def update_status(order_id):
    try:
        data = request.get_json() or {}
        status = data.get('status')
        if status not in [s.value for s in OrderStatus]:
            return jsonify({"message": "Invalid status"}), 400, { "Content-Type": "application/json; charset=utf-8" }
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"message": "Order not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        order.status = status
        db.session.commit()
        return jsonify({"message": "Status updated"}), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error updating status: {str(e)}")
        return jsonify({"message": "Unable to update status"}), 400, { "Content-Type": "application/json; charset=utf-8" }

@driver_bp.get('/earnings')
@role_required('driver')
def earnings():
    try:
        # Get user ID from JWT identity (now a string)
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
        
        delivered = [o for o in driver.orders if o.status == OrderStatus.DELIVERED.value]
        total = sum(o.driver_share for o in delivered)
        return jsonify({"delivered_count": len(delivered), "total_earnings": round(total,2)}), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error fetching earnings: {str(e)}")
        return jsonify({"message": "Unable to fetch earnings"}), 400, { "Content-Type": "application/json; charset=utf-8" }

@driver_bp.post('/chat')
@role_required('driver')
def driver_chat():
    try:
        data = request.get_json() or {}
        message = data.get('message')
        
        if not message:
            return jsonify({"message": "Message is required"}), 400, { "Content-Type": "application/json; charset=utf-8" }
        
        # Get user ID from JWT identity (now a string)
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
        
        # Send message to admin email
        try:
            mail = current_app.extensions['mail']
            msg = Message(
                subject=f"Driver Support Chat - {user.email}",
                recipients=['loadmatrixteam@gmail.com'],
                body=f"""
Driver: {user.name} ({user.email})
Message: {message}

This message was sent from the driver support chatbot.
                """
            )
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Failed to send chat message email: {str(e)}")
        
        return jsonify({"message": "Message sent successfully"}), 200, { "Content-Type": "application/json; charset=utf-8" }
    except Exception as e:
        current_app.logger.error(f"Error sending chat message: {str(e)}")
        return jsonify({"message": "Unable to send message"}), 400, { "Content-Type": "application/json; charset=utf-8" }

# NEW: Accept order request
@driver_bp.post('/orders/<int:order_id>/accept_request')
@role_required('driver')
def accept_order_request(order_id):
    """Accept a driver request for an order"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        # Get the order
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"message": "Order not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        # Check if order is in requested status
        if order.status != OrderStatus.REQUESTED.value:
            return jsonify({"message": "Order is not in requested status"}), 400, { "Content-Type": "application/json; charset=utf-8" }
            
        # Check if this driver is assigned to the order
        if order.driver_id != driver.id:
            return jsonify({"message": "You are not assigned to this order"}), 403, { "Content-Type": "application/json; charset=utf-8" }
            
        # Update order status to accepted
        order.status = OrderStatus.ACCEPTED.value
        db.session.commit()
        
        return jsonify({
            "message": "Order request accepted successfully",
            "order_id": order.id
        }), 200, { "Content-Type": "application/json; charset=utf-8" }
        
    except Exception as e:
        current_app.logger.error(f"Error accepting order request: {str(e)}")
        return jsonify({"message": "Unable to accept order request"}), 400, { "Content-Type": "application/json; charset=utf-8" }

# NEW: Reject order request
@driver_bp.post('/orders/<int:order_id>/reject_request')
@role_required('driver')
def reject_order_request(order_id):
    """Reject a driver request for an order"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        # Get the order
        order = Order.query.get(order_id)
        if not order:
            return jsonify({"message": "Order not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        # Check if order is in requested status
        if order.status != OrderStatus.REQUESTED.value:
            return jsonify({"message": "Order is not in requested status"}), 400, { "Content-Type": "application/json; charset=utf-8" }
            
        # Check if this driver is assigned to the order
        if order.driver_id != driver.id:
            return jsonify({"message": "You are not assigned to this order"}), 403, { "Content-Type": "application/json; charset=utf-8" }
            
        # Update order status back to pending
        order.status = OrderStatus.PENDING.value
        order.driver_id = None
        db.session.commit()
        
        return jsonify({
            "message": "Order request rejected successfully",
            "order_id": order.id
        }), 200, { "Content-Type": "application/json; charset=utf-8" }
        
    except Exception as e:
        current_app.logger.error(f"Error rejecting order request: {str(e)}")
        return jsonify({"message": "Unable to reject order request"}), 400, { "Content-Type": "application/json; charset=utf-8" }

# NEW: Get driver profile information
@driver_bp.get('/profile')
@role_required('driver')
def get_driver_profile():
    """Get driver profile information"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401, { "Content-Type": "application/json; charset=utf-8" }
        
        # Get user from database
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
            
        # Get driver profile
        driver = getattr(user, 'driver_profile', None)
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404, { "Content-Type": "application/json; charset=utf-8" }
        
        # Return driver profile information with safe handling of None values
        profile_data = {
            "id": getattr(driver, 'id', None) or 0,
            "driver_id": getattr(driver, 'driver_id', None) or 0,
            "name": getattr(user, 'name', "") or "",
            "email": getattr(user, 'email', "") or "",
            "phone": getattr(driver, 'phone', "") or "",
            "license_number": getattr(driver, 'license_number', "") or "",
            "vehicle_type": getattr(driver, 'vehicle_type', "") or "",
            "vehicle_number": getattr(driver, 'vehicle_number', "") or "",
            "is_available": getattr(driver, 'is_available', False),
            "is_verified": getattr(driver, 'is_verified', False),
            "is_online": getattr(driver, 'is_online', False),
            "last_location_update": getattr(driver, 'last_location_update', None),
            "total_deliveries": getattr(driver, 'total_deliveries', 0) or 0,
            "total_earnings": getattr(driver, 'total_earnings', 0.0) or 0.0,
            "rating": getattr(driver, 'rating', 0.0) or 0.0,
            "rating_count": getattr(driver, 'rating_count', 0) or 0,
            "current_lat": getattr(driver, 'current_lat', None) or 0.0,
            "current_lng": getattr(driver, 'current_lng', None) or 0.0
        }
        
        return jsonify(profile_data), 200, { "Content-Type": "application/json; charset=utf-8" }
        
    except Exception as e:
        current_app.logger.error(f"PROFILE ERROR: {str(e)}")
        return jsonify({"message": "Unable to load profile"}), 400, { "Content-Type": "application/json; charset=utf-8" }

# NEW: Update driver profile
@driver_bp.put('/profile')
@role_required('driver')
def update_driver_profile():
    """Update driver profile information"""
    try:
        from flask_jwt_extended import get_jwt_identity
        from ..models import User, Driver
        
        data = request.get_json() or {}
        
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        
        # Check if user_id is valid
        if not user_id:
            return jsonify({"message": "Unauthorized"}), 401
        
        # Get user from database
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        driver = user.driver_profile
        
        if not driver:
            return jsonify({"message": "Driver profile not found"}), 404
            
        # Update user information
        if "name" in data:
            user.name = data["name"]
            
        # Update driver information
        if "phone" in data:
            driver.phone = data["phone"]
        if "license_number" in data:
            driver.license_number = data["license_number"]
        if "vehicle_type" in data:
            driver.vehicle_type = data["vehicle_type"]
        if "vehicle_number" in data:
            driver.vehicle_number = data["vehicle_number"]
            
        db.session.commit()
        
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in update_driver_profile: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500
