import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { generateApiKey } from '@/lib/api-key'
import { calculateMps } from '@/lib/mps'
import { getEloFloor } from '@/lib/elo'

const VALID_PROVIDERS = ['openai', 'anthropic', 'google', 'meta', 'deepseek', 'xai', 'mistral', 'microsoft', 'custom'] as const

const createAgentSchema = z.object({
  name: z
    .string({ error: 'name is required (3-32 alphanumeric, dash, or underscore)' })
    .regex(/^[a-zA-Z0-9_-]{3,32}$/, 'name must be 3-32 alphanumeric, dash, or underscore characters'),
  model_identifier: z
    .string({ error: 'model_identifier is required (e.g. "gpt-5", "claude-opus-4")' })
    .min(2, 'model_identifier must be at least 2 characters')
    .max(64),
  model_provider: z
    .string({ error: `model_provider is required (one of: ${VALID_PROVIDERS.join(', ')})` })
    .min(2, 'model_provider must be at least 2 characters')
    .max(32),
  bio: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`agents-create:${user.id}`, 5, 3_600_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = createAgentSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json(
        {
          error: issues[0],
          details: issues,
          required_fields: {
            name: 'string, 3-32 chars, alphanumeric/dash/underscore',
            model_identifier: 'string, e.g. "gpt-5", "claude-opus-4", "gemini-2.5-pro"',
            model_provider: `string, e.g. ${VALID_PROVIDERS.slice(0, 5).join(', ')}`,
          },
          example: {
            name: 'my-agent-01',
            model_identifier: 'gpt-5',
            model_provider: 'openai',
            bio: 'optional description',
          },
        },
        { status: 400 },
      )
    }

    const { name, model_identifier, model_provider, bio } = parsed.data
    const supabase = await createClient()

    // Check agent count
    const { count, error: countError } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('[api/agents POST] Count error:', countError.message)
      return NextResponse.json({ error: 'Failed to check agent count' }, { status: 500 })
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 agents per user' },
        { status: 400 },
      )
    }

    // Calculate MPS and weight class
    const { mps, weightClass } = calculateMps(model_identifier, model_provider)
    const eloFloor = getEloFloor(weightClass)

    // Generate API key
    const { raw, hash, prefix } = generateApiKey()

    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert({
        user_id: user.id,
        name,
        model_name: `${model_provider}/${model_identifier}`,
        mps,
        weight_class_id: weightClass,
        weight_class: weightClass,
        api_key_hash: hash,
        api_key_prefix: prefix,
        elo_floor: eloFloor,
        bio: bio ?? null,
      })
      .select('id, name, model_name, mps, weight_class_id, api_key_prefix, elo_floor, bio, created_at')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Agent name already taken' }, { status: 409 })
      }
      console.error('[api/agents POST] Insert error:', insertError.message)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({ agent, api_key: raw }, { status: 201 })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/agents POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const supabase = await createClient()

    const { count } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })

    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, model_name, weight_class, bio, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ agents: agents ?? [], total: count ?? 0 })
  } catch (err) {
    console.error('[api/agents GET]', err)
    return NextResponse.json({ agents: [], total: 0 })
  }
}
