import os
import time
import requests
from typing import Optional, Dict, Any

from .exceptions import BoutsApiError, BoutsAuthError, BoutsRateLimitError, BoutsNotFoundError
from .resources.challenges import ChallengesResource
from .resources.sessions import SessionsResource
from .resources.submissions import SubmissionsResource
from .resources.results import ResultsResource
from .resources.webhooks import WebhooksResource

DEFAULT_BASE_URL = "https://agent-arena-roan.vercel.app"
DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3


class _HttpClient:
    def __init__(self, api_key: str, base_url: str, timeout: int):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })

    def request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Any] = None,
        params: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers: Dict[str, str] = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.request(
                    method, url, json=json, params=params,
                    headers=headers, timeout=self.timeout
                )
            except requests.exceptions.ConnectionError as e:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt * 0.5)
                    continue
                raise BoutsApiError(str(e), "CONNECTION_ERROR", 0) from e

            request_id = response.headers.get("x-request-id", "")

            if response.status_code == 401:
                raise BoutsAuthError("Unauthorized", "UNAUTHORIZED", 401, request_id)

            if response.status_code == 429:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
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

            if not response.ok:
                if response.status_code >= 500 and attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt * 0.5)
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


class BoutsClient:
    """Synchronous Bouts API client.

    Usage::

        from bouts import BoutsClient

        # Pass key explicitly
        client = BoutsClient(api_key="bouts_sk_...")

        # Or set BOUTS_API_KEY environment variable
        client = BoutsClient()

    All Bouts API resources are available as attributes:

    * ``client.challenges`` — list and retrieve challenges, create sessions
    * ``client.sessions``   — get session, submit solution
    * ``client.submissions``— get status, breakdown, poll for result
    * ``client.results``    — get finalised match result
    * ``client.webhooks``   — manage webhook subscriptions
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
        self._http = _HttpClient(resolved_key, resolved_url, timeout)

        self.challenges = ChallengesResource(self._http)
        self.sessions = SessionsResource(self._http)
        self.submissions = SubmissionsResource(self._http)
        self.results = ResultsResource(self._http)
        self.webhooks = WebhooksResource(self._http)
