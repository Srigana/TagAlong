from locust import HttpUser, task, between
import random
import string

def random_email():
    return ''.join(random.choices(string.ascii_lowercase, k=8)) + "@test.com"

class TagalongUser(HttpUser):
    wait_time = between(1, 3)
    token = None
    user_id = None

    def on_start(self):
        email = random_email()
        response = self.client.post("/signup", json={
            "name": "Test User",
            "email": email,
            "password": "test1234"
        })
        data = response.json()
        self.token = data.get("token")
        self.user_id = data.get("user_id")

    @task(3)
    def search_posts(self):
        destinations = ["Costco", "Walmart", "Target", "Airport"]
        dest = random.choice(destinations)
        self.client.get(f"/posts?destination={dest}")

    @task(2)
    def create_post(self):
        if not self.user_id:
            return
        self.client.post("/posts", json={
            "user_id": self.user_id,
            "destination": random.choice(["Costco", "Walmart", "Target"]),
            "departure_time": "2026-06-08 15:00:00",
            "trip_type": "both",
            "available_slots": 2,
            "start_lat": 37.7749,
            "start_lng": -122.4194
        })

    @task(1)
    def get_profile(self):
        if not self.user_id:
            return
        self.client.get(f"/profile/{self.user_id}")

    @task(1)
    def get_my_trips(self):
        if not self.user_id:
            return
        self.client.get(f"/my-trips/{self.user_id}")