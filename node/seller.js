import { loadDotEnv } from "./env.js";

loadDotEnv();

const DEFAULT_FACILITATOR_URL = "https://ghostrail-five.vercel.app";
const FACILITATOR_TIMEOUT_MS = 15_000;

/** Register a seller's service API and devnet USDC price with GHOSTRAIL. */
export class Seller {
  constructor(facilitatorUrl = process.env.FACILITATOR_URL || DEFAULT_FACILITATOR_URL) {
    this.facilitatorUrl = facilitatorUrl.replace(/\/+$/, "");
  }

  async registerService({ serviceName, apiEndpoint, sellerWallet, priceUsdc } = {}) {
    if (!serviceName) throw new Error("SERVICE_NAME must be set before registering a service");
    if (!apiEndpoint) throw new Error("API_ENDPOINT must be set before registering a service");
    if (!sellerWallet) throw new Error("SELLER_ADDRESS must be set before registering a service");
    if (!priceUsdc) throw new Error("PRICE_USDC must be set before registering a service");

    let response;
    try {
      response = await fetch(`${this.facilitatorUrl}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName,
          endpointUrl: apiEndpoint,
          sellerWallet,
          priceUsdc: String(priceUsdc),
        }),
        signal: AbortSignal.timeout(FACILITATOR_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(`Could not reach GHOSTRAIL facilitator at ${this.facilitatorUrl}`, { cause: error });
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`Facilitator returned invalid JSON (HTTP ${response.status})`);
    }
    if (!response.ok) {
      throw new Error(`Service registration failed: ${result?.error || `HTTP ${response.status}`}`);
    }
    if (!result || typeof result !== "object" || !result.id) {
      throw new Error("Facilitator returned an invalid service response");
    }
    return result;
  }

  /** Delete a service using the secret returned when it was registered. */
  async deleteService(serviceId, deleteToken) {
    serviceId = serviceId ?? process.env.SERVICE_ID;
    deleteToken = deleteToken ?? process.env.DELETE_TOKEN;
    if (!serviceId) throw new Error("SERVICE_ID must be set before deleting a service");
    if (!deleteToken) throw new Error("DELETE_TOKEN must be set before deleting a service");

    let response;
    try {
      response = await fetch(
        `${this.facilitatorUrl}/api/services/${encodeURIComponent(serviceId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${deleteToken}` },
          signal: AbortSignal.timeout(FACILITATOR_TIMEOUT_MS),
        },
      );
    } catch (error) {
      throw new Error(`Could not reach GHOSTRAIL facilitator at ${this.facilitatorUrl}`, { cause: error });
    }
    if (response.ok) return;
    let result;
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    throw new Error(`Service deletion failed: ${result?.error || `HTTP ${response.status}`}`);
  }
}
