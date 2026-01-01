"""
Script to remove all order details from the database.
This script will:
1. Delete all records from the Order table
2. Delete all records from the Payment table (since they reference orders)
3. Reset auto-increment counters
4. Reset related counters in Customer and Driver tables
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.database import db
from backend.models import Order, Payment, Customer, Driver
from backend.app import create_app

def clear_all_orders():
    """Remove all order details from the database"""
    app = create_app()
    
    with app.app_context():
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
                # SQLite specific reset
                db.session.execute("DELETE FROM sqlite_sequence WHERE name='order';")
                db.session.execute("DELETE FROM sqlite_sequence WHERE name='payment';")
            else:
                # For PostgreSQL or other databases
                try:
                    db.session.execute("ALTER SEQUENCE order_id_seq RESTART WITH 1;")
                    db.session.execute("ALTER SEQUENCE payment_id_seq RESTART WITH 1;")
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

if __name__ == "__main__":
    clear_all_orders()