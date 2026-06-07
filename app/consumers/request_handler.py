from confluent_kafka import Consumer
import json
import os
from dotenv import load_dotenv
from app.core.database import get_connection, release_connection

load_dotenv()

consumer = Consumer({
    'bootstrap.servers': os.getenv("KAFKA_BOOTSTRAP_SERVERS"),
    'group.id': 'request-handler',
    'auto.offset.reset': 'earliest'
})

def handle_requests():
    consumer.subscribe(['request-created'])
    
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"Error: {msg.error()}")
            continue
        
        event = json.loads(msg.value().decode("utf-8"))
        print(f"Received event: {event}")
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE posts SET available_slots = available_slots - 1 WHERE id = %s",
                (event["post_id"],)
            )
            cursor.execute(
                "UPDATE posts SET status = 'full' WHERE id = %s AND available_slots <= 0",
                (event["post_id"],)
            )
            conn.commit()
            print(f"Updated slots for post {event['post_id']}")
        except Exception as e:
            conn.rollback()
            print(f"Error updating slots: {e}")
        finally:
            release_connection(conn)

if __name__ == "__main__":
    print("Starting request handler...")
    handle_requests()