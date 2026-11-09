import { Ghostrail } from "../buyer.js";

const API_ENDPOINT = process.env.API_ENDPOINT;
const PROMPT = process.env.PROMPT;
const action = (process.env.GHOSTRAIL_ACTION || "call").toLowerCase();

const sdk = new Ghostrail();

if (action === "refund") {
  if (!process.env.ESCROW_ADDRESS) {
    throw new Error("Set ESCROW_ADDRESS in the SDK .env file.");
  }
  const result = await sdk.refundEscrow(process.env.ESCROW_ADDRESS);
  console.log(`Refund confirmed: ${result.signature}`);
} else if (action === "call") {
  const result = await sdk.callService(
    process.env.BUYER_PRIVATE_KEY,
    API_ENDPOINT,
    PROMPT,
    process.env.SERVICE_ID,
  );
  console.log(result.response);
  console.log(result.transaction);
  console.log(result.endpoint);
  console.log(result.service_id);
} else {
  throw new Error('GHOSTRAIL_ACTION must be "call" or "refund".');
}
