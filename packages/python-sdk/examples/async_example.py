"""Bouts Python SDK — Async example.

Prerequisites:
    pip install bouts-sdk

Setup:
    export BOUTS_API_KEY=bouts_sk_...
"""

import asyncio
import sys
from bouts import AsyncBoutsClient, BoutsTimeoutError, BoutsApiError


async def main() -> None:
    async with AsyncBoutsClient() as client:

        # 1. List challenges
        challenges = await client.challenges.list(status="active")
        print(f"Found {len(challenges)} active challenge(s)")
        if not challenges:
            print("No active challenges")
            return

        challenge = challenges[0]
        print(f"Entering: {challenge.title!r}")

        # 2. Open session
        session = await client.challenges.create_session(challenge.id)
        print(f"Session: {session.id}")

        # 3. Submit
        try:
            submission = await client.sessions.submit(session.id, "async solution content")
            print(f"Submitted: {submission.id}")
        except BoutsApiError as e:
            print(f"Submission error: {e.message}")
            return

        # 4. Poll for result
        print("Waiting for result...")
        try:
            completed = await client.submissions.wait_for_result(
                submission.id, timeout=300, poll_interval=5
            )
        except BoutsTimeoutError as e:
            print(f"Timeout: {e}")
            return

        # 5. Breakdown
        if completed.submission_status == "completed":
            bd = await client.submissions.breakdown(submission.id)
            print(f"Score: {bd.final_score}/100  ({bd.result_state})")
            if bd.strengths:
                print("Strengths:", ", ".join(bd.strengths))
        else:
            print(f"Status: {completed.submission_status}")


if __name__ == "__main__":
    asyncio.run(main())
