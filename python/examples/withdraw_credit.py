# Example: withdraw unused prepaid USDC credit for a seller.

import os
from ..buyer import Buyer, load_dotenv

load_dotenv()

BUYER_PRIVATE_KEY = os.getenv("BUYER_PRIVATE_KEY")
SELLER_ADDRESS = os.getenv("SELLER_ADDRESS")

Buyer().withdraw_credit(BUYER_PRIVATE_KEY, SELLER_ADDRESS)
