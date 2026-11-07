# Register a seller's service API with the GHOSTRAIL facilitator.

import os
from ..buyer import load_dotenv
from ..seller import Seller

load_dotenv()

service = Seller().register_service(
    service_name=os.getenv("SERVICE_NAME"),
    api_endpoint=os.getenv("API_ENDPOINT"),
    seller_wallet=os.getenv("SELLER_ADDRESS"),
    price_usdc=os.getenv("PRICE_USDC"),
)

print("Use this service ID in your x402 challenge:", service["id"])
print("Delete token (store securely):", service["deleteToken"])
