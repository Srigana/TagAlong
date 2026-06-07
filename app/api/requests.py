from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection, release_connection
from app.core.cache import cache
from app.producers.events import publish
import json

router = APIRouter()

class NewRequest(BaseModel):
    post_id: str
    requester_id: str
    request_type: str
    details: str

@router.post("/requests")
def new_request(request: NewRequest):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT available_slots FROM posts WHERE id = %s AND status = 'open'",
            (request.post_id,)
        )
        post = cursor.fetchone()
        if not post:
            raise HTTPException(status_code=404, detail="post not found or not open")
        
        if post[0] <= 0:
            raise HTTPException(status_code=400, detail="no slots available")

        cursor.execute(
            "INSERT INTO requests (post_id, requester_id, request_type, details) VALUES (%s, %s, %s, %s) RETURNING id",
            (request.post_id, request.requester_id, request.request_type, request.details)
        )
        request_id = cursor.fetchone()[0]
        conn.commit()
        publish("request-created", {
           "request_id": str(request_id),
           "post_id": request.post_id,
           "requester_id": request.requester_id,
           "request_type": request.request_type
        })
        return {"id": request_id, "message": "request created"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)
