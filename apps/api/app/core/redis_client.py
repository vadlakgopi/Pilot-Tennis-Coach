"""
Redis Client Configuration
"""
import redis
from app.core.config import settings

redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5
)


def get_redis():
    """Dependency for getting Redis client"""
    return redis_client






