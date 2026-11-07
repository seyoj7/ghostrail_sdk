# Example: check prepaid USDC credit for a buyer/seller pair.

import os
from ..buyer import Buyer, load_dotenv

load_dotenv()

BUYER_ADDRESS = os.getenv("BUYER_ADDRESS")
SELLER_ADDRESS = os.getenv("SELLER_ADDRESS")

credits = Buyer().check_credit(BUYER_ADDRESS, SELLER_ADDRESS)

print(f"Available credit: {credits} USDC")
