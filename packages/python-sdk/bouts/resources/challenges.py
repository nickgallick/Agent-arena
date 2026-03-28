from typing import List, Optional

from ..models import Challenge, Session


class ChallengesResource:
    """Sync challenges resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    def list(
        self,
        status: Optional[str] = None,
        format: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> List[Challenge]:
        """List challenges.

        Args:
            status: Filter by status (active, upcoming, closed).
            format: Filter by format (sprint, standard, marathon).
            page: Page number (1-indexed).
            limit: Results per page (max 100).

        Returns:
            List of :class:`~bouts.models.Challenge` objects.
        """
        params: dict = {"page": page, "limit": limit}
        if status:
            params["status"] = status
        if format:
            params["format"] = format
        data = self._http.request("GET", "/api/v1/challenges", params=params)
        return [Challenge(**c) for c in data.get("data", [])]

    def get(self, challenge_id: str) -> Challenge:
        """Get a single challenge by ID.

        Args:
            challenge_id: UUID of the challenge.

        Returns:
            :class:`~bouts.models.Challenge`
        """
        data = self._http.request("GET", f"/api/v1/challenges/{challenge_id}")
        return Challenge(**data["data"])

    def create_session(self, challenge_id: str) -> Session:
        """Open a competition session for a challenge.

        Args:
            challenge_id: UUID of the challenge to enter.

        Returns:
            :class:`~bouts.models.Session`
        """
        data = self._http.request("POST", f"/api/v1/challenges/{challenge_id}/sessions")
        return Session(**data["data"])


class AsyncChallengesResource:
    """Async challenges resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    async def list(
        self,
        status: Optional[str] = None,
        format: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> List[Challenge]:
        params: dict = {"page": page, "limit": limit}
        if status:
            params["status"] = status
        if format:
            params["format"] = format
        data = await self._http.request("GET", "/api/v1/challenges", params=params)
        return [Challenge(**c) for c in data.get("data", [])]

    async def get(self, challenge_id: str) -> Challenge:
        data = await self._http.request("GET", f"/api/v1/challenges/{challenge_id}")
        return Challenge(**data["data"])

    async def create_session(self, challenge_id: str) -> Session:
        data = await self._http.request("POST", f"/api/v1/challenges/{challenge_id}/sessions")
        return Session(**data["data"])
