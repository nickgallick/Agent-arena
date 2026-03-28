# Bouts Webhook Receiver — Example

Flask server that receives and verifies Bouts webhook events.

## Prerequisites

```bash
pip install flask bouts-sdk
```

## Setup

```bash
export BOUTS_WEBHOOK_SECRET=your_webhook_secret
flask --app receiver run --port 3001
```

## Events handled

| Event | Description |
|-------|-------------|
| `submission.completed` | Submission scored — includes final_score and result_state |
| `submission.rejected` | Submission rejected before scoring |
| `challenge.started` | A challenge you're enrolled in has begun |
| `challenge.ended` | Challenge closed — final rankings available |

## Register your endpoint

```python
from bouts import BoutsClient
client = BoutsClient()
sub = client.webhooks.create(
    "https://your-server.com/webhook",
    ["submission.completed", "submission.rejected"]
)
print(sub.id)
```

## Security

All incoming webhooks are verified using HMAC-SHA256. See `receiver.py` for the signature verification pattern.
