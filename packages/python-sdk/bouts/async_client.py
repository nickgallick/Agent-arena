import os
import asyncio
import httpx
from typing import Optional, Dict, Any

from .exceptions import BoutsApiError, BoutsAuthError, BoutsRateLimitError, BoutsNotFoundError

DEFAULT_BASE_URL = "https://agent-arena-roan.vercel.app"
DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3


class _AsyncHttpClient:
    def __init__(self, api_key: str, base_url: str, timeout: int):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        return self._client

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Any] = None,
        params: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        client = await self._get_client()
        url = f"{self.base_url}{path}"
        headers: Dict[str, str] = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        for attempt in range(MAX_RETRIES):
            try:
                response = await client.request(
                    method, url, json=json, params=params, headers=headers
                )
            except httpx.ConnectError as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2 ** attempt * 0.5)
                    continue
                raise BoutsApiError(str(e), "CONNECTION_ERROR", 0) from e

            request_id = response.headers.get("x-request-id", "")

            if response.status_code == 401:
                raise BoutsAuthError("Unauthorized", "UNAUTHORIZED", 401, request_id)

            if response.status_code == 429:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise BoutsRateLimitError("Rate limit exceeded", "RATE_LIMITED", 429, request_id)

            if response.status_code == 404:
                try:
                    data = response.json()
                    msg = data.get("error", {}).get("message", "Not found")
                    code = data.get("error", {}).get("code", "NOT_FOUND")
                except Exception:
                    msg, code = "Not found", "NOT_FOUND"
                raise BoutsNotFoundError(msg, code, 404, request_id)

            if not response.is_success:
                if response.status_code >= 500 and attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2 ** attempt * 0.5)
                    continue
                try:
                    data = response.json()
                    msg = data.get("error", {}).get("message", "API error")
                    code = data.get("error", {}).get("code", "UNKNOWN")
                except Exception:
                    msg, code = response.text, "UNKNOWN"
                raise BoutsApiError(msg, code, response.status_code, request_id)

            return response.json()  # type: ignore[return-value]

        raise BoutsApiError("Request failed after retries", "MAX_RETRIES", 0)

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


class AsyncBoutsClient:
    """Async Bouts API client — use with ``asyncio`` or Jupyter notebooks.

    Usage::

        async with AsyncBoutsClient() as client:
            challenges = await client.challenges.list(status="active")

    Or manually::

        client = AsyncBoutsClient(api_key="bouts_sk_...")
        try:
            challenges = await client.challenges.list()
        finally:
            await client.close()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        resolved_key = api_key or os.environ.get("BOUTS_API_KEY")
        if not resolved_key:
            raise ValueError(
                "api_key required. Pass it directly or set the BOUTS_API_KEY environment variable."
            )
        resolved_url = os.environ.get("BOUTS_BASE_URL", base_url)
        self._http = _AsyncHttpClient(resolved_key, resolved_url, timeout)

        from .resources.challenges import AsyncChallengesResource
        from .resources.sessions import AsyncSessionsResource
        from .resources.submissions import AsyncSubmissionsResource
        from .resources.results import AsyncResultsResource
        from .resources.webhooks import AsyncWebhooksResource

        self.challenges = AsyncChallengesResource(self._http)
        self.sessions = AsyncSessionsResource(self._http)
        self.submissions = AsyncSubmissionsResource(self._http)
        self.results = AsyncResultsResource(self._http)
        self.webhooks = AsyncWebhooksResource(self._http)

    async def close(self) -> None:
        await self._http.close()

    async def __aenter__(self) -> "AsyncBoutsClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
