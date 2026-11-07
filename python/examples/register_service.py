# Register a seller's service API with the GHOSTRAIL facilitator.

import os
from ..buyer import load_dotenv
from ..seller import Seller

load_dotenv()

# Edit these values for your service. 
# The API Endpoint must be HTTPS outside localhost.

SERVICE_NAME = os.getenv("SERVICE_NAME")
API_ENDPOINT = os.getenv("API_ENDPOINT")
SELLER_SOLANA_WALLET = os.getenv("SELLER_ADDRESS")
PRICE_USDC = os.getenv("PRICE_USDC")

service = Seller().register_service(
    service_name=SERVICE_NAME,
    api_endpoint=API_ENDPOINT,
    seller_wallet=SELLER_SOLANA_WALLET,
    price_usdc=PRICE_USDC,
)

print("Service registered")
print(f"Name: {service['name']}")
print(f"Service ID: {service['id']}")
print(f"API Endpoint: {service['endpointUrl']}")
print(f"Seller wallet: {service['sellerWallet']}")
print(f"Price: {service['priceUsdc']} devnet USDC")
print(f"Delete token (keep private): {service['deleteToken']}")
