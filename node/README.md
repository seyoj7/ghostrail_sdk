# GHOSTRAIL Node.js SDK

The GHOSTRAIL Node.js SDK lets buyers call services that require USDC payment and lets sellers register service APIs.
It uses prepaid credit associated with the buyer and seller wallets.
Buyers can deposit credit for a seller and use it for multiple services with that seller wallet.
The SDK signs each service charge and returns the response and receipt details.
The Node.js buyer client is implemented in `buyer.js` and exported as both `Ghostrail` and `Buyer`.
Seller registration is implemented in `seller.js` and exported as `ghostrail-sdk/seller`.
The examples cover service calls, credit checks, deposits, withdrawals, service registration, and service deletion.
Like the Python SDK, Node loads the SDK-root `.env` file automatically without replacing variables already present in the process environment.

## Dependencies

The Node.js SDK requires Node.js 20.6 or newer and installs these runtime
dependencies:

- `@solana/spl-token` — Solana SPL Token account and instruction helpers
- `@solana/web3.js` — Solana RPC, transaction, and keypair support
- `bs58` — Base58 private-key decoding

The exact versions are declared in
[`package.json`](./package.json).

## Setup

Install dependencies from the SDK directory:

```powershell
npm install --prefix node
```

Set the wallet and service values in the SDK-root `.env` file. The escrow program ID and devnet USDC mint are fixed in the SDK. The facilitator defaults to `https://ghostrail-five.vercel.app`; set `FACILITATOR_URL` in `.env` to use another facilitator. Node.js 20.6 or newer is required.

For existing escrow settlements, use `releaseEscrow(escrowAddress)` or
`refundEscrow(escrowAddress)` on a `Ghostrail` client. These use the configured
seller signer or a caller signer, plus the facilitator signer from `.env`.
Refunds are permissionless after the escrow timeout and always return funds to
the buyer recorded in the escrow.

## Examples

Run these commands from the SDK directory:

```powershell
node node/examples/call-service.mjs
```

Calls a paid service using prepaid credit. Prints the response, transaction,
API endpoint, and service ID. Configure `API_ENDPOINT` and `PROMPT` in `.env`.

```powershell
node node/examples/check-credit.mjs
```

Checks and prints available credit using `BUYER_ADDRESS` and `SELLER_ADDRESS`.

```powershell
node node/examples/deposit-credit.mjs
```

Deposits `DEPOSIT_USDC` (default `1`) into credit for `SELLER_ADDRESS`.

```powershell
node node/examples/withdraw-credit.mjs
```

Withdraws the remaining credit for `SELLER_ADDRESS`.

Register a service using `SERVICE_NAME`, `API_ENDPOINT`, `SELLER_ADDRESS`, and
`PRICE_USDC` from `.env`. For local development, set `API_ENDPOINT` to
`http://127.0.0.1:8080/chat`, then run:

```powershell
node node/examples/register-service.mjs
```

The API Endpoint must use HTTPS except for localhost development. The script prints
the service ID and one-time `deleteToken` returned by the facilitator. Keep the
token private, then set `SERVICE_ID` and `DELETE_TOKEN` in `.env` and run:

```powershell
node node/examples/delete-service.mjs
```
