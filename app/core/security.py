import base64
import bcrypt
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

SECRET_KEY = "change-me-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with explicit 72-byte limit handling.
    
    Process:
    1. Encode password to UTF-8 bytes
    2. Truncate to 72 bytes (bcrypt limit)
    3. Hash with bcrypt rounds=12
    4. Return as UTF-8 string
    
    This safely handles passwords of any length and encoding.
    
    Args:
        password: Raw password string (any length, any UTF-8 encoding)
    
    Returns:
        Bcrypt hash as UTF-8 string
    """
    # Encode to UTF-8 and truncate to 72 bytes
    password_bytes = password.encode("utf-8")[:72]
    
    # Generate salt and hash
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as UTF-8 string
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verify a password against its bcrypt hash with explicit 72-byte limit handling.
    
    Args:
        plain_password: Raw password string to verify
        password_hash: Previously stored bcrypt hash
    
    Returns:
        True if password matches, False otherwise
    """
    # Encode to UTF-8 and truncate to 72 bytes (same as hashing)
    password_bytes = plain_password.encode("utf-8")[:72]
    
    # Convert hash back to bytes for bcrypt
    hash_bytes = password_hash.encode("utf-8")
    
    # Verify
    return bcrypt.checkpw(password_bytes, hash_bytes)


def create_access_token(subject: str, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
