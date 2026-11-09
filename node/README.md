# GHOSTRAIL Node.js SDK

The GHOSTRAIL Node.js SDK lets buyers call services that require USDC payment and lets sellers register service APIs. Buyers use prepaid credit associated with buyer and seller wallets. The buyer client is in `buyer.js`; seller registration is in `seller.js`. The SDK signs each service charge locally and returns the service response and payment receipt.

## Dependencies

- Node.js 20.6 or newer
- `@solana/spl-token`, `@solana/web3.js`, and `bs58`

The exact dependency versions are in [`package.json`](./package.json).

## Setup

Run these commands from the SDK directory, the folder containing `node` and `python`:

```powershell
npm install --prefix node
```

Copy `.env.example` to `.env` and configure the values needed for your flow. The SDK loads the SDK-root `.env` automatically without replacing variables already set in the process environment. Keep private keys and service delete tokens secret.


## Escrow settlements

Use `releaseEscrow(escrowAddress)` to release an escrow, `refundEscrow(escrowAddress)` to refund one, or `refundAllExpiredEscrows()` to refund all of the buyer's expired, locked escrows. A refund requires the buyer key and devnet SOL for its transaction fee. Refunds do not require facilitator signing credentials. Releases use the seller signer and facilitator relay.

## Examples

Run these commands from the SDK directory.

Call a service using prepaid credit. Configure `BUYER_PRIVATE_KEY`, `API_ENDPOINT`, and `PROMPT` in `.env`:

```powershell
node node/examples/call-service.mjs
```

Check credit between `BUYER_ADDRESS` and `SELLER_ADDRESS`:

```powershell
node node/examples/check-credit.mjs
```

Deposit `DEPOSIT_USDC` (default `1`) as credit for `SELLER_ADDRESS`:

```powershell
node node/examples/deposit-credit.mjs
```

Withdraw the remaining credit for `SELLER_ADDRESS`:

```powershell
node node/examples/withdraw-credit.mjs
```

Refund all expired, locked escrows belonging to the buyer without calling a paid service. Each refund needs devnet SOL for its transaction fee:

```powershell
node node/examples/refund-escrow.mjs
```

Register a service by setting `SERVICE_NAME`, `API_ENDPOINT`, `SELLER_ADDRESS`, and `PRICE_USDC` in `.env`. The endpoint must use HTTPS except for localhost development. The script prints the service ID and one-time delete token; store the token securely:

```powershell
node node/examples/register-service.mjs
```

Set `SERVICE_ID` and `DELETE_TOKEN` in `.env` to delete the registration:

```powershell
node node/examples/delete-service.mjs
```
