from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.database import get_connection, release_connection
import json

router = APIRouter()

active_connections = {}

@router.websocket("/chat/{request_id}/{user_id}")
async def chat(websocket: WebSocket, request_id: str, user_id: str):
    await websocket.accept()
    
    if request_id not in active_connections:
        active_connections[request_id] = []
    active_connections[request_id].append(websocket)
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT sender_id, content, created_at FROM messages WHERE request_id = %s ORDER BY created_at",
            (request_id,)
        )
        history = cursor.fetchall()
        for msg in history:
            await websocket.send_text(json.dumps({
                "sender_id": str(msg[0]),
                "content": msg[1],
                "created_at": str(msg[2])
            }))
        release_connection(conn)
        
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO messages (request_id, sender_id, content) VALUES (%s, %s, %s)",
                (request_id, user_id, msg["content"])
            )
            conn.commit()
            release_connection(conn)
            
            for connection in active_connections[request_id]:
                await connection.send_text(json.dumps({
                    "sender_id": user_id,
                    "content": msg["content"],
                    "created_at": "now"
                }))
    except WebSocketDisconnect:
        active_connections[request_id].remove(websocket)