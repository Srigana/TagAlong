from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import users, posts, requests, status, auth, trips, payments, ratings, profile, chat


app = FastAPI(title="Tagalong")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(posts.router)
app.include_router(requests.router)
app.include_router(status.router)
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(payments.router)
app.include_router(ratings.router)
app.include_router(profile.router)
app.include_router(chat.router)



