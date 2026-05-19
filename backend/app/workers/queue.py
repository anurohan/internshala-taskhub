"""
TaskHub — Redis Queue Setup
"""
import redis
from rq import Queue
from ..config import settings

_queue: Queue | None = None
_redis_conn: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis_conn
    if _redis_conn is None:
        _redis_conn = redis.from_url(settings.REDIS_URL)
    return _redis_conn


def get_queue() -> Queue:
    global _queue
    if _queue is None:
        _queue = Queue(connection=get_redis())
    return _queue
