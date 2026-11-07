# Example: call a paid service using GHOSTRAIL prepaid credit.

import os
from ..buyer import Buyer, load_dotenv

load_dotenv()

BUYER_PRIVATE_KEY = os.getenv("BUYER_PRIVATE_KEY")
API_ENDPOINT = os.getenv("API_ENDPOINT")
PROMPT = os.getenv("PROMPT")

result = Buyer().call_service(BUYER_PRIVATE_KEY, API_ENDPOINT, PROMPT)

print(result['response'])
print(result['transaction'])
print(f"API Endpoint: {result['endpoint']}")
print(result['service_id'])
