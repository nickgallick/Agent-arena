import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const BASE_URL = core.getInput('base_url') || 'https://agent-arena-roan.vercel.app'

interface ApiError {
  error?: { message?: string; code?: string }
}

async function apiRequest(
  method: string,
  endpoint: string,
  apiKey: string,
  body?: object,
  idempotencyKey?: string
): Promise<unknown> {
  const url = `${BASE_URL}${endpoint}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      await sleep((2 ** attempt) * 1000)
      continue
    }
    if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
      await sleep((2 ** attempt) * 500)
      continue
    }

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`
      try {
        const errData = (await response.json()) as ApiError
        errMsg = errData.error?.message ?? errMsg
      } catch {}
      throw new Error(`API error: ${errMsg}`)
    }

    return await response.json()
  }
  throw new Error('Request failed after retries')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeIdempotencyKey(challengeId: string): string {
  const gitSha = process.env.GITHUB_SHA ?? ''
  const raw = `${challengeId}:${gitSha}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

function buildMarkdownSummary(
  challengeId: string,
  submissionId: string,
  score: number,
  state: string,
  confidence: string,
  lanes: Record<string, { score: number; summary: string }>,
  strengths: string[],
  resultUrl: string
): string {
  const laneRows = Object.entries(lanes)
    .map(([name, detail]) => `| ${name} | ${detail.score.toFixed(1)} |`)
    .join('\n')

  const strengthList = strengths.map((s) => `- ${s}`).join('\n')

  return `## 🏆 Bouts Submission Result

| | |
|---|---|
| **Challenge** | \`${challengeId}\` |
| **Submission** | \`${submissionId}\` |
| **Final Score** | **${score} / 100** |
| **Result State** | ${state} |
| **Confidence** | ${confidence} |

### Lane Breakdown
| Lane | Score |
|------|-------|
${laneRows}

### Strengths
${strengthList || '_No strengths data_'}

[View full breakdown →](${resultUrl})
`
}

async function run(): Promise<void> {
  // ── 1. Read & validate inputs ──────────────────────────────────────────
  const apiKey = core.getInput('api_key', { required: true })
  // NEVER log the api_key
  if (!apiKey) {
    core.setFailed('api_key is required')
    return
  }

  const challengeId = core.getInput('challenge_id', { required: true })
  const artifactPath = core.getInput('artifact_path', { required: true })
  const waitForResult = core.getInput('wait_for_result') !== 'false'
  const timeoutSec = parseInt(core.getInput('timeout_seconds') || '300', 10)
  const pollIntervalSec = parseInt(core.getInput('poll_interval_seconds') || '10', 10)
  const failOnStates = (core.getInput('fail_on_state') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const minScoreStr = core.getInput('min_score')
  const minScore = minScoreStr ? parseFloat(minScoreStr) : null
  const writeJobSummary = core.getInput('write_job_summary') !== 'false'

  // ── 2. Read artifact file ──────────────────────────────────────────────
  const resolvedPath = path.resolve(artifactPath)
  if (!fs.existsSync(resolvedPath)) {
    core.setFailed(`artifact_path not found: ${resolvedPath}`)
    return
  }
  const content = fs.readFileSync(resolvedPath, 'utf-8')
  core.info(`Artifact loaded: ${resolvedPath} (${content.length} chars)`)

  // ── 3. Create session ──────────────────────────────────────────────────
  core.info(`Creating session for challenge ${challengeId}...`)
  interface SessionResponse { data: { id: string } }
  const sessionRes = (await apiRequest(
    'POST',
    `/api/v1/challenges/${challengeId}/sessions`,
    apiKey
  )) as SessionResponse
  const sessionId: string = sessionRes.data.id
  core.setOutput('session_id', sessionId)
  core.info(`Session created: ${sessionId}`)

  // ── 4. Submit ──────────────────────────────────────────────────────────
  const idempotencyKey = makeIdempotencyKey(challengeId)
  core.info(`Submitting solution (idempotency key: ${idempotencyKey})...`)
  interface SubmissionResponse { data: { id: string } }
  const submitRes = (await apiRequest(
    'POST',
    `/api/v1/sessions/${sessionId}/submissions`,
    apiKey,
    { content },
    idempotencyKey
  )) as SubmissionResponse
  const submissionId: string = submitRes.data.id
  core.setOutput('submission_id', submissionId)
  core.info(`Submission created: ${submissionId}`)

  const resultUrl = `${BASE_URL}/compete/submissions/${submissionId}`
  core.setOutput('result_url', resultUrl)

  // ── 5. Early exit if not waiting ───────────────────────────────────────
  if (!waitForResult) {
    core.info('wait_for_result=false — exiting without polling')
    return
  }

  // ── 6. Poll for result ─────────────────────────────────────────────────
  const terminalStatuses = new Set(['completed', 'failed', 'rejected', 'invalidated'])
  const deadline = Date.now() + timeoutSec * 1000

  interface SubStatus { data: { submission_status: string } }
  let submissionStatus = ''

  core.info(`Waiting for result (timeout: ${timeoutSec}s, poll: ${pollIntervalSec}s)...`)
  while (true) {
    const statusRes = (await apiRequest(
      'GET',
      `/api/v1/submissions/${submissionId}`,
      apiKey
    )) as SubStatus
    submissionStatus = statusRes.data.submission_status
    core.info(`  Status: ${submissionStatus}`)

    if (terminalStatuses.has(submissionStatus)) break

    if (Date.now() > deadline) {
      core.setFailed(
        `Timeout: submission ${submissionId} did not complete within ${timeoutSec}s. Last status: ${submissionStatus}`
      )
      return
    }

    await sleep(pollIntervalSec * 1000)
  }

  // ── 7. Set result state output ─────────────────────────────────────────
  core.setOutput('result_state', submissionStatus)

  if (submissionStatus !== 'completed') {
    core.warning(`Submission ended with status: ${submissionStatus}`)
    if (failOnStates.includes(submissionStatus)) {
      core.setFailed(`Result state '${submissionStatus}' is in fail_on_state list`)
    }
    return
  }

  // ── 8. Fetch breakdown ─────────────────────────────────────────────────
  interface BreakdownResponse {
    data: {
      final_score: number
      result_state: string
      confidence_level?: string
      lane_breakdown?: Record<string, { score: number; summary: string }>
      strengths?: string[]
    }
  }
  const breakdownRes = (await apiRequest(
    'GET',
    `/api/v1/submissions/${submissionId}/breakdown`,
    apiKey
  )) as BreakdownResponse
  const bd = breakdownRes.data

  const finalScore = bd.final_score ?? 0
  const resultState = bd.result_state ?? submissionStatus
  const confidence = bd.confidence_level ?? 'unknown'
  const lanes = bd.lane_breakdown ?? {}
  const strengths = bd.strengths ?? []

  // ── 9. Set outputs ─────────────────────────────────────────────────────
  core.setOutput('final_score', String(finalScore))
  core.setOutput('result_state', resultState)
  core.setOutput('confidence_level', confidence)

  // ── 10. Write job summary ──────────────────────────────────────────────
  if (writeJobSummary) {
    const summary = buildMarkdownSummary(
      challengeId,
      submissionId,
      finalScore,
      resultState,
      confidence,
      lanes,
      strengths,
      resultUrl
    )
    await core.summary.addRaw(summary).write()
  }

  // ── 11. Evaluate thresholds ────────────────────────────────────────────
  let thresholdPassed = true

  if (minScore !== null && finalScore < minScore) {
    thresholdPassed = false
    core.setFailed(`Score ${finalScore} is below min_score threshold of ${minScore}`)
    core.setOutput('threshold_passed', 'false')
    return
  }

  if (failOnStates.length > 0 && failOnStates.includes(resultState)) {
    thresholdPassed = false
    core.setFailed(`Result state '${resultState}' is in fail_on_state list`)
    core.setOutput('threshold_passed', 'false')
    return
  }

  core.setOutput('threshold_passed', thresholdPassed ? 'true' : 'false')
  core.info(`✅ Bouts evaluation complete — Score: ${finalScore}/100, State: ${resultState}`)
}

run().catch((err: Error) => {
  core.setFailed(`Unexpected error: ${err.message}`)
})
