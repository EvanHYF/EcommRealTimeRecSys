# locustfile.py

import uuid
from locust import HttpUser, TaskSet, task, between
from datetime import datetime

class UserBehaviorTasks(TaskSet):
    def on_start(self):
        # Give each simulated user a stable unique ID
        self.user_id = uuid.uuid4().hex

    @task(3)
    def post_user_behavior(self):
        payload = {
            "userId": f"user_{self.user_id}",
            "eventType": "view",
            "product": f"product_{int(self.user_id[:4], 16) % 10}",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        self.client.post("/api/user-behavior", json=payload)

    @task(1)
    def get_recommendations(self):
        # reuse the same user_id
        self.client.get(f"/api/recommendations/user_{self.user_id}")

class WebsiteUser(HttpUser):
    tasks = [UserBehaviorTasks]
    wait_time = between(1, 2)
