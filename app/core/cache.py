import redis
import os
from dotenv import load_dotenv

load_dotenv()

cache = redis.from_url(os.getenv("REDIS_URL"))