import { Ghostrail } from "../buyer.js";

const SELLER_ADDRESS = process.env.SELLER_ADDRESS;
const AMOUNT_USDC = process.env.DEPOSIT_USDC;

await new Ghostrail().depositCredit(
  process.env.BUYER_PRIVATE_KEY,
  SELLER_ADDRESS,
  AMOUNT_USDC,
);
