from flask import Flask, render_template, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from .config import DevelopmentConfig, ProductionConfig
from .database import db, migrate
from .utils.security import bcrypt, jwt
from .routes.auth_routes import auth_bp
from .routes.customer_routes import customer_bp
from .routes.driver_routes import driver_bp
from .routes.admin_routes import admin_bp
from . import models  # ensure models are imported for migrations


def create_app():
    # Check if React build exists, otherwise use templates
    react_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
    if os.path.exists(react_build_path):
        app = Flask(
            __name__,
            static_folder=os.path.join(react_build_path, "static"),
            template_folder=react_build_path,
            instance_relative_config=False,
        )
    else:
        app = Flask(
            __name__,
            static_folder=os.path.join(os.path.dirname(__file__), "..", "frontend", "static"),
            template_folder=os.path.join(os.path.dirname(__file__), "..", "frontend", "templates"),
            instance_relative_config=False,
        )
    
    # Use ProductionConfig if in production environment
    if os.getenv('FLASK_ENV') == 'production':
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    CORS(app, supports_credentials=True)

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Initialize Flask-Mail
    mail = Mail(app)
    app.extensions['mail'] = mail

    # Request logging middleware
    @app.before_request
    def log_request_info():
        print(f"Request: {request.method} {request.url}")
        print(f"Headers: {dict(request.headers)}")
        if request.data:
            print(f"Body: {request.data}")

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(customer_bp, url_prefix="/api/customer")
    app.register_blueprint(driver_bp, url_prefix="/api/driver")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # Global error handlers
    @app.errorhandler(422)
    def handle_unprocessable_entity(e):
        print(f"422 Error: {e}")
        print(f"Request: {request.method} {request.url}")
        print(f"Headers: {dict(request.headers)}")
        return {"message": "Unprocessable Entity"}, 422

    @app.errorhandler(Exception)
    def handle_exception(e):
        print(f"Unhandled exception: {str(e)}")
        return {"message": "Internal Server Error"}, 500

    @app.route('/')
    def index():
        # Check if React build exists
        react_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
        if os.path.exists(react_build_path):
            return send_from_directory(react_build_path, 'index.html')
        else:
            return render_template('index.html')

    # Serve React app for all non-API routes
    @app.route('/<path:path>')
    def serve_react_app(path):
        react_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
        if os.path.exists(react_build_path):
            # Check if it's a file in the build directory
            if os.path.exists(os.path.join(react_build_path, path)):
                return send_from_directory(react_build_path, path)
            else:
                # Return index.html for client-side routing
                return send_from_directory(react_build_path, 'index.html')
        else:
            # Fallback: always return index.html for React routing
            try:
                return render_template('index.html')
            except:
                return "React app not built. Please run: cd frontend && npm run build", 404

    # Authentication pages - removed (handled by React)
    # @app.route('/login')
    # @app.route('/register')
    # @app.route('/reset-password')

    # Basic page routes - removed (handled by React)
    # @app.route('/customer')
    # @app.route('/customer/create_order')
    # @app.route('/customer/track_order')
    # @app.route('/driver')
    # @app.route('/driver/orders')
    # @app.route('/admin')
    # @app.route('/admin/manage_users')
    # @app.route('/customer/chat')
    # @app.route('/driver/chat')
        
    # Serve favicon.ico explicitly
    @app.route('/favicon.ico')
    def favicon():
        react_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
        if os.path.exists(react_build_path):
            try:
                return send_from_directory(react_build_path, 'favicon.ico', mimetype='image/vnd.microsoft.icon')
            except:
                # Return a simple 204 No Content if favicon not found
                return '', 204
        else:
            return send_from_directory(os.path.join(app.root_path, '..', 'frontend', 'static'),
                                       'favicon.ico', mimetype='image/vnd.microsoft.icon')

    # Add CLI command to clear orders
    @app.cli.command("clear-orders")
    def clear_orders_command():
        """Clear all order data from the database."""
        from .models import Order, Payment, Customer, Driver
        from .database import db
        
        try:
            print("Starting to clear all order data...")
            
            # First, delete all payments (they reference orders)
            payment_count = Payment.query.count()
            Payment.query.delete()
            print(f"Deleted {payment_count} payment records")
            
            # Then delete all orders
            order_count = Order.query.count()
            Order.query.delete()
            print(f"Deleted {order_count} order records")
            
            # Reset auto-increment counters for Order table
            if db.engine.dialect.name == 'sqlite':
                # SQLite specific reset - use the correct table name
                try:
                    db.session.execute(db.text("DELETE FROM sqlite_sequence WHERE name='order';"))
                    db.session.execute(db.text("DELETE FROM sqlite_sequence WHERE name='payment';"))
                except Exception as e:
                    print(f"Note: Could not reset SQLite sequence counters: {e}")
                    # Try alternative approach for SQLite
                    try:
                        db.session.execute(db.text("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'order';"))
                        db.session.execute(db.text("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'payment';"))
                    except Exception as e2:
                        print(f"Note: Alternative SQLite reset also failed: {e2}")
            else:
                # For PostgreSQL or other databases
                try:
                    db.session.execute(db.text("ALTER SEQUENCE order_id_seq RESTART WITH 1;"))
                    db.session.execute(db.text("ALTER SEQUENCE payment_id_seq RESTART WITH 1;"))
                except Exception as e:
                    print(f"Note: Could not reset sequence counters: {e}")
            
            # Reset counters in Customer table
            customers = Customer.query.all()
            for customer in customers:
                customer.total_orders = 0
                customer.total_spent = 0.0
                customer.loyalty_points = 0
                customer.last_order_date = None
            print(f"Reset counters for {len(customers)} customers")
            
            # Reset counters in Driver table
            drivers = Driver.query.all()
            for driver in drivers:
                driver.total_deliveries = 0
                driver.total_earnings = 0.0
                driver.rating = 0.0
                driver.rating_count = 0
            print(f"Reset counters for {len(drivers)} drivers")
            
            # Commit all changes
            db.session.commit()
            print("Successfully cleared all order data and reset related counters!")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error clearing order data: {e}")
            raise

    return app

# For flask run discovery
app = create_app()