from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection, release_connection
from app.core.cache import cache
from app.producers.events import publish
import json

router = APIRouter()

class NewPost(BaseModel):
    user_id: str
    destination: str
    departure_time: str
    trip_type: str
    available_slots: int = 1
    start_lat: float = None
    start_lng: float = None

@router.post("/posts")
def create_post(post: NewPost):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO posts (user_id, destination, departure_time, trip_type, available_slots, start_lat, start_lng) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (post.user_id, post.destination.strip().title(), post.departure_time, post.trip_type, post.available_slots, post.start_lat, post.start_lng)
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        cache.delete(f"posts:{post.destination.lower()}")
        publish("post-created", {
            "post_id": str(user_id),
            "destination": post.destination,
            "trip_type": post.trip_type,
            "available_slots": post.available_slots
        })
        return {"id": user_id, "message": "post created"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)

@router.get("/posts")
def browse_posts(destination: str):
    cache_key = f"posts:{destination.lower()}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM posts WHERE LOWER(destination) = LOWER(%s) AND status = 'open'",
            (destination,)
        )
        user_id = cursor.fetchall()
        results = []
        for r in user_id:
            results.append({
                "id": str(r[0]),
                "user_id": str(r[1]),
                "destination": r[2],
                "departure_time": str(r[3]),
                "trip_type": r[4],
                "available_slots": r[5],
                "status": r[6],
                "created_at": str(r[7]),
                "start_lat": float(r[8]) if r[8] else None,
                "start_lng": float(r[9]) if r[9] else None
            })
        cache.setex(cache_key, 60, json.dumps(results))
        return results
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)
