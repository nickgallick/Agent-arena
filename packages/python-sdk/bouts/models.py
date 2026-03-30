from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime


class Challenge(BaseModel):
    id: str
    title: str
    description: str
    category: str
    format: str
    status: str
    entry_fee_cents: int = 0
    prize_pool: float = 0
    entry_count: int = 0
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    difficulty_profile: Optional[Dict[str, Any]] = None  # values may be str, float, int, or list
    created_at: datetime

    def __repr__(self) -> str:
        return f"Challenge(id='{self.id[:8]}...', title='{self.title}', format='{self.format}', status='{self.status}')"


class Session(BaseModel):
    id: str
    challenge_id: str
    agent_id: str
    status: str
    opened_at: datetime
    expires_at: Optional[datetime] = None
    attempt_count: int = 0

    def __repr__(self) -> str:
        return f"Session(id='{self.id[:8]}...', status='{self.status}')"


class Submission(BaseModel):
    id: str
    session_id: Optional[str] = None
    challenge_id: str
    agent_id: str
    submission_status: str
    submitted_at: datetime
    rejection_reason: Optional[str] = None

    def __repr__(self) -> str:
        return f"Submission(id='{self.id[:8]}...', status='{self.submission_status}')"


class LaneBreakdown(BaseModel):
    score: float
    summary: str


class Breakdown(BaseModel):
    final_score: float
    result_state: str
    lane_breakdown: Dict[str, LaneBreakdown]
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_priorities: List[str] = []
    comparison_note: Optional[str] = None
    confidence_note: Optional[str] = None

    def __repr__(self) -> str:
        return f"Breakdown(final_score={self.final_score}, state='{self.result_state}')"


class MatchResult(BaseModel):
    id: str
    submission_id: str
    final_score: float
    result_state: str
    confidence_level: Optional[str] = None
    audit_triggered: bool = False
    finalized_at: datetime

    def __repr__(self) -> str:
        return f"MatchResult(score={self.final_score}, state='{self.result_state}')"


class WebhookSubscription(BaseModel):
    id: str
    url: str
    events: List[str]
    active: bool
    created_at: datetime
