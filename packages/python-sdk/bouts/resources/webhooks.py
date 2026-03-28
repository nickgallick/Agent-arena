import hashlib
import hmac
from typing import List, Optional

from ..models import WebhookSubscription


class WebhooksResource:
    """Sync webhooks resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    def list(self) -> List[WebhookSubscription]:
        """List all webhook subscriptions for the current API token.

        Returns:
            List of :class:`~bouts.models.WebhookSubscription` objects.
        """
        data = self._http.request("GET", "/api/v1/webhooks")
        return [WebhookSubscription(**w) for w in data.get("data", [])]

    def create(self, url: str, events: List[str]) -> WebhookSubscription:
        """Create a new webhook subscription.

        Args:
            url: HTTPS endpoint to deliver events to.
            events: List of event types to subscribe to (e.g. ``["submission.completed"]``).

        Returns:
            :class:`~bouts.models.WebhookSubscription`
        """
        data = self._http.request(
            "POST",
            "/api/v1/webhooks",
            json={"url": url, "events": events},
        )
        return WebhookSubscription(**data["data"])

    def delete(self, webhook_id: str) -> None:
        """Delete a webhook subscription.

        Args:
            webhook_id: UUID of the webhook subscription.
        """
        self._http.request("DELETE", f"/api/v1/webhooks/{webhook_id}")

    @staticmethod
    def verify_signature(payload: bytes, signature_header: str, secret: str) -> bool:
        """Verify an incoming webhook payload from Bouts.

        The ``X-Bouts-Signature`` header contains a ``sha256=<hex>`` HMAC
        signature computed with your webhook secret. This method verifies it
        using a constant-time comparison to prevent timing attacks.

        Args:
            payload: Raw request body bytes.
            signature_header: Value of the ``X-Bouts-Signature`` header.
            secret: Your webhook secret string.

        Returns:
            ``True`` if the signature is valid, ``False`` otherwise.

        Example::

            from bouts import BoutsClient
            payload = request.get_data()
            sig = request.headers.get("X-Bouts-Signature", "")
            if not BoutsClient.webhooks.verify_signature(payload, sig, secret):
                abort(401)
        """
        expected = "sha256=" + hmac.new(
            secret.encode("utf-8"), payload, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature_header, expected)


class AsyncWebhooksResource:
    """Async webhooks resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    async def list(self) -> List[WebhookSubscription]:
        data = await self._http.request("GET", "/api/v1/webhooks")
        return [WebhookSubscription(**w) for w in data.get("data", [])]

    async def create(self, url: str, events: List[str]) -> WebhookSubscription:
        data = await self._http.request(
            "POST",
            "/api/v1/webhooks",
            json={"url": url, "events": events},
        )
        return WebhookSubscription(**data["data"])

    async def delete(self, webhook_id: str) -> None:
        await self._http.request("DELETE", f"/api/v1/webhooks/{webhook_id}")

    @staticmethod
    def verify_signature(payload: bytes, signature_header: str, secret: str) -> bool:
        """Same as :meth:`WebhooksResource.verify_signature` — safe to call from sync context."""
        expected = "sha256=" + hmac.new(
            secret.encode("utf-8"), payload, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature_header, expected)
