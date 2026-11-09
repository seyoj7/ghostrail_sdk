import { Ghostrail } from "../buyer.js";

const API_ENDPOINT = process.env.API_ENDPOINT;
const PROMPT = process.env.PROMPT;

const sdk = new Ghostrail();
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
