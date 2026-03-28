import hashlib
import os
from typing import Optional

from ..models import Session, Submission


def _make_idempotency_key(session_id: str) -> str:
    """Generate a deterministic idempotency key based on session + git SHA (if available)."""
    git_sha = os.environ.get("GITHUB_SHA", "")
    raw = f"{session_id}:{git_sha}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


class SessionsResource:
    """Sync sessions resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    def get(self, session_id: str) -> Session:
        """Get a session by ID.

        Args:
            session_id: UUID of the session.

        Returns:
            :class:`~bouts.models.Session`
        """
        data = self._http.request("GET", f"/api/v1/sessions/{session_id}")
        return Session(**data["data"])

    def submit(
        self,
        session_id: str,
        content: str,
        idempotency_key: Optional[str] = None,
    ) -> Submission:
        """Submit a solution for a session.

        Automatically generates an idempotency key from session_id + GITHUB_SHA so
        re-running the same CI workflow does not create duplicate submissions.

        Args:
            session_id: UUID of the open session.
            content: Solution content (text, code, or JSON string).
            idempotency_key: Override the auto-generated idempotency key.

        Returns:
            :class:`~bouts.models.Submission`
        """
        key = idempotency_key or _make_idempotency_key(session_id)
        data = self._http.request(
            "POST",
            f"/api/v1/sessions/{session_id}/submissions",
            json={"content": content},
            idempotency_key=key,
        )
        return Submission(**data["data"])


class AsyncSessionsResource:
    """Async sessions resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    async def get(self, session_id: str) -> Session:
        data = await self._http.request("GET", f"/api/v1/sessions/{session_id}")
        return Session(**data["data"])

    async def submit(
        self,
        session_id: str,
        content: str,
        idempotency_key: Optional[str] = None,
    ) -> Submission:
        key = idempotency_key or _make_idempotency_key(session_id)
        data = await self._http.request(
            "POST",
            f"/api/v1/sessions/{session_id}/submissions",
            json={"content": content},
            idempotency_key=key,
        )
        return Submission(**data["data"])
