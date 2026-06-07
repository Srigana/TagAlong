from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection, release_connection
from app.core.cache import cache
from app.producers.events import publish
import json

router = APIRouter()

class StatusUpdate(BaseModel):
    status: str

@router.patch("/requests/{request_id}/status")
def update_request_status(request_id: str, update: StatusUpdate):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE requests SET status = %s WHERE id = %s RETURNING id", 
            (update.status, request_id)
        )
        request_id = cursor.fetchone()[0]
        conn.commit()
        publish("request-updated", {
            "request_id": request_id,
            "status": update.status  
        })
        return {"id": request_id, "status": "status updated"}
    
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)

@router.patch("/posts/{post_id}/status")
def update_post_status(post_id: str, update: StatusUpdate):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE posts SET status = %s WHERE id = %s RETURNING id", 
            (update.status, post_id)
        )
        request_id = cursor.fetchone()[0]
        conn.commit()
        publish("post-updated", {
            "post_id": post_id,
            "status": update.status  
        })
        return {"id": post_id, "status": "status updated"}
    
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)