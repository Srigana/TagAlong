from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection, release_connection

router = APIRouter()

class NewUser(BaseModel):
    name: str
    email: str
    phone: str = None

@router.post("/users")
def create_user(user: NewUser):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, phone) VALUES (%s, %s, %s) RETURNING id",
            (user.name, user.email, user.phone)
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        return {"id": user_id, "message": "user created"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)