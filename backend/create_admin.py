import sys
import os
import argparse
import getpass

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal, Base, engine
from app.models.schema import User
from app.core.security import hash_password


def create_admin():
    parser = argparse.ArgumentParser(description="Create an administrator account for MSQ Exam Application.")
    parser.add_argument("--username", help="Admin username")
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--password", help="Admin password")

    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        username = args.username
        if not username:
            username = input("Enter admin username: ").strip()

        if not username or len(username) < 3:
            print("Error: Username must be at least 3 characters long.")
            sys.exit(1)

        email = args.email
        if not email:
            email = input("Enter admin email: ").strip().lower()

        if not email or "@" not in email:
            print("Error: Please provide a valid email address.")
            sys.exit(1)

        password = args.password
        if not password:
            password = getpass.getpass("Enter admin password (min 6 chars): ")
            confirm_pwd = getpass.getpass("Confirm admin password: ")
            if password != confirm_pwd:
                print("Error: Passwords do not match.")
                sys.exit(1)

        if not password or len(password) < 6:
            print("Error: Password must be at least 6 characters long.")
            sys.exit(1)

        # Check existing user
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            if existing_user.username == username:
                print(f"User with username '{username}' already exists. Updating to admin role...")
                existing_user.role = "admin"
                existing_user.password_hash = hash_password(password)
                existing_user.is_active = True
                db.commit()
                print(f"Successfully updated '{username}' to administrator!")
                return
            else:
                print(f"Error: Email '{email}' is already registered.")
                sys.exit(1)

        admin = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"\nAdministrator account '{admin.username}' ({admin.email}) created successfully!")
        print("You can now log in at http://localhost:3000/login with this account.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
