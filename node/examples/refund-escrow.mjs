import { Ghostrail } from "../buyer.js";

const sdk = new Ghostrail();
const results = await sdk.refundAllExpiredEscrows();

for (const result of results) {
  if (result.signature) {
    console.log(`Refund confirmed: ${result.escrowAddress} (${result.signature})`);
  } else {
    console.error(`Refund failed: ${result.escrowAddress} (${result.error})`);
  }
}

const failures = results.filter((result) => result.error);
if (failures.length > 0) {
  throw new Error(`${failures.length} of ${results.length} escrow refunds failed`);
}
