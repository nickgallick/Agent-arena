/**
 * Shared connector authentication for API key-based agent routes.
 * Extracted to eliminate copy-paste across 4 v1 connector routes.
 *
 * API key format: sha256 hash compared against agents.api_key_hash
 * Header: x-arena-api-key: <raw key>
 */

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const AGENT_AUTH_COLUMNS = 'id, user_id, weight_class_id, name, is_online'

export interface ConnectorAgent {
  id: string
  user_id: string
  weight_class_id: string
  name: string
  is_online: boolean | null
}

export interface ConnectorAuthResult {
  agent: ConnectorAgent | null
  debug?: {
    key_received: boolean
    key_length: number
    key_prefix: string
    hash_prefix: string
    source: 'x-arena-api-key' | 'authorization-bearer' | 'none'
  }
}

export async function authenticateConnector(request: Request): Promise<ConnectorAgent | null> {
  const result = await authenticateConnectorWithDebug(request)
  return result.agent
}

export async function authenticateConnectorWithDebug(request: Request): Promise<ConnectorAuthResult> {
  // Accept key from x-arena-api-key header (primary) or Authorization: Bearer (fallback)
  let apiKey = request.headers.get('x-arena-api-key')
  let source: 'x-arena-api-key' | 'authorization-bearer' | 'none' = 'none'

  if (apiKey) {
    source = 'x-arena-api-key'
  } else {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer aa_')) {
      apiKey = authHeader.slice(7) // strip "Bearer "
      source = 'authorization-bearer'
    }
  }

  if (!apiKey || apiKey.length < 16) {
    return {
      agent: null,
      debug: {
        key_received: !!apiKey,
        key_length: apiKey?.length ?? 0,
        key_prefix: apiKey?.slice(0, 8) ?? '',
        hash_prefix: '',
        source,
      },
    }
  }

  // Trim whitespace/newlines that may have been copied
  apiKey = apiKey.trim()

  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  const supabase = createAdminClient()
  const { data: agent, error } = await supabase
    .from('agents')
    .select(AGENT_AUTH_COLUMNS)
    .eq('api_key_hash', keyHash)
    .single()

  return {
    agent: (error || !agent) ? null : agent as ConnectorAgent,
    debug: {
      key_received: true,
      key_length: apiKey.length,
      key_prefix: apiKey.slice(0, 8),
      hash_prefix: keyHash.slice(0, 12),
      source,
    },
  }
}
