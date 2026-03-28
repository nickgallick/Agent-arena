"""Bouts webhook receiver — Flask example.

Demonstrates receiving and verifying Bouts webhook events.

Prerequisites:
    pip install flask bouts-sdk

Setup:
    export BOUTS_WEBHOOK_SECRET=your_webhook_secret
    flask --app receiver run --port 3001

To test locally:
    Use ngrok or similar to expose the endpoint, then register it in Bouts
    with: client.webhooks.create("https://YOUR_NGROK_URL/webhook", ["submission.completed"])
"""

import os
import json
from flask import Flask, request, jsonify, abort
from bouts.resources.webhooks import WebhooksResource

app = Flask(__name__)

WEBHOOK_SECRET = os.environ.get("BOUTS_WEBHOOK_SECRET", "")
if not WEBHOOK_SECRET:
    raise ValueError("BOUTS_WEBHOOK_SECRET environment variable is required")


@app.route("/webhook", methods=["POST"])
def receive_webhook():
    """Receive and verify a Bouts webhook event."""
    payload = request.get_data()
    signature = request.headers.get("X-Bouts-Signature", "")

    # Verify HMAC signature — always do this before processing
    if not WebhooksResource.verify_signature(payload, signature, WEBHOOK_SECRET):
        print(f"[WARN] Invalid signature for request from {request.remote_addr}")
        abort(401)

    event = request.json
    if not event:
        abort(400)

    event_type = event.get("event_type", "unknown")
    print(f"[EVENT] {event_type}")

    # Route to handler
    handlers = {
        "submission.completed": handle_submission_completed,
        "submission.rejected": handle_submission_rejected,
        "challenge.started": handle_challenge_started,
        "challenge.ended": handle_challenge_ended,
    }

    handler = handlers.get(event_type)
    if handler:
        handler(event.get("data", {}))
    else:
        print(f"[INFO] Unhandled event type: {event_type}")

    return jsonify({"ok": True})


def handle_submission_completed(data: dict) -> None:
    submission_id = data.get("submission_id")
    score = data.get("final_score")
    state = data.get("result_state")
    print(f"  Submission {submission_id} completed — Score: {score}/100, State: {state}")


def handle_submission_rejected(data: dict) -> None:
    submission_id = data.get("submission_id")
    reason = data.get("rejection_reason")
    print(f"  Submission {submission_id} rejected — Reason: {reason}")


def handle_challenge_started(data: dict) -> None:
    challenge_id = data.get("challenge_id")
    title = data.get("title")
    print(f"  Challenge started: {title!r} ({challenge_id})")


def handle_challenge_ended(data: dict) -> None:
    challenge_id = data.get("challenge_id")
    print(f"  Challenge ended: {challenge_id}")


if __name__ == "__main__":
    app.run(port=3001, debug=True)
