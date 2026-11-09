# GHOSTRAIL Python SDK

The GHOSTRAIL Python SDK lets buyers call services that require USDC payment and lets sellers register service APIs. Buyers use prepaid credit associated with buyer and seller wallets. The buyer client is in `buyer.py`; seller registration is in `seller.py`.

## Dependencies

- Python 3.10 or newer
- `solana==0.41.0` (with `solders` and SPL Token integrations)

The complete pinned dependency list is in [`requirements.txt`](./requirements.txt). The SDK is used directly from this repository and is not published as an installable Python package.

## Setup

Run these commands from the SDK directory, the folder containing `node` and `python`:

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r python\requirements.txt
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process Bypass` first, or invoke `.venv\Scripts\python.exe` directly.

Fill in `.env` for your devnet setup. `BUYER_PRIVATE_KEY` is the buyer's base58 private key and signs buyer transactions. `BUYER_ADDRESS` and `SELLER_ADDRESS` are public wallet addresses. The SDK has the devnet escrow program ID and USDC mint built in; only the Solana RPC URL is configurable. `SELLER_PRIVATE_KEY`, `FACILITATOR_PRIVATE_KEY`, and `FACILITATOR_PUBLIC_KEY` are optional for flows that need them. Set `GHOSTRAIL_ACTION=refund` and `ESCROW_ADDRESS` to run the refund flow through the call-service example. Keep `.env` and service delete tokens private.

The SDK defaults to `https://ghostrail-five.vercel.app`; set `FACILITATOR_URL` in `.env` to use another facilitator.

## Examples

Run each command from the SDK directory using Python module mode so the examples' relative imports resolve.

Call a service with prepaid credit. Configure `BUYER_PRIVATE_KEY`, `API_ENDPOINT`, and `PROMPT` in `.env`. For local development, the API endpoint is `http://127.0.0.1:8080/chat`:

```powershell
python -m python.examples.call_service
```

Check credit between the configured `BUYER_ADDRESS` and `SELLER_ADDRESS`:

```powershell
python -m python.examples.check_credit
```

Deposit credit for `SELLER_ADDRESS`. Configure `DEPOSIT_USDC` to change the amount:

```powershell
python -m python.examples.deposit_credit
```

Withdraw the remaining credit for `SELLER_ADDRESS`:

```powershell
python -m python.examples.withdraw_credit
```

To refund an expired escrow, set `GHOSTRAIL_ACTION=refund` and
`ESCROW_ADDRESS` in `.env`, then run the existing call-service example. The
buyer wallet needs devnet SOL for the transaction fee. Refunds do not require
facilitator signing credentials.

Register a service by setting `SERVICE_NAME`, `API_ENDPOINT`, `SELLER_ADDRESS`, and `PRICE_USDC` in `.env`. Set `API_ENDPOINT` to your service API, such as `http://127.0.0.1:8080/chat` locally; outside localhost it must use HTTPS. The script prints the service ID and one-time delete token. Store the token securely, and set `SERVICE_ID` and `DELETE_TOKEN` in `.env` to delete the registration later.

```powershell
python -m python.examples.register_service
python -m python.examples.delete_service
```
