import { Ghostrail } from "../buyer.js";

const BUYER_ADDRESS = process.env.BUYER_ADDRESS;
const SELLER_ADDRESS = process.env.SELLER_ADDRESS;

const credits = await new Ghostrail().checkCredit(
  BUYER_ADDRESS,
  SELLER_ADDRESS,
);
console.log(`Available credit: ${credits} USDC`);
