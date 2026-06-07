from fastapi import APIRouter, HTTPException
from app.core.database import get_connection, release_connection

router = APIRouter()

@router.get("/my-trips/{user_id}")
def get_my_trips(user_id: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.request_type, r.status, r.created_at,
                   p.destination, p.departure_time, p.user_id,
                   EXISTS(SELECT 1 FROM ratings rt WHERE rt.trip_request_id = r.id AND rt.rater_id = %s) as already_rated
            FROM requests r
            JOIN posts p ON r.post_id = p.id
            WHERE r.requester_id = %s
            ORDER BY r.created_at DESC
        """, (user_id, user_id))
        rows = cursor.fetchall()
        trips = []
        for r in rows:
            trips.append({
                "id": str(r[0]),
                "request_type": r[1],
                "status": r[2],
                "created_at": str(r[3]),
                "destination": r[4],
                "departure_time": str(r[5]),
                "poster_id": str(r[6]),
                "already_rated": r[7]
            })
        return trips
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)


@router.get("/my-post-requests/{user_id}")
def get_my_post_requests(user_id: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.request_type, r.status, r.created_at,
                   r.requester_id, p.destination, p.departure_time
            FROM requests r
            JOIN posts p ON r.post_id = p.id
            WHERE p.user_id = %s
            ORDER BY r.created_at DESC
        """, (user_id,))
        rows = cursor.fetchall()
        requests = []
        for r in rows:
            requests.append({
                "id": str(r[0]),
                "request_type": r[1],
                "status": r[2],
                "created_at": str(r[3]),
                "requester_id": str(r[4]),
                "destination": r[5],
                "departure_time": str(r[6])
            })
        return requests
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)