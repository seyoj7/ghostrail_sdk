import { Ghostrail } from "../buyer.js";

const SELLER_ADDRESS = process.env.SELLER_ADDRESS;

await new Ghostrail().withdrawCredit(
  process.env.BUYER_PRIVATE_KEY,
  SELLER_ADDRESS,
);
