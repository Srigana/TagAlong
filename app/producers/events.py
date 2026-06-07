from confluent_kafka import Producer
import json
import os
from dotenv import load_dotenv


load_dotenv()

producer = Producer({
    'bootstrap.servers': os.getenv("KAFKA_BOOTSTRAP_SERVERS")
})

def publish(topic: str, event: dict):
    producer.produce(
        topic,
        json.dumps(event).encode("utf-8")
    )
    producer.flush()