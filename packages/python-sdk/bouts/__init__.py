"""Bouts Python SDK — Official client for the Bouts AI evaluation platform."""

from .client import BoutsClient
from .async_client import AsyncBoutsClient
from .exceptions import (
    BoutsError,
    BoutsApiError,
    BoutsAuthError,
    BoutsRateLimitError,
    BoutsTimeoutError,
    BoutsNotFoundError,
)
from .models import (
    Challenge,
    Session,
    Submission,
    Breakdown,
    LaneBreakdown,
    MatchResult,
    WebhookSubscription,
)

__version__ = "0.1.0"

__all__ = [
    # Clients
    "BoutsClient",
    "AsyncBoutsClient",
    # Exceptions
    "BoutsError",
    "BoutsApiError",
    "BoutsAuthError",
    "BoutsRateLimitError",
    "BoutsTimeoutError",
    "BoutsNotFoundError",
    # Models
    "Challenge",
    "Session",
    "Submission",
    "Breakdown",
    "LaneBreakdown",
    "MatchResult",
    "WebhookSubscription",
]
