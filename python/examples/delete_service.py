# Delete a registered service using its private delete token.

import os
from ..buyer import load_dotenv
from ..seller import Seller

load_dotenv()

SERVICE_ID = os.getenv("SERVICE_ID")
DELETE_TOKEN = os.getenv("DELETE_TOKEN")

Seller().delete_service(SERVICE_ID, DELETE_TOKEN)
print(f"Deleted service {SERVICE_ID}.")
