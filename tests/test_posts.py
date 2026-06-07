import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
import random
import string

def get_test_user():
    email = ''.join(random.choices(string.ascii_lowercase, k=8)) + "@test.com"
    response = client.post("/signup", json={
        "name": "Post Tester",
        "email": email,
        "password": "test1234"
    })
    return response.json()

def test_create_post_success():
    user = get_test_user()
    response = client.post("/posts", json={
        "user_id": user["user_id"],
        "destination": "TestMart",
        "departure_time": "2026-06-08 15:00:00",
        "trip_type": "both",
        "available_slots": 2,
        "start_lat": 37.7749,
        "start_lng": -122.4194
    })
    assert response.status_code == 200
    data = response.json()
    assert "id" in data

def test_create_post_missing_destination():
    response = client.post("/posts", json={
        "user_id": "fake-user-id",
        "departure_time": "2026-06-08 15:00:00",
        "trip_type": "both",
        "available_slots": 2
    })
    assert response.status_code == 422

def test_browse_posts_returns_list():
    response = client.get("/posts?destination=TestMart")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_browse_posts_case_insensitive():
    response1 = client.get("/posts?destination=testmart")
    response2 = client.get("/posts?destination=TESTMART")
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert len(response1.json()) == len(response2.json())

def test_browse_posts_nonexistent_destination():
    response = client.get("/posts?destination=NowhereLand999")
    assert response.status_code == 200
    assert response.json() == []