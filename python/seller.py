from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_FACILITATOR_URL = "https://ghostrail-five.vercel.app"


class Seller:

    def __init__(self, facilitator_url: str | None = None) -> None:
        self.facilitator_url = (
            facilitator_url or os.getenv("FACILITATOR_URL") or DEFAULT_FACILITATOR_URL
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
        request = Request(
            f"{self.facilitator_url}/api/services",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=15) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            try:
                details = json.loads(error.read().decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                details = {}
            message = details.get("error", f"HTTP {error.code}")
            raise RuntimeError(f"Service registration failed: {message}") from error
        except (URLError, TimeoutError) as error:
            raise RuntimeError(
                f"Could not reach GHOSTRAIL facilitator at {self.facilitator_url}"
            ) from error
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

        request = Request(
            f"{self.facilitator_url}/api/services/{service_id}",
            headers={"Authorization": f"Bearer {token}"},
            method="DELETE",
        )
        try:
            with urlopen(request, timeout=15):
                return
        except HTTPError as error:
            try:
                details = json.loads(error.read().decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                details = {}
            message = details.get("error", f"HTTP {error.code}")
            raise RuntimeError(f"Service deletion failed: {message}") from error
        except (URLError, TimeoutError) as error:
            raise RuntimeError(
                f"Could not reach GHOSTRAIL facilitator at {self.facilitator_url}"
            ) from error
