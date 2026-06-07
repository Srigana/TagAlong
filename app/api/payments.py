import stripe
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter()

class PaymentIntent(BaseModel):
    amount: float
    post_id: str

@router.post("/create-payment-intent")
def create_payment_intent(payment: PaymentIntent):
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(payment.amount * 100),  # Stripe uses cents
            currency="usd",
            metadata={"post_id": payment.post_id}
        )
        return {"client_secret": intent.client_secret}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))