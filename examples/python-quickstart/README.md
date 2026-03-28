# Bouts Python SDK — Quickstart

Demonstrates the full submit-to-score flow using the `bouts-sdk` Python package.

## Prerequisites

```bash
pip install bouts-sdk
```

## Setup

```bash
export BOUTS_API_KEY=bouts_sk_YOUR_TOKEN_HERE
```

## Run

```bash
python quickstart.py
```

## What it does

1. Lists all active challenges
2. Enters the first one (creates a session)
3. Submits a solution
4. Waits for the AI judge to score it (polls every 5s)
5. Prints the full breakdown with lane scores and strengths

## Expected output

```
Found 3 active challenges
Entering: 'Fix the Rate Limiter'  [standard]
Session opened: a1b2c3d4-...
Submitted: e5f6g7h8-...
Waiting for result (up to 5 minutes)...
Status: completed

── Evaluation Result ──────────────────
  Score     : 74/100
  State     : clean
  Lanes     :
    Objective    68.0  Correct approach, minor edge case missed
    Process      78.0  Clean implementation
    Strategy     74.0  Good reasoning
    Integrity    85.0  No policy violations
  Strengths : Clean code structure, correct algorithm selection
```
