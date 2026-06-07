from fastapi import APIRouter, HTTPException
from app.core.database import get_connection, release_connection

router = APIRouter()

@router.get("/profile/{user_id}")
def get_profile(user_id: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name, email, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        cursor.execute(
            "SELECT AVG(score), COUNT(*) FROM ratings WHERE rated_id = %s",
            (user_id,)
        )
        rating = cursor.fetchone()
        cursor.execute(
            "SELECT COUNT(*) FROM requests WHERE requester_id = %s",
            (user_id,)
        )
        trip_count = cursor.fetchone()[0]
        return {
            "name": user[0],
            "email": user[1],
            "member_since": str(user[2]),
            "average_rating": round(float(rating[0]), 1) if rating[0] else None,
            "rating_count": rating[1],
            "trip_count": trip_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)