import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

import random
import string

def test_signup_success():
    email = ''.join(random.choices(string.ascii_lowercase, k=8)) + "@test.com"
    response = client.post("/signup", json={
        "name": "Test User",
        "email": email,
        "password": "test1234"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "user_id" in data

def test_signup_duplicate_email():
    client.post("/signup", json={
        "name": "Test User",
        "email": "duplicate@test.com",
        "password": "test1234"
    })
    response = client.post("/signup", json={
        "name": "Test User",
        "email": "duplicate@test.com",
        "password": "test1234"
    })
    assert response.status_code == 400

def test_login_success():
    client.post("/signup", json={
        "name": "Login Test",
        "email": "logintest@test.com",
        "password": "test1234"
    })
    response = client.post("/login", json={
        "email": "logintest@test.com",
        "password": "test1234"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data

def test_login_wrong_password():
    response = client.post("/login", json={
        "email": "logintest@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_login_nonexistent_user():
    response = client.post("/login", json={
        "email": "nobody@test.com",
        "password": "test1234"
    })
    assert response.status_code == 401