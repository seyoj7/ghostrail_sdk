# Example: call a paid service using GHOSTRAIL prepaid credit.

import os
from ..buyer import Buyer, load_dotenv

load_dotenv()

BUYER_PRIVATE_KEY = os.getenv("BUYER_PRIVATE_KEY")
GHOSTRAIL_ACTION = os.getenv("GHOSTRAIL_ACTION", "call").lower()

if GHOSTRAIL_ACTION == "refund":
    ESCROW_ADDRESS = os.getenv("ESCROW_ADDRESS")
    if not ESCROW_ADDRESS:
        raise ValueError("Set ESCROW_ADDRESS in the SDK .env file.")
    result = Buyer().refund_escrow(BUYER_PRIVATE_KEY, ESCROW_ADDRESS)
    print(f"Refund confirmed: {result['signature']}")
elif GHOSTRAIL_ACTION == "call":
    API_ENDPOINT = os.getenv("API_ENDPOINT")
    PROMPT = os.getenv("PROMPT")
    result = Buyer().call_service(BUYER_PRIVATE_KEY, API_ENDPOINT, PROMPT)

    print(result['response'])
    print(result['transaction'])
    print(result['endpoint'])
    print(result['service_id'])
else:
    raise ValueError("GHOSTRAIL_ACTION must be 'call' or 'refund'.")
