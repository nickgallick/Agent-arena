import asyncio
import time
from typing import Optional

from ..models import Submission, Breakdown
from ..exceptions import BoutsTimeoutError

TERMINAL_STATUSES = {"completed", "failed", "rejected", "invalidated"}
DEFAULT_POLL_INTERVAL = 5  # seconds
DEFAULT_TIMEOUT = 300  # seconds


class SubmissionsResource:
    """Sync submissions resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    def get(self, submission_id: str) -> Submission:
        """Get a submission by ID.

        Args:
            submission_id: UUID of the submission.

        Returns:
            :class:`~bouts.models.Submission`
        """
        data = self._http.request("GET", f"/api/v1/submissions/{submission_id}")
        return Submission(**data["data"])

    def breakdown(self, submission_id: str) -> Breakdown:
        """Get the detailed evaluation breakdown for a submission.

        Only available after the submission reaches ``completed`` status.

        Args:
            submission_id: UUID of the submission.

        Returns:
            :class:`~bouts.models.Breakdown`
        """
        data = self._http.request("GET", f"/api/v1/submissions/{submission_id}/breakdown")
        return Breakdown(**data["data"])

    def wait_for_result(
        self,
        submission_id: str,
        timeout: int = DEFAULT_TIMEOUT,
        poll_interval: int = DEFAULT_POLL_INTERVAL,
    ) -> Submission:
        """Block until a submission reaches a terminal status.

        Polls the submission status every ``poll_interval`` seconds. Raises
        :class:`~bouts.exceptions.BoutsTimeoutError` if ``timeout`` is exceeded.

        Args:
            submission_id: UUID of the submission to poll.
            timeout: Maximum seconds to wait (default 300).
            poll_interval: Seconds between polls (default 5).

        Returns:
            :class:`~bouts.models.Submission` in terminal state.

        Raises:
            BoutsTimeoutError: If ``timeout`` is exceeded before a result arrives.
        """
        deadline = time.monotonic() + timeout
        while True:
            sub = self.get(submission_id)
            if sub.submission_status in TERMINAL_STATUSES:
                return sub
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise BoutsTimeoutError(
                    f"Submission {submission_id} did not complete within {timeout}s. "
                    f"Last status: {sub.submission_status}"
                )
            time.sleep(min(poll_interval, remaining))


class AsyncSubmissionsResource:
    """Async submissions resource."""

    def __init__(self, http: object) -> None:
        self._http = http  # type: ignore[assignment]

    async def get(self, submission_id: str) -> Submission:
        data = await self._http.request("GET", f"/api/v1/submissions/{submission_id}")
        return Submission(**data["data"])

    async def breakdown(self, submission_id: str) -> Breakdown:
        data = await self._http.request("GET", f"/api/v1/submissions/{submission_id}/breakdown")
        return Breakdown(**data["data"])

    async def wait_for_result(
        self,
        submission_id: str,
        timeout: int = DEFAULT_TIMEOUT,
        poll_interval: int = DEFAULT_POLL_INTERVAL,
    ) -> Submission:
        """Async version of :meth:`SubmissionsResource.wait_for_result`."""
        deadline = asyncio.get_event_loop().time() + timeout
        while True:
            sub = await self.get(submission_id)
            if sub.submission_status in TERMINAL_STATUSES:
                return sub
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                raise BoutsTimeoutError(
                    f"Submission {submission_id} did not complete within {timeout}s. "
                    f"Last status: {sub.submission_status}"
                )
            await asyncio.sleep(min(poll_interval, remaining))
