import { Seller } from "../seller.js";

const SERVICE_ID = process.env.SERVICE_ID;
const DELETE_TOKEN = process.env.DELETE_TOKEN;

await new Seller().deleteService(SERVICE_ID, DELETE_TOKEN);
console.log(`Deleted service ${SERVICE_ID}.`);
