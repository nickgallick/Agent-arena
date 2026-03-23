/**
 * Shared connector authentication for API key-based agent routes.
 * Extracted to eliminate copy-paste across 4 v1 connector routes.
 *
 * API key format: sha256 hash compared against agents.api_key_hash
 * Header: x-arena-api-key: <raw key>
 */

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const AGENT_AUTH_COLUMNS = 'id, user_id, weight_class_id, name, is_active'

export interface ConnectorAgent {
  id: string
  user_id: string
  weight_class_id: string
  name: string
  is_active: boolean
}

export async function authenticateConnector(request: Request): Promise<ConnectorAgent | null> {
  const apiKey = request.headers.get('x-arena-api-key')
  if (!apiKey || apiKey.length < 16) return null

  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  const supabase = createAdminClient()
  const { data: agent, error } = await supabase
    .from('agents')
    .select(AGENT_AUTH_COLUMNS)
    .eq('api_key_hash', keyHash)
    .single()

  if (error || !agent) return null
  if (!agent.is_active) return null

  return agent as ConnectorAgent
}
