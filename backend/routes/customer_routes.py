from flask import Blueprint, request, jsonify, current_app, render_template
from flask_jwt_extended import get_jwt_identity
from ..database import db
from ..models import User, Customer, Driver, Order, OrderStatus, Payment
from ..utils.security import role_required
from ..utils.validators import require_fields, validate_lat_lng
from ..utils.pricing import haversine_km, compute_fare
from flask_mail import Message
import logging
from datetime import datetime
import random
import string

customer_bp = Blueprint('customer', __name__)

# Add chatbot endpoint
@customer_bp.post('/chat')
@role_required('customer')
def customer_chat():
    try:
        data = request.get_json() or {}
        message = data.get('message')
        
        if not message or not message.strip():
            return jsonify({"message": "Message is required"}), 400
        
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Import ChatMessage here to avoid circular imports
        from ..models import ChatMessage
        
        # Save message to database
        chat_message = ChatMessage(
            user_id=user.id,
            message=message.strip(),
            is_from_admin=False
        )
        db.session.add(chat_message)
        db.session.commit()
        
        # Send message to admin email
        try:
            mail = current_app.extensions['mail']
            msg = Message(
                subject=f"Customer Support Chat - {user.email}",
                recipients=['loadmatrixteam@gmail.com'],
                body=f"""
Customer: {user.name} ({user.email})
Message: {message}

This message was sent from the customer support chat.
Reply to this email or use the admin panel to respond.
                """
            )
            mail.send(msg)
            logging.info(f"Chat message sent from customer {user.email}")
        except Exception as e:
            current_app.logger.error(f"Failed to send chat message email: {str(e)}")
        
        # Auto-reply with helpful information
        auto_reply = get_auto_reply(message.lower())
        if auto_reply:
            admin_message = ChatMessage(
                user_id=user.id,
                message=auto_reply,
                is_from_admin=True,
                is_read=True
            )
            db.session.add(admin_message)
            db.session.commit()
        
        return jsonify({
            "message": "Message sent successfully",
            "auto_reply": auto_reply
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in customer chat: {str(e)}")
        return jsonify({"message": "Error sending message"}), 500

@customer_bp.get('/chat/messages')
@role_required('customer')
def get_chat_messages():
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Import ChatMessage here to avoid circular imports
        from ..models import ChatMessage
        
        # Get all messages for this user
        messages = ChatMessage.query.filter_by(user_id=user.id).order_by(ChatMessage.created_at.asc()).all()
        
        message_data = []
        for msg in messages:
            message_data.append({
                "id": msg.id,
                "message": msg.message,
                "is_from_admin": msg.is_from_admin,
                "is_read": msg.is_read,
                "created_at": msg.created_at.isoformat()
            })
        
        # Mark all admin messages as read
        ChatMessage.query.filter_by(user_id=user.id, is_from_admin=True, is_read=False).update({"is_read": True})
        db.session.commit()
        
        return jsonify(message_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching chat messages: {str(e)}")
        return jsonify({"message": "Error fetching messages"}), 500

def get_auto_reply(message_lower):
    """Generate auto-reply based on message content"""
    
    # Common questions and responses
    if any(word in message_lower for word in ['track', 'tracking', 'where', 'location']):
        return "You can track your order in real-time from the 'Track Orders' section in your dashboard. If you need immediate assistance, our support team will respond shortly."
    
    elif any(word in message_lower for word in ['cancel', 'cancellation']):
        return "To cancel an order, please go to your orders page and click the cancel button if the order hasn't been picked up yet. For orders already in progress, please contact our support team."
    
    elif any(word in message_lower for word in ['price', 'cost', 'fare', 'pricing']):
        return "Our pricing is transparent: ₹30 base fare + ₹10 per km + ₹5 per kg. You can see the exact fare before confirming your order."
    
    elif any(word in message_lower for word in ['driver', 'delivery time', 'how long']):
        return "Delivery times depend on distance and driver availability. Typically, orders are picked up within 30 minutes and delivered based on the distance. You'll receive real-time updates."
    
    elif any(word in message_lower for word in ['payment', 'pay', 'bill']):
        return "We accept various payment methods. Payment is processed securely after successful delivery. You'll receive a receipt via email."
    
    elif any(word in message_lower for word in ['help', 'support', 'problem', 'issue']):
        return "I'm here to help! Our support team has received your message and will respond shortly. For urgent issues, you can also call our support hotline."
    
    elif any(word in message_lower for word in ['hello', 'hi', 'hey']):
        return "Hello! Welcome to Loadmatrix support. How can I help you today? You can ask about tracking orders, pricing, delivery times, or any other questions."
    
    else:
        return "Thank you for contacting Loadmatrix support. Our team has received your message and will respond as soon as possible. For immediate assistance with common questions, try asking about tracking, pricing, or delivery times."

@customer_bp.post('/orders')
@role_required('customer')
def create_order():
    try:
        # Handle both JSON and form data for file uploads
        material_photo_url = None
        material_description = None
        
        # Check if request contains file data
        if request.form:
            # Get data from form
            data = {
                "pickup_lat": request.form.get("pickup_lat"),
                "pickup_lng": request.form.get("pickup_lng"),
                "drop_lat": request.form.get("drop_lat"),
                "drop_lng": request.form.get("drop_lng"),
                "pickup_address": request.form.get("pickup_address"),
                "drop_address": request.form.get("drop_address"),
                "material_type": request.form.get("material_type"),
                "weight_kg": request.form.get("weight_kg"),
                "material_description": request.form.get("material_description")
            }
            
            # Handle photo upload (in a real app, you would save the file)
            # For now, we'll just store a placeholder URL
            if 'material_photo' in request.files:
                material_photo = request.files['material_photo']
                if material_photo.filename != '':
                    # In a real implementation, you would save the file and generate a URL
                    # For now, we'll just store the filename as a placeholder
                    material_photo_url = f"/uploads/{material_photo.filename}"
        else:
            # Handle JSON data
            data = request.get_json() or {}
        
        required = [
            "pickup_lat","pickup_lng","drop_lat","drop_lng",
            "pickup_address","drop_address","material_type","weight_kg"
        ]
        ok, err = require_fields(data, required)
        if not ok:
            return jsonify({"message": err}), 400

        # Validate coordinates
        try:
            # Check if all required fields are present and not None
            for field in required:
                if data.get(field) is None or data.get(field) == '':
                    return jsonify({"message": f"Missing required field: {field}"}), 400
                    
            # Convert to float with proper validation
            pickup_lat_str = data['pickup_lat']
            pickup_lng_str = data['pickup_lng']
            drop_lat_str = data['drop_lat']
            drop_lng_str = data['drop_lng']
            weight_kg_str = data['weight_kg']
            
            # Ensure they are strings before converting
            if not isinstance(pickup_lat_str, (str, int, float)):
                return jsonify({"message": "Invalid pickup_lat value"}), 400
            if not isinstance(pickup_lng_str, (str, int, float)):
                return jsonify({"message": "Invalid pickup_lng value"}), 400
            if not isinstance(drop_lat_str, (str, int, float)):
                return jsonify({"message": "Invalid drop_lat value"}), 400
            if not isinstance(drop_lng_str, (str, int, float)):
                return jsonify({"message": "Invalid drop_lng value"}), 400
            if not isinstance(weight_kg_str, (str, int, float)):
                return jsonify({"message": "Invalid weight_kg value"}), 400
                
            pickup_lat = float(pickup_lat_str)
            pickup_lng = float(pickup_lng_str)
            drop_lat = float(drop_lat_str)
            drop_lng = float(drop_lng_str)
            weight_kg = float(weight_kg_str)
        except (ValueError, TypeError) as e:
            return jsonify({"message": f"Invalid numeric values provided: {str(e)}"}), 400

        if not (validate_lat_lng(pickup_lat, pickup_lng) and validate_lat_lng(drop_lat, drop_lng)):
            return jsonify({"message": "Invalid coordinates"}), 400

        # Get user ID from JWT identity (now a string)
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        customer = user.customer_profile
        
        if not customer:
            return jsonify({"message": "Customer profile not found"}), 404

        distance = haversine_km(pickup_lat, pickup_lng, drop_lat, drop_lng)
        total, driver_share, commission = compute_fare(distance, weight_kg)

        # Create the order object
        order = Order()
        order.customer_id = customer.id
        order.pickup_address = data['pickup_address']
        order.pickup_lat = pickup_lat
        order.pickup_lng = pickup_lng
        order.drop_address = data['drop_address']
        order.drop_lat = drop_lat
        order.drop_lng = drop_lng
        order.material_type = data['material_type']
        order.weight_kg = weight_kg
        order.distance_km = round(distance, 2)
        order.fare_total = total
        order.driver_share = driver_share
        order.company_commission = commission
        order.status = OrderStatus.PENDING_DRIVER_SELECTION.value
        order.material_photo_url = material_photo_url
        order.material_description = data.get('material_description')
        
        db.session.add(order)
        db.session.commit()

        # Update customer stats
        customer.total_orders += 1
        customer.total_spent += total
        customer.last_order_date = datetime.utcnow()
        db.session.commit()

        return jsonify({"order_id": order.id, "fare_total": total, "distance_km": round(distance,2) }), 201
        
    except Exception as e:
        # Log the error for debugging
        current_app.logger.error(f"Error creating order: {str(e)}")
        return jsonify({"message": f"Error creating order: {str(e)}"}), 500

@customer_bp.post('/orders/simple')
@role_required('customer')
def create_simple_order():
    try:
        # Get form data
        pickup_location = request.form.get('pickup_location')
        drop_location = request.form.get('drop_location')
        pickup_lat = request.form.get('pickup_lat')
        pickup_lng = request.form.get('pickup_lng')
        drop_lat = request.form.get('drop_lat')
        drop_lng = request.form.get('drop_lng')
        material_type = request.form.get('material_type')
        material_description = request.form.get('material_description')
        material_weight = request.form.get('material_weight')
        distance_km = request.form.get('distance_km')
        fare_total = request.form.get('fare_total')
        
        # Validate required fields
        if not pickup_location:
            return jsonify({"message": "Pickup location is required"}), 400
        if not drop_location:
            return jsonify({"message": "Drop location is required"}), 400
        if not pickup_lat or not pickup_lng:
            return jsonify({"message": "Pickup coordinates are required"}), 400
        if not drop_lat or not drop_lng:
            return jsonify({"message": "Drop coordinates are required"}), 400
        if not material_type:
            return jsonify({"message": "Material type is required"}), 400
        if not material_weight:
            return jsonify({"message": "Material weight is required"}), 400
        if not distance_km:
            return jsonify({"message": "Distance is required"}), 400
        if not fare_total:
            return jsonify({"message": "Price is required"}), 400
            
        # Validate coordinates are numbers
        try:
            pickup_lat_float = float(pickup_lat)
            pickup_lng_float = float(pickup_lng)
            drop_lat_float = float(drop_lat)
            drop_lng_float = float(drop_lng)
            distance_km_float = float(distance_km)
            fare_total_float = float(fare_total)
        except ValueError:
            return jsonify({"message": "Coordinates, distance, and price must be valid numbers"}), 400
            
        # Validate weight is a number
        try:
            weight_kg = float(material_weight)
            if weight_kg <= 0:
                return jsonify({"message": "Material weight must be greater than 0"}), 400
        except ValueError:
            return jsonify({"message": "Material weight must be a valid number"}), 400
            
        # Validate distance and fare
        if distance_km_float < 0:
            return jsonify({"message": "Distance cannot be negative"}), 400
        if fare_total_float < 0:
            return jsonify({"message": "Price cannot be negative"}), 400
            
        # Generate a unique order ID
        order_id = generate_unique_order_id()
        
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        customer = user.customer_profile
        
        if not customer:
            return jsonify({"message": "Customer profile not found"}), 404
            
        # Handle photo upload (in a real app, you would save the file)
        material_photo_url = None
        if 'material_photo' in request.files:
            material_photo = request.files['material_photo']
            if material_photo.filename != '':
                # In a real implementation, you would save the file and generate a URL
                # For now, we'll just store the filename as a placeholder
                material_photo_url = f"/uploads/{material_photo.filename}"
        
        # Create the order object with simplified data
        order = Order()
        order.customer_id = customer.id
        order.pickup_address = pickup_location
        order.pickup_lat = pickup_lat_float
        order.pickup_lng = pickup_lng_float
        order.drop_address = drop_location
        order.drop_lat = drop_lat_float
        order.drop_lng = drop_lng_float
        order.material_type = material_type
        order.material_description = material_description
        order.material_photo_url = material_photo_url
        order.weight_kg = weight_kg
        order.distance_km = distance_km_float
        order.fare_total = fare_total_float
        order.status = OrderStatus.PENDING_DRIVER_SELECTION.value
        order.driver_share = 0  # Will be calculated when assigned to driver
        order.company_commission = 0  # Will be calculated when assigned to driver
        
        db.session.add(order)
        db.session.commit()

        # Update customer stats
        customer.total_orders += 1
        customer.total_spent += fare_total_float
        customer.last_order_date = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "order_id": f"ORD{order_id}",
            "distance_km": distance_km_float,
            "material_weight": weight_kg,
            "fare_total": fare_total_float,
            "message": "Order created successfully!"
        }), 201
        
    except Exception as e:
        # Log the error for debugging
        current_app.logger.error(f"Error creating simple order: {str(e)}")
        return jsonify({"message": f"Error creating order: {str(e)}"}), 500

# NEW: Send driver request API
@customer_bp.post('/orders/<int:order_id>/send_request')
@role_required('customer')
def send_driver_request(order_id):
    """Send a driver request for an order"""
    try:
        data = request.get_json() or {}
        driver_id = data.get('driver_id')
        
        if not driver_id:
            return jsonify({"message": "Driver ID is required"}), 400
            
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        customer = user.customer_profile
        
        if not customer:
            return jsonify({"message": "Customer profile not found"}), 404
            
        # Get the order
        order = Order.query.get_or_404(order_id)
        
        # Verify the order belongs to this customer
        if order.customer_id != customer.id:
            return jsonify({"message": "Order does not belong to this customer"}), 403
            
        # Verify the order is in pending status
        if order.status != OrderStatus.PENDING.value:
            return jsonify({"message": "Order is not in pending status"}), 400
            
        # Check if driver exists and is available
        # FIX: Use driver_id (9-digit ID) to find the driver, not the primary key
        driver = Driver.query.filter_by(driver_id=driver_id).first()
        if not driver:
            return jsonify({"message": "Driver not found"}), 404
            
        # Check if driver is available (not blacklisted and available)
        if not driver.user.is_active or driver.user.is_blacklisted or not driver.is_available:
            return jsonify({"message": "Driver is not available"}), 400
            
        # Check if driver already has active orders
        active_orders = Order.query.filter(
            Order.driver_id == driver.id,  # Use the primary key for the filter
            Order.status.in_([
                OrderStatus.REQUESTED.value,
                OrderStatus.ACCEPTED.value,
                OrderStatus.ASSIGNED.value,
                OrderStatus.PICKED.value,
                OrderStatus.DELIVERING.value
            ])
        ).count()
        
        if active_orders > 0:
            return jsonify({"message": "Driver already has active orders"}), 400
            
        # Update order status and driver
        order.status = OrderStatus.REQUESTED.value
        order.driver_id = driver.id  # Use the primary key for the foreign key
        db.session.commit()
        
        return jsonify({
            "message": "Driver request sent successfully",
            "order_id": order.id,
            "status": order.status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error sending driver request: {str(e)}")
        return jsonify({"message": f"Error sending driver request: {str(e)}"}), 500

# NEW: Cancel driver request API
@customer_bp.post('/orders/<int:order_id>/cancel_request')
@role_required('customer')
def cancel_driver_request(order_id):
    """Cancel a driver request for an order"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        customer = user.customer_profile
        
        if not customer:
            return jsonify({"message": "Customer profile not found"}), 404
            
        # Get the order
        order = Order.query.get_or_404(order_id)
        
        # Verify the order belongs to this customer
        if order.customer_id != customer.id:
            return jsonify({"message": "Order does not belong to this customer"}), 403
            
        # Verify the order is in requested status
        if order.status != OrderStatus.REQUESTED.value:
            return jsonify({"message": "Order is not in requested status"}), 400
            
        # Update order status to cancelled and remove driver assignment
        order.status = OrderStatus.CANCELLED.value
        order.driver_id = None
        db.session.commit()
        
        return jsonify({
            "message": "Driver request cancelled successfully",
            "order_id": order.id,
            "status": order.status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error cancelling driver request: {str(e)}")
        return jsonify({"message": f"Error cancelling driver request: {str(e)}"}), 500

def generate_unique_order_id():
    """Generate a unique order ID in the format ORD20251102XXXX"""
    # Get current date in YYYYMMDD format
    date_str = datetime.now().strftime("%Y%m%d")
    
    # Generate 4 random digits
    random_digits = ''.join(random.choices(string.digits, k=4))
    
    # Combine date and random digits
    order_id = f"{date_str}{random_digits}"
    
    # Check if this ID already exists (very unlikely but good to be safe)
    # In a production environment, you might want to check against the database
    return order_id

@customer_bp.get('/orders')
@role_required('customer')
def my_orders():
    # Get user ID from JWT identity (now a string)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    customer = user.customer_profile
    
    if not customer:
        return jsonify({"message": "Customer profile not found"}), 404
        
    orders = [
        {
            "id": o.id,
            "status": o.status,
            "fare_total": o.fare_total,
            "driver_id": o.driver_id,
            "distance_km": o.distance_km,
            "created_at": o.created_at.isoformat()
        } for o in customer.orders
    ]
    return jsonify(orders)

@customer_bp.get('/orders/<int:order_id>')
@role_required('customer')
def get_order(order_id):
    # Get user ID from JWT identity (now a string)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    customer = user.customer_profile
    
    if not customer:
        return jsonify({"message": "Customer profile not found"}), 404
    
    # Get the specific order
    order = Order.query.get_or_404(order_id)
    
    # Verify the order belongs to this customer
    if order.customer_id != customer.id:
        return jsonify({"message": "Order does not belong to this customer"}), 403
    
    order_data = {
        "id": order.id,
        "status": order.status,
        "pickup_address": order.pickup_address,
        "drop_address": order.drop_address,
        "distance_km": order.distance_km,
        "fare_total": order.fare_total,
        "driver_id": order.driver_id,
        "material_type": order.material_type,
        "weight_kg": order.weight_kg,
        "created_at": order.created_at.isoformat() if order.created_at else None
    }
    
    return jsonify(order_data)

@customer_bp.get('/orders/<int:order_id>/track')
@role_required('customer')
def track_order(order_id):
    # Get user ID from JWT identity (now a string)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    customer = user.customer_profile
    
    if not customer:
        return jsonify({"message": "Customer profile not found"}), 404
    
    order = Order.query.get_or_404(order_id)
    if not order.driver:
        return jsonify({"status": order.status, "driver": None})
    return jsonify({
        "status": order.status,
        "driver": {
            "id": order.driver.id,
            "lat": order.driver.current_lat,
            "lng": order.driver.current_lng
        }
    })

@customer_bp.get('/profile')
@role_required('customer')
def get_profile():
    # Get user ID from JWT identity (now a string)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    customer = user.customer_profile
    
    if not customer:
        return jsonify({"message": "Customer profile not found"}), 404

    profile_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "customer_id": customer.customer_id,  # 9-digit ID
        "phone": customer.phone,
        "address": customer.address,
        "city": customer.city,
        "state": customer.state,
        "zip_code": customer.zip_code,
        "country": customer.country,
        "total_orders": customer.total_orders,
        "total_spent": customer.total_spent,
        "loyalty_points": customer.loyalty_points,
        "last_order_date": customer.last_order_date.isoformat() if customer.last_order_date else None,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    
    return jsonify(profile_data)

@customer_bp.put('/profile')
@role_required('customer')
def update_profile():
    data = request.get_json() or {}
    # Get user ID from JWT identity (now a string)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    customer = user.customer_profile
    
    if not customer:
        return jsonify({"message": "Customer profile not found"}), 404

    # Update user information
    if "name" in data:
        user.name = data["name"]
    
    # Update customer information
    if "phone" in data:
        customer.phone = data["phone"]
    if "address" in data:
        customer.address = data["address"]
    if "city" in data:
        customer.city = data["city"]
    if "state" in data:
        customer.state = data["state"]
    if "zip_code" in data:
        customer.zip_code = data["zip_code"]
    if "country" in data:
        customer.country = data["country"]

    db.session.commit()
    
    return jsonify({"message": "Profile updated successfully"})

@customer_bp.post('/profile/image')
@role_required('customer')
def update_profile_image():
    """Update customer profile image"""
    try:
        data = request.get_json() or {}
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"message": "Image data is required"}), 400
        
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        # Update user's profile image
        user.profile_image = image_data
        db.session.commit()
        
        return jsonify({"message": "Profile image updated successfully"}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating profile image: {str(e)}")
        return jsonify({"message": "Error updating profile image"}), 500

@customer_bp.post('/profile/remove_image')
@role_required('customer')
def remove_profile_image():
    """Remove customer profile image"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Remove the profile image
        user.profile_image = None
        db.session.commit()
        
        return jsonify({"message": "Profile image removed successfully"}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error removing profile image: {str(e)}")
        return jsonify({"message": "Error removing profile image"}), 500

@customer_bp.get('/profile/image')
@role_required('customer')
def get_profile_image():
    """Get customer profile image"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        # Return user's profile image
        return jsonify({"profile_image": user.profile_image}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching profile image: {str(e)}")
        return jsonify({"message": "Error fetching profile image"}), 500

@customer_bp.get('/drivers/available')
@role_required('customer')
def get_available_drivers():
    """Get available drivers for customer to select"""
    try:
        # Get pickup coordinates from query parameters
        pickup_lat = request.args.get('pickup_lat')
        pickup_lng = request.args.get('pickup_lng')
        
        if not pickup_lat or not pickup_lng:
            return jsonify({"message": "Pickup coordinates are required"}), 400
            
        try:
            pickup_lat = float(pickup_lat)
            pickup_lng = float(pickup_lng)
        except ValueError:
            return jsonify({"message": "Invalid pickup coordinates"}), 400
        
        # Get all drivers who are online, active, not blacklisted, and available
        drivers = Driver.query.filter(
            User.is_active == True,
            User.is_blacklisted == False,
            Driver.is_available == True,
            Driver.is_online == True,  # Only online drivers
            Driver.current_lat.isnot(None),  # Must have location
            Driver.current_lng.isnot(None)
        ).join(User).all()
        
        driver_data = []
        for driver in drivers:
            # Calculate distance using Haversine formula
            distance_km = haversine_km(
                pickup_lat, pickup_lng,
                driver.current_lat, driver.current_lng
            )
            
            driver_info = {
                "id": driver.id,  # Primary key for internal use
                "driver_id": driver.driver_id,  # 9-digit ID for display
                "name": driver.user.name,
                "phone": driver.phone,
                "vehicle_type": driver.vehicle_type,
                "vehicle_number": driver.vehicle_number,
                "rating": driver.rating,
                "rating_count": driver.rating_count,
                "is_verified": driver.is_verified,
                "distance_km": round(distance_km, 2),
                "current_lat": driver.current_lat,
                "current_lng": driver.current_lng
            }
            driver_data.append(driver_info)
        
        # Sort by distance (nearest first)
        driver_data.sort(key=lambda x: x['distance_km'])
        
        return jsonify(driver_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching available drivers: {str(e)}")
        return jsonify({"message": f"Error fetching available drivers: {str(e)}"}), 500

@customer_bp.post('/orders/<int:order_id>/select_driver')
@role_required('customer')
def select_driver_for_order(order_id):
    """Select a driver for an order and send request"""
    try:
        data = request.get_json() or {}
        driver_id = data.get('driver_id')  # This is the primary key, not the 9-digit ID
        
        if not driver_id:
            return jsonify({"message": "Driver ID is required"}), 400
            
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        customer = user.customer_profile
        
        if not customer:
            return jsonify({"message": "Customer profile not found"}), 404
            
        # Get the order
        order = Order.query.get_or_404(order_id)
        
        # Verify the order belongs to this customer
        if order.customer_id != customer.id:
            return jsonify({"message": "Order does not belong to this customer"}), 403
            
        # Verify the order is in pending_driver_selection status
        if order.status != OrderStatus.PENDING_DRIVER_SELECTION.value:
            return jsonify({"message": "Order is not in pending driver selection status"}), 400
            
        # Check if driver exists and is available
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({"message": "Driver not found"}), 404
            
        # Check if driver is available (not blacklisted, online, and available)
        if not driver.user.is_active or driver.user.is_blacklisted or not driver.is_available or not driver.is_online:
            return jsonify({"message": "Driver is not available"}), 400
            
        # Check if driver already has active orders
        active_orders = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status.in_([
                OrderStatus.REQUESTED.value,
                OrderStatus.ACCEPTED.value,
                OrderStatus.ASSIGNED.value,
                OrderStatus.PICKED.value,
                OrderStatus.DELIVERING.value
            ])
        ).count()
        
        if active_orders > 0:
            return jsonify({"message": "Driver already has active orders"}), 400
            
        # Calculate fare breakdown now that we have a driver
        distance = order.distance_km
        weight = order.weight_kg
        total, driver_share, commission = compute_fare(distance, weight)
        
        # Update order with driver and fare details
        order.driver_id = driver.id
        order.status = OrderStatus.REQUESTED.value
        order.fare_total = total
        order.driver_share = driver_share
        order.company_commission = commission
        db.session.commit()
        
        return jsonify({
            "message": "Driver request sent successfully",
            "order_id": order.id,
            "status": order.status,
            "driver_name": driver.user.name,
            "fare_total": total
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error selecting driver: {str(e)}")
        return jsonify({"message": f"Error selecting driver: {str(e)}"}), 500

@customer_bp.get('/orders/<int:order_id>/driver_status')
@role_required('customer')
def get_order_driver_status(order_id):
    """Get the current status of driver assignment for an order"""
    try:
        # Get user ID from JWT identity
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        customer = user.customer_profile
        
        if not customer:
            return jsonify({"message": "Customer profile not found"}), 404
            
        # Get the order
        order = Order.query.get_or_404(order_id)
        
        # Verify the order belongs to this customer
        if order.customer_id != customer.id:
            return jsonify({"message": "Order does not belong to this customer"}), 403
            
        response_data = {
            "order_id": order.id,
            "status": order.status,
            "driver": None
        }
        
        # If order has a driver assigned, include driver details
        if order.driver:
            response_data["driver"] = {
                "id": order.driver.id,
                "driver_id": order.driver.driver_id,
                "name": order.driver.user.name,
                "phone": order.driver.phone,
                "vehicle_type": order.driver.vehicle_type,
                "vehicle_number": order.driver.vehicle_number,
                "rating": order.driver.rating,
                "current_lat": order.driver.current_lat,
                "current_lng": order.driver.current_lng
            }
            
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting order driver status: {str(e)}")
        return jsonify({"message": f"Error getting order driver status: {str(e)}"}), 500

# NEW: Route to serve the driver selection page
@customer_bp.get('/select_driver')
@role_required('customer')
def select_driver_page():
    """
    Serve the driver selection page with comprehensive error handling.
    
    This route is designed to never throw an unhandled exception. It always returns
    structured error responses for validation issues that the frontend can handle.
    """
    try:
        # Get order_id from query parameters
        order_id_str = request.args.get('order_id')
        
        # Validate order_id is provided
        if not order_id_str:
            current_app.logger.warning("select_driver_page called without order_id parameter")
            return jsonify({"error": "MISSING_ORDER_ID", "message": "Order ID is required"}), 400
        
        # Convert order_id to integer with comprehensive error handling
        try:
            order_id = int(order_id_str)
            if order_id <= 0:
                current_app.logger.warning(f"select_driver_page called with invalid order_id (non-positive): {order_id_str}")
                return jsonify({"error": "INVALID_ORDER_ID", "message": "Order ID must be a positive integer"}), 400
        except (ValueError, TypeError) as e:
            current_app.logger.warning(f"select_driver_page called with invalid order_id format: {order_id_str}, error: {str(e)}")
            return jsonify({"error": "INVALID_ORDER_ID", "message": "Order ID must be a valid integer"}), 400
        
        # Get user ID from JWT identity with error handling
        try:
            user_id = get_jwt_identity()
            if not user_id:
                current_app.logger.warning("select_driver_page called without valid JWT identity")
                return jsonify({"error": "AUTHENTICATION_REQUIRED", "message": "Authentication required"}), 401
        except Exception as e:
            current_app.logger.error(f"Error getting JWT identity in select_driver_page: {str(e)}", exc_info=True)
            return jsonify({"error": "AUTHENTICATION_ERROR", "message": "Authentication error"}), 401
        
        # Safely fetch user from database
        try:
            user = User.query.get(user_id)
            if not user:
                current_app.logger.warning(f"select_driver_page called with non-existent user_id: {user_id}")
                return jsonify({"error": "USER_NOT_FOUND", "message": "User not found"}), 404
        except Exception as e:
            current_app.logger.error(f"Database error fetching user {user_id} in select_driver_page: {str(e)}", exc_info=True)
            return jsonify({"error": "DATABASE_ERROR", "message": "Database error occurred"}), 500
        
        # Safely fetch customer profile
        try:
            customer = getattr(user, 'customer_profile', None)
            if not customer:
                current_app.logger.warning(f"select_driver_page called with user_id {user_id} but no customer profile")
                return jsonify({"error": "CUSTOMER_PROFILE_NOT_FOUND", "message": "Customer profile not found"}), 404
        except AttributeError as e:
            current_app.logger.error(f"AttributeError accessing customer_profile for user {user_id}: {str(e)}", exc_info=True)
            return jsonify({"error": "INTERNAL_ERROR", "message": "Internal server error"}), 500
        except Exception as e:
            current_app.logger.error(f"Unexpected error accessing customer_profile for user {user_id}: {str(e)}", exc_info=True)
            return jsonify({"error": "INTERNAL_ERROR", "message": "Internal server error"}), 500
        
        # Safely fetch order from database
        try:
            order = Order.query.get(order_id)
            if not order:
                current_app.logger.warning(f"select_driver_page called with non-existent order_id: {order_id}")
                return jsonify({"error": "ORDER_NOT_FOUND", "message": "Order not found"}), 404
        except Exception as e:
            current_app.logger.error(f"Database error fetching order {order_id} in select_driver_page: {str(e)}", exc_info=True)
            return jsonify({"error": "DATABASE_ERROR", "message": "Database error occurred"}), 500
        
        # Verify the order belongs to this customer with safe attribute access
        try:
            order_customer_id = getattr(order, 'customer_id', None)
            customer_id = getattr(customer, 'id', None)
            
            if order_customer_id is None or customer_id is None:
                current_app.logger.warning(
                    f"select_driver_page unable to verify order-customer relationship: order_customer_id={order_customer_id}, customer_id={customer_id}"
                )
                return jsonify({"error": "VERIFICATION_ERROR", "message": "Unable to verify order ownership"}), 500
                
            if order_customer_id != customer_id:
                current_app.logger.warning(
                    f"select_driver_page called with order_id {order_id} that doesn't belong to customer {customer_id}"
                )
                return jsonify({"error": "UNAUTHORIZED_ORDER_ACCESS", "message": "You are not authorized to access this order"}), 403
        except AttributeError as e:
            current_app.logger.error(f"AttributeError during order-customer verification: {str(e)}", exc_info=True)
            return jsonify({"error": "INTERNAL_ERROR", "message": "Internal server error"}), 500
        except Exception as e:
            current_app.logger.error(f"Unexpected error during order-customer verification: {str(e)}", exc_info=True)
            return jsonify({"error": "INTERNAL_ERROR", "message": "Internal server error"}), 500
        
        # Additional validation: Check if order status allows driver selection
        try:
            order_status = getattr(order, 'status', None)
            if order_status and order_status != OrderStatus.PENDING.value:
                current_app.logger.warning(
                    f"select_driver_page called with order_id {order_id} in status {order_status}, expected {OrderStatus.PENDING.value}"
                )
                return jsonify({
                    "error": "ORDER_STATUS_INVALID", 
                    "message": f"Order status is '{order_status}', expected 'pending' for driver selection"
                }), 400
        except Exception as e:
            current_app.logger.error(f"Error checking order status for order {order_id}: {str(e)}", exc_info=True)
            # Continue anyway since we still want to render the template
        
        # Return the HTML template for successful validation
        current_app.logger.info(f"Successfully serving select_driver page for order {order_id} to customer {customer.id}")
        return render_template('customer/select_driver.html')
        
    except Exception as e:
        # This is the ultimate fallback - should never be reached with the above error handling
        current_app.logger.critical(f"Unexpected error in select_driver_page - this should never happen: {str(e)}", exc_info=True)
        return jsonify({"error": "INTERNAL_ERROR", "message": "Internal server error"}), 500
