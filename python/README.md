# GHOSTRAIL Python SDK

The GHOSTRAIL Python SDK lets buyers call services that require USDC payment and lets sellers register service APIs. Buyers use prepaid credit associated with buyer and seller wallets. The buyer client is in `buyer.py`; seller registration is in `seller.py`. The SDK signs each service charge locally and returns the service response and payment receipt.

## Dependencies

- Python 3.10 or newer
- `solana==0.41.0`, including its `solders` and SPL Token integrations

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

Configure the values needed for your flow in `.env`. The SDK loads this file automatically without replacing variables already set in the process environment. `BUYER_PRIVATE_KEY` signs buyer transactions; `BUYER_ADDRESS` and `SELLER_ADDRESS` are public wallet addresses. Keep private keys and service delete tokens secret.


## Escrow settlements

Use `refund_escrow(buyer_private_key, escrow_address)` to refund one escrow, or `refund_all_expired_escrows(buyer_private_key)` to refund all of the buyer's expired, locked escrows. If the address is omitted from `refund_escrow`, the SDK selects an escrow only when exactly one is refundable. Each refund requires the buyer key and devnet SOL for its transaction fee. Refunds do not require facilitator signing credentials. The Python `Buyer` client currently exposes manual refunds but does not expose escrow release.

## Examples

Run these commands from the SDK directory using Python module mode so the examples' relative imports resolve.

Call a service using prepaid credit. Configure `BUYER_PRIVATE_KEY`, `API_ENDPOINT`, and `PROMPT` in `.env`:

```powershell
python -m python.examples.call_service
```

Check credit between `BUYER_ADDRESS` and `SELLER_ADDRESS`:

```powershell
python -m python.examples.check_credit
```

Deposit `DEPOSIT_USDC` (default `1`) as credit for `SELLER_ADDRESS`:

```powershell
python -m python.examples.deposit_credit
```

Withdraw the remaining credit for `SELLER_ADDRESS`:

```powershell
python -m python.examples.withdraw_credit
```

Refund all expired, locked escrows belonging to the buyer without calling a paid service. Each refund needs devnet SOL for its transaction fee:

```powershell
python -m python.examples.refund_escrow
```

Register a service by setting `SERVICE_NAME`, `API_ENDPOINT`, `SELLER_ADDRESS`, and `PRICE_USDC` in `.env`. The endpoint must use HTTPS except for localhost development. The script prints the service ID and one-time delete token; store the token securely:

```powershell
python -m python.examples.register_service
```

Set `SERVICE_ID` and `DELETE_TOKEN` in `.env` to delete the registration:

```powershell
python -m python.examples.delete_service
```
