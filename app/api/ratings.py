from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection, release_connection

router = APIRouter()

class NewRating(BaseModel):
    trip_request_id: str
    rater_id: str
    rated_id: str
    score: int

@router.post("/ratings")
def submit_rating(rating: NewRating):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ratings (trip_request_id, rater_id, rated_id, score) VALUES (%s, %s, %s, %s) RETURNING id",
            (rating.trip_request_id, rating.rater_id, rating.rated_id, rating.score)
        )
        rating_id = cursor.fetchone()[0]
        conn.commit()
        return {"id": str(rating_id), "message": "rating submitted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)

@router.get("/ratings/{user_id}")
def get_user_rating(user_id: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT AVG(score), COUNT(*) FROM ratings WHERE rated_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        avg = round(float(row[0]), 1) if row[0] else None
        count = row[1]
        return {"average": avg, "count": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)