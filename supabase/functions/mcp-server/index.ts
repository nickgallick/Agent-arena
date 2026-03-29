/**
 * Bouts MCP Server — Supabase Edge Function
 *
 * Implements the Model Context Protocol (JSON-RPC 2.0) for the Bouts platform.
 * Exposes 8 tools for AI agents and MCP clients.
 *
 * Security model:
 * - Bearer token required on every request
 * - Admin-scoped tokens (scope contains "admin:") are REJECTED
 * - Breakdown responses are competitor-view only (no internal audit fields)
 * - All requests logged to mcp_request_logs table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOUTS_API_BASE = Deno.env.get('BOUTS_API_BASE') ?? 'https://agent-arena-roan.vercel.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_challenges',
    description: 'List challenges on the Bouts platform.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'upcoming', 'closed'],
          description: 'Filter by challenge status',
        },
        format: {
          type: 'string',
          enum: ['sprint', 'standard', 'marathon'],
          description: 'Filter by challenge format',
        },
        limit: {
          type: 'number',
          description: 'Max results (1-100, default 20)',
        },
        page: {
          type: 'number',
          description: 'Page number (default 1)',
        },
      },
    },
  },
  {
    name: 'get_challenge',
    description: 'Get details of a specific challenge by ID.',
    inputSchema: {
      type: 'object',
      required: ['challenge_id'],
      properties: {
        challenge_id: {
          type: 'string',
          description: 'UUID of the challenge',
        },
      },
    },
  },
  {
    name: 'create_session',
    description: 'Open a competition session for a challenge. Idempotent — safe to call multiple times.',
    inputSchema: {
      type: 'object',
      required: ['challenge_id'],
      properties: {
        challenge_id: {
          type: 'string',
          description: 'UUID of the challenge to enter',
        },
      },
    },
  },
  {
    name: 'submit_result',
    description: 'Submit a solution for an open session.',
    inputSchema: {
      type: 'object',
      required: ['session_id', 'content'],
      properties: {
        session_id: {
          type: 'string',
          description: 'UUID of the open session',
        },
        content: {
          type: 'string',
          description: 'Solution content (text, code, or JSON string)',
        },
        idempotency_key: {
          type: 'string',
          description: 'Optional idempotency key to prevent duplicate submissions',
        },
      },
    },
  },
  {
    name: 'get_submission_status',
    description: 'Get the current status of a submission.',
    inputSchema: {
      type: 'object',
      required: ['submission_id'],
      properties: {
        submission_id: {
          type: 'string',
          description: 'UUID of the submission',
        },
      },
    },
  },
  {
    name: 'get_result',
    description: 'Get the finalised match result for a submission.',
    inputSchema: {
      type: 'object',
      required: ['result_id'],
      properties: {
        result_id: {
          type: 'string',
          description: 'UUID of the match result',
        },
      },
    },
  },
  {
    name: 'get_breakdown',
    description:
      'Get the detailed evaluation breakdown for a completed submission. ' +
      'Returns competitor-visible fields only — no internal audit data.',
    inputSchema: {
      type: 'object',
      required: ['submission_id'],
      properties: {
        submission_id: {
          type: 'string',
          description: 'UUID of the completed submission',
        },
      },
    },
  },
  {
    name: 'get_leaderboard',
    description: 'Get the leaderboard for a challenge.',
    inputSchema: {
      type: 'object',
      required: ['challenge_id'],
      properties: {
        challenge_id: {
          type: 'string',
          description: 'UUID of the challenge',
        },
        limit: {
          type: 'number',
          description: 'Number of entries to return (default 20)',
        },
      },
    },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  }
}

function jsonRpcResult(id: string | number | null, result: unknown) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

async function boutsRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: object,
  idempotencyKey?: string
): Promise<unknown> {
  const url = `${BOUTS_API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }
  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await resp.json()
  if (!resp.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? `HTTP ${resp.status}`
    throw new Error(msg)
  }
  return data
}

async function logRequest(
  supabase: ReturnType<typeof createClient>,
  toolName: string,
  userId: string,
  scopeUsed: string,
  latencyMs: number,
  error?: string
) {
  try {
    await supabase.from('mcp_request_logs').insert({
      tool_name: toolName,
      user_id: userId,
      scope_used: scopeUsed,
      latency_ms: latencyMs,
      error: error ?? null,
    })
  } catch {
    // Non-critical — don't fail the request if logging fails
  }
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

async function handleToolCall(
  toolName: string,
  params: Record<string, unknown>,
  apiKey: string
): Promise<unknown> {
  switch (toolName) {
    case 'list_challenges': {
      const query = new URLSearchParams()
      if (params.status) query.set('status', String(params.status))
      if (params.format) query.set('format', String(params.format))
      query.set('limit', String(params.limit ?? 20))
      query.set('page', String(params.page ?? 1))
      return boutsRequest('GET', `/api/v1/challenges?${query}`, apiKey)
    }

    case 'get_challenge': {
      return boutsRequest('GET', `/api/v1/challenges/${params.challenge_id}`, apiKey)
    }

    case 'create_session': {
      return boutsRequest('POST', `/api/v1/challenges/${params.challenge_id}/sessions`, apiKey)
    }

    case 'submit_result': {
      const idempKey = params.idempotency_key ? String(params.idempotency_key) : undefined
      return boutsRequest(
        'POST',
        `/api/v1/sessions/${params.session_id}/submissions`,
        apiKey,
        { content: params.content },
        idempKey
      )
    }

    case 'get_submission_status': {
      return boutsRequest('GET', `/api/v1/submissions/${params.submission_id}`, apiKey)
    }

    case 'get_result': {
      return boutsRequest('GET', `/api/v1/results/${params.result_id}`, apiKey)
    }

    case 'get_breakdown': {
      // Fetch breakdown — competitor view only
      const rawData = await boutsRequest(
        'GET',
        `/api/v1/submissions/${params.submission_id}/breakdown`,
        apiKey
      ) as { data?: Record<string, unknown> }

      // Strip any admin-only fields before returning
      if (rawData?.data) {
        const safe = { ...rawData.data }
        // Remove fields that should never be visible to competitors via MCP
        delete safe['internal_audit_log']
        delete safe['judge_raw_output']
        delete safe['admin_notes']
        return { ...rawData, data: safe }
      }
      return rawData
    }

    case 'get_leaderboard': {
      const query = new URLSearchParams()
      query.set('limit', String(params.limit ?? 20))
      return boutsRequest(
        'GET',
        `/api/v1/leaderboards/${params.challenge_id}?${query}`,
        apiKey
      )
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const startTime = Date.now()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!apiKey) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32001, 'Missing Authorization header')),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Validate token via Supabase — hash the token before lookup (tokens stored as SHA-256)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey))
  const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  const { data: tokenRow } = await supabase
    .from('api_tokens')
    .select('id, user_id, scopes, revoked_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!tokenRow || tokenRow.revoked_at) {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32001, 'Invalid or revoked API token')),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Block admin-scoped tokens from MCP access
  const scopes: string[] = Array.isArray(tokenRow.scopes) ? tokenRow.scopes : []
  const hasAdminScope = scopes.some((s: string) => s.startsWith('admin:'))
  if (hasAdminScope) {
    return new Response(
      JSON.stringify(
        jsonRpcError(null, -32001, 'Admin-scoped tokens may not be used with the MCP server')
      ),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const userId = tokenRow.user_id as string
  const scopeUsed = scopes.join(',')

  // ── Parse request ─────────────────────────────────────────────────────
  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify(jsonRpcError(null, -32700, 'Parse error')),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const reqId = (body.id ?? null) as string | number | null
  const method = body.method ?? ''

  // ── Handle tools/list ─────────────────────────────────────────────────
  if (method === 'tools/list') {
    return new Response(
      JSON.stringify(jsonRpcResult(reqId, { tools: TOOLS })),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Handle tools/call ─────────────────────────────────────────────────
  if (method === 'tools/call') {
    const callParams = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
    const toolName = callParams.name ?? ''
    const toolArgs = callParams.arguments ?? {}

    if (!toolName) {
      return new Response(
        JSON.stringify(jsonRpcError(reqId, -32602, 'Missing tool name')),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    const toolExists = TOOLS.some((t) => t.name === toolName)
    if (!toolExists) {
      return new Response(
        JSON.stringify(jsonRpcError(reqId, -32601, `Unknown tool: ${toolName}`)),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    try {
      const result = await handleToolCall(toolName, toolArgs, apiKey)
      const latency = Date.now() - startTime
      await logRequest(supabase, toolName, userId, scopeUsed, latency)

      return new Response(
        JSON.stringify(
          jsonRpcResult(reqId, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          })
        ),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      const latency = Date.now() - startTime
      await logRequest(supabase, toolName, userId, scopeUsed, latency, errorMsg)

      return new Response(
        JSON.stringify(jsonRpcError(reqId, -32603, errorMsg)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // ── Unknown method ────────────────────────────────────────────────────
  return new Response(
    JSON.stringify(jsonRpcError(reqId, -32601, `Method not found: ${method}`)),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  )
})
