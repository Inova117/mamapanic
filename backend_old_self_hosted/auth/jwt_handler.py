"""JWT token handling for authentication"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt

# Get configuration from environment
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_DAYS = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_DAYS', '7'))


def create_access_token(user_id: str, email: str) -> str:
    """
    Create a JWT access token for a user
    
    Args:
        user_id: User's unique identifier
        email: User's email address
        
    Returns:
        JWT token string
    """
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            return None
            
        return {
            "user_id": user_id,
            "email": email
        }
    except JWTError:
        return None


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """
    Extract JWT token from Authorization header
    
    Args:
        authorization: Authorization header value (e.g., "Bearer token123")
        
    Returns:
        Token string if valid format, None otherwise
    """
    if not authorization:
        return None
        
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
        
    return parts[1]
