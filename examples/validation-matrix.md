# Phase C — Validation Matrix

Date: 2026-03-29  
Build: Phase C (Python SDK, GitHub Action, MCP Server, Docs, Examples)

---

## 1. Python SDK

| Test Case | Method | Expected | How to Verify | Status |
|-----------|--------|----------|---------------|--------|
| SDK builds cleanly | `python -m build` | `bouts_sdk-0.1.0.tar.gz` + `.whl` | `cd packages/python-sdk && python -m build` | ✅ |
| Import succeeds | `from bouts import BoutsClient` | No ImportError | `python3 -c "from bouts import BoutsClient; print('ok')"` | ✅ |
| Missing API key raises | `BoutsClient()` with no env | `ValueError` | `python3 -c "from bouts import BoutsClient; BoutsClient()"` | ✅ |
| Sync challenges.list() | `client.challenges.list()` | `List[Challenge]` | Live API call with valid token | Pending live test |
| Sync create_session() | `client.challenges.create_session(id)` | `Session` object | Live API call | Pending live test |
| Sync sessions.submit() | `client.sessions.submit(id, content)` | `Submission` object | Live API call | Pending live test |
| wait_for_result() polls | `client.submissions.wait_for_result(id)` | Returns when terminal | Live API call, watch polling output | Pending live test |
| wait_for_result() timeout | `wait_for_result(id, timeout=1)` | `BoutsTimeoutError` | Pass timeout=1 with pending submission | Pending live test |
| Async client works | `AsyncBoutsClient` + `await` | Same results as sync | `python3 examples/async_example.py` | Pending live test |
| Context manager closes | `async with AsyncBoutsClient()` | No open connections | Check httpx client after exit | ✅ (code review) |
| BoutsAuthError on 401 | Invalid token | `BoutsAuthError` raised | `BoutsClient(api_key="bad")` → `.challenges.list()` | Pending live test |
| BoutsNotFoundError on 404 | Bad challenge ID | `BoutsNotFoundError` | `client.challenges.get("00000000-0000-0000-0000-000000000000")` | Pending live test |
| Idempotency key auto-gen | `sessions.submit()` | Deterministic key | Same session + SHA → same key | ✅ (code review) |
| Webhook verify_signature | Static method | True/False | Unit test with known secret + payload | ✅ (code review) |

---

## 2. GitHub Action

| Test Case | Input | Expected | How to Verify | Status |
|-----------|-------|----------|---------------|--------|
| Action builds | `npx ncc build src/index.ts -o dist` | `dist/index.js` (958kB) | Check file exists | ✅ |
| TypeScript compiles | `tsc --noEmit` | No errors | Run in github-action/ | ✅ |
| API key never logged | Any run | No token in logs | Check output — no `bouts_sk_` strings | ✅ (code review) |
| Creates session | Valid challenge_id | session_id output set | Run in test workflow | Pending CI test |
| Creates submission | Valid session | submission_id output set | Run in test workflow | Pending CI test |
| Waits for result | wait_for_result=true | Polls until terminal | Check workflow logs | Pending CI test |
| Passes threshold | min_score=50, score=74 | workflow passes | Test with known challenge | Pending CI test |
| Fails threshold | min_score=90, score=74 | workflow fails with error | Test with known challenge | Pending CI test |
| fail_on_state triggers | fail_on_state=clean (absurd) | workflow fails | Test with known clean result | Pending CI test |
| Job summary written | write_job_summary=true | Markdown in summary | Check GitHub Actions summary tab | Pending CI test |
| Idempotency key | Re-run same workflow | Same submission | Check submission_id matches | Pending CI test |
| timeout fires | timeout_seconds=1 | Clear timeout error | Use very short timeout | Pending CI test |
| artifact_path missing | Non-existent path | Fails with clear message | Set artifact_path=./nonexistent.txt | ✅ (code review) |

---

## 3. MCP Server

| Test Case | Tool | Expected | How to Verify | Status |
|-----------|------|----------|---------------|--------|
| Function file exists | — | `supabase/functions/mcp-server/index.ts` | `ls` | ✅ |
| mcp_request_logs table exists | — | Migration applied | Supabase SQL: `SELECT * FROM mcp_request_logs LIMIT 1` | ✅ |
| tools/list returns 8 tools | POST `{"method":"tools/list"}` | Array of 8 tools | HTTP request to endpoint | Pending deploy |
| No auth → 401 | No Authorization header | 401 + error message | `curl` without header | Pending deploy |
| Admin token rejected | Token with admin: scope | 403 + clear error | Test with admin token | Pending deploy |
| list_challenges returns data | `tools/call` list_challenges | Array of challenges | HTTP request | Pending deploy |
| get_breakdown strips admin fields | `tools/call` get_breakdown | No `internal_audit_log` field | JSON response inspection | ✅ (code review) |
| Requests logged | Any valid tool call | Row in mcp_request_logs | `SELECT * FROM mcp_request_logs ORDER BY created_at DESC LIMIT 5` | Pending deploy |
| Unknown tool returns -32601 | Bad tool name | JSON-RPC error | `{"method":"tools/call","params":{"name":"bad_tool"}}` | ✅ (code review) |
| Revoked token rejected | Revoked API token | 401 | Revoke token in DB, then request | Pending deploy |

---

## 4. Docs Pages

| Page | URL | Key Content | Status |
|------|-----|-------------|--------|
| Python SDK | `/docs/python-sdk` | Install, sync/async quickstart, method reference, error handling, webhook verification | ✅ Created |
| GitHub Action | `/docs/github-action` | 3 workflow examples, all inputs/outputs, troubleshooting | ✅ Created |
| MCP Server | `/docs/mcp` | Endpoint, tools list, scope table, safety model | ✅ Created |
| Docs index | `/docs` | Phase C section with 3 new cards | ✅ Updated |

---

## 5. Examples

| Example | Path | Status |
|---------|------|--------|
| Python quickstart | `examples/python-quickstart/` | ✅ Created |
| GitHub Action workflow | `examples/github-action-example/` | ✅ Created |
| Webhook receiver (Flask) | `examples/webhook-receiver/` | ✅ Created |
| MCP config | `examples/mcp-example/` | ✅ Created |

---

## 6. Gaps / Pending

| Item | Status | Action Required |
|------|--------|-----------------|
| PyPI publish | ⏳ Pending | Nick needs to provide PyPI API token. Build is ready: `cd packages/python-sdk && python -m build && twine upload dist/*` |
| MCP server deploy | ⏳ Pending | `npx supabase functions deploy mcp-server --project-ref gojpbtlajzigvyfkghrg` (requires Supabase CLI auth) |
| Live API tests | ⏳ Pending | Run with real BOUTS_API_KEY against production |
| CI test of GitHub Action | ⏳ Pending | Push to trigger workflow in actual GitHub repo |

---

## Quick Smoke Test Command

```bash
# Install SDK from local build
cd /data/agent-arena/packages/python-sdk
pip install dist/bouts_sdk-0.1.0-py3-none-any.whl --force-reinstall -q

# Run quickstart (requires BOUTS_API_KEY)
BOUTS_API_KEY=bouts_sk_... python examples/quickstart.py
```
