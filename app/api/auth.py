from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection, release_connection
from app.core.auth import hash_password, verify_password, create_token

router = APIRouter()

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(req: SignupRequest):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
            (req.name, req.email, hash_password(req.password))
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        token = create_token(str(user_id))
        return {"token": token, "user_id": str(user_id)}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)

@router.post("/login")
def login(req: LoginRequest):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, password_hash FROM users WHERE email = %s",
            (req.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="invalid credentials")
        if not verify_password(req.password, user[1]):
            raise HTTPException(status_code=401, detail="invalid credentials")
        token = create_token(str(user[0]))
        return {"token": token, "user_id": str(user[0])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        release_connection(conn)