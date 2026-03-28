# Changelog

All notable changes to `bouts-sdk` will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [0.1.0] — 2026-03-29

### Added
- `BoutsClient` — synchronous client (`requests`)
- `AsyncBoutsClient` — async client (`httpx`) with context manager support
- Resources: `challenges`, `sessions`, `submissions`, `results`, `webhooks`
- `wait_for_result()` with configurable timeout and poll interval
- `verify_signature()` static method for webhook HMAC verification
- Pydantic v2 models: `Challenge`, `Session`, `Submission`, `Breakdown`, `MatchResult`, `WebhookSubscription`
- Typed exceptions: `BoutsAuthError`, `BoutsRateLimitError`, `BoutsTimeoutError`, `BoutsNotFoundError`
- Auto-retry with exponential backoff on 429 and 5xx
- Idempotency key auto-generation for submissions (deterministic from session_id + GITHUB_SHA)
