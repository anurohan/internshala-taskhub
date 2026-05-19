"""
TaskHub — RQ Worker Entrypoint
Run with: python worker.py
"""
import os
import redis
from rq import Worker, Queue
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

if __name__ == "__main__":
    redis_conn = redis.from_url(REDIS_URL)
    worker = Worker(["default"], connection=redis_conn)
    worker.work(with_scheduler=True)
