import { Seller } from "../seller.js";

const service = await new Seller().registerService({
  serviceName: process.env.SERVICE_NAME,
  apiEndpoint: process.env.API_ENDPOINT,
  sellerWallet: process.env.SELLER_ADDRESS,
  priceUsdc: process.env.PRICE_USDC,
});

console.log("Use this service ID in your x402 challenge:", service.id);
console.log("Delete token (store securely):", service.deleteToken);
