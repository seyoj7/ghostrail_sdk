# Submit a buyer-authorized refund for an expired escrow.

import os

from ..buyer import Buyer, load_dotenv

load_dotenv()

buyer_private_key = os.getenv("BUYER_PRIVATE_KEY")
results = Buyer().refund_all_expired_escrows(buyer_private_key)

for result in results:
    if "signature" in result:
        print(f"Refund confirmed: {result['escrowAddress']} ({result['signature']})")
    else:
        print(f"Refund failed: {result['escrowAddress']} ({result['error']})")

failures = [result for result in results if "error" in result]
if failures:
    raise RuntimeError(f"{len(failures)} of {len(results)} escrow refunds failed")
