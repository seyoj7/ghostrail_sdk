import { Seller } from "../seller.js";

const SERVICE_NAME = process.env.SERVICE_NAME;
const API_ENDPOINT = process.env.API_ENDPOINT;
const SELLER_SOLANA_WALLET = process.env.SELLER_ADDRESS;
const PRICE_USDC = process.env.PRICE_USDC;

const service = await new Seller().registerService({
  serviceName: SERVICE_NAME,
  apiEndpoint: API_ENDPOINT,
  sellerWallet: SELLER_SOLANA_WALLET,
  priceUsdc: PRICE_USDC,
});

console.log("Service registered");
console.log(`Name: ${service.name}`);
console.log(`Service ID: ${service.id}`);
console.log(`API Endpoint: ${service.endpointUrl}`);
console.log(`Seller wallet: ${service.sellerWallet}`);
console.log(`Price: ${service.priceUsdc} devnet USDC`);
console.log(`Delete token (keep private): ${service.deleteToken}`);
