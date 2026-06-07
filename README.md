# TagAlong

Find people heading your way. Share the ride, split the cost.

## What it does

TagAlong connects people going to the same destination. Instead of driving alone or paying full Uber prices, you find a neighbor already heading to Costco, the airport, or wherever and tag along. Posters earn, requesters save. Everyone wins.

## How it works

1. **Post a trip** - heading somewhere? Offer spare seats or offer to pick up items
2. **Find a tagalong** - search your destination, see who's heading there
3. **Pay and request** - fare is calculated by distance, payment is held via Stripe
4. **Get accepted** - poster confirms, trip is on
5. **Rate each other** - builds trust in the community

## Tech stack

- **FastAPI** - backend API
- **Apache Kafka** - event-driven architecture (post created, request made, status updates)
- **Redis** - caches active posts per destination for fast search
- **PostgreSQL** - source of truth for users, posts, requests, ratings
- **Stripe** - payment processing with held funds
- **WebSockets** - real-time chat between poster and requester
- **React** - frontend
- **Docker Compose** - runs everything locally

## Running locally

```bash
# Start infrastructure
docker-compose up -d

# Install dependencies
pip install -r requirements.txt

# Run backend
uvicorn app.main:app --reload

# Run frontend
cd frontend && npm install && npm run dev
```

Add a `.env` file based on `.env.example` with your own keys.

## What I built

Kafka handles events between services, a request triggers a consumer that updates slot availability independently of the API. Redis caches search results per destination and invalidates on new posts. Stripe holds payment on request, releases on acceptance. Chat is real-time over WebSockets.
