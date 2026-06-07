from confluent_kafka import Producer
import json
import os
from dotenv import load_dotenv


load_dotenv()

try:
    producer = Producer({
        'bootstrap.servers': os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    })
except Exception as e:
    print(f"Kafka not available: {e}")
    producer = None

def publish(topic: str, event: dict):
    if producer is None:
        print(f"Kafka unavailable, skipping event: {topic}")
        return
    try:
        producer.produce(topic, json.dumps(event).encode("utf-8"))
        producer.flush(timeout=1)  # 1 second timeout instead of blocking forever
    except Exception as e:
        print(f"Kafka publish failed: {e}")

