import pytest
import random
import string
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def random_email():
    return ''.join(random.choices(string.ascii_lowercase, k=8)) + "@test.com"

def create_user():
    response = client.post("/signup", json={
        "name": "Test User",
        "email": random_email(),
        "password": "test1234"
    })
    return response.json()

def create_post(user_id):
    response = client.post("/posts", json={
        "user_id": user_id,
        "destination": "RequestTestMart",
        "departure_time": "2026-06-08 15:00:00",
        "trip_type": "both",
        "available_slots": 2,
        "start_lat": 37.7749,
        "start_lng": -122.4194
    })
    return response.json()

def test_create_request_success():
    poster = create_user()
    requester = create_user()
    post = create_post(poster["user_id"])
    response = client.post("/requests", json={
        "post_id": post["id"],
        "requester_id": requester["user_id"],
        "request_type": "ride",
        "details": "Test request"
    })
    assert response.status_code == 200
    assert "id" in response.json()

def test_create_request_invalid_post():
    requester = create_user()
    response = client.post("/requests", json={
        "post_id": "00000000-0000-0000-0000-000000000000",
        "requester_id": requester["user_id"],
        "request_type": "ride",
        "details": "Test request"
    })
    assert response.status_code == 400

def test_accept_request():
    poster = create_user()
    requester = create_user()
    post = create_post(poster["user_id"])
    request = client.post("/requests", json={
        "post_id": post["id"],
        "requester_id": requester["user_id"],
        "request_type": "ride",
        "details": "Test request"
    }).json()
    response = client.patch(f"/requests/{request['id']}/status", json={
        "status": "accepted"
    })
    assert response.status_code == 200
    assert "id" in response.json()
    
def test_get_my_trips():
    requester = create_user()
    response = client.get(f"/my-trips/{requester['user_id']}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)