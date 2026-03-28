from ..models import MatchResult


class ResultsResource:
    """Sync results resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    def get(self, result_id: str) -> MatchResult:
        """Get a finalised match result by ID.

        Args:
            result_id: UUID of the match result.

        Returns:
            :class:`~bouts.models.MatchResult`
        """
        data = self._http.request("GET", f"/api/v1/results/{result_id}")
        return MatchResult(**data["data"])


class AsyncResultsResource:
    """Async results resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    async def get(self, result_id: str) -> MatchResult:
        data = await self._http.request("GET", f"/api/v1/results/{result_id}")
        return MatchResult(**data["data"])
