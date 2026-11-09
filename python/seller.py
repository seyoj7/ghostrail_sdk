from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_FACILITATOR_URL = "https://ghostrail-five.vercel.app"
REQUEST_TIMEOUT_SECONDS = 15


def _facilitator_request(
    url: str,
    *,
    method: str,
    action: str,
    payload: dict[str, Any] | None = None,
    delete_token: str | None = None,
    expect_json: bool = True,
) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if delete_token:
        headers["Authorization"] = f"Bearer {delete_token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=data, headers=headers, method=method)

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            status = response.status
            body = response.read()
    except HTTPError as error:
        status = error.code
        body = error.read()
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Could not reach GHOSTRAIL facilitator at {url}") from error

    if 200 <= status < 300 and not expect_json:
        return {}
    if not body:
        result: dict[str, Any] = {}
    else:
        try:
            result = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise RuntimeError(f"Facilitator returned invalid JSON (HTTP {status})") from error
        if not isinstance(result, dict):
            raise RuntimeError("Facilitator returned an invalid response")

    if not 200 <= status < 300:
        message = result.get("error", f"HTTP {status}")
        raise RuntimeError(f"Service {action} failed: {message}")
    return result


class Seller:

    def __init__(self, facilitator_url: str | None = None) -> None:
        self.facilitator_url = (
            facilitator_url or DEFAULT_FACILITATOR_URL
        ).rstrip("/")

    def register_service(
        self,
        service_name: str | None,
        api_endpoint: str | None,
        seller_wallet: str | None,
        price_usdc: str | None,
    ) -> dict[str, Any]:
        if not service_name:
            raise ValueError("SERVICE_NAME must be set before registering a service")
        if not api_endpoint:
            raise ValueError("API_ENDPOINT must be set before registering a service")
        if not seller_wallet:
            raise ValueError("SELLER_ADDRESS must be set before registering a service")
        if not price_usdc:
            raise ValueError("PRICE_USDC must be set before registering a service")

        payload = {
            "name": service_name,
            "endpointUrl": api_endpoint,
            "sellerWallet": seller_wallet,
            "priceUsdc": str(price_usdc),
        }
        result = _facilitator_request(
            f"{self.facilitator_url}/api/services",
            method="POST",
            action="registration",
            payload=payload,
        )
        if not isinstance(result, dict) or not result.get("id"):
            raise RuntimeError(f"Facilitator returned an invalid service response: {result}")
        return result

    def delete_service(
        self, service_id: str | None, delete_token: str | None
    ) -> None:
        if not service_id:
            raise ValueError("SERVICE_ID must be set before deleting a service")
        token = delete_token or os.getenv("DELETE_TOKEN")
        if not token:
            raise ValueError("DELETE_TOKEN must be set before deleting a service")

        _facilitator_request(
            f"{self.facilitator_url}/api/services/{quote(service_id, safe='')}",
            method="DELETE",
            action="deletion",
            delete_token=token,
            expect_json=False,
        )
