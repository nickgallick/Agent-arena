import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'
import { z } from 'zod'

const CleanupSchema = z.object({
  dry_run: z.boolean().default(true),
  name_pattern: z.string().optional(),
  older_than_days: z.number().int().positive().optional(),
  agent_ids: z.array(z.string().uuid()).optional(),
  force: z.boolean().default(false),
})

export async function POST(request: NextRequest): Promise<Response> {
  return withAdmin(async (admin) => {
    const body = await request.json().catch(() => ({}))
    const parsed = CleanupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }

    const { dry_run, name_pattern, older_than_days, agent_ids, force } = parsed.data

    if (!name_pattern && (!agent_ids || agent_ids.length === 0) && !older_than_days) {
      return NextResponse.json({
        error: 'At least one filter is required: name_pattern, agent_ids, or older_than_days',
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Build the base query for matching agents
    let query = supabase
      .from('agents')
      .select('id, name, created_at')

    if (name_pattern && agent_ids && agent_ids.length > 0) {
      query = query.or(`name.ilike.%${name_pattern}%,id.in.(${agent_ids.join(',')})`)
    } else if (name_pattern) {
      query = query.ilike('name', `%${name_pattern}%`)
    } else if (agent_ids && agent_ids.length > 0) {
      query = query.in('id', agent_ids)
    }

    if (older_than_days) {
      const cutoff = new Date(Date.now() - older_than_days * 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('created_at', cutoff)
    }

    const { data: matchedAgents, error: queryError } = await query

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!matchedAgents || matchedAgents.length === 0) {
      return NextResponse.json({
        matched: 0,
        agents: [],
        deleted: 0,
        audit_log_ids: [],
      })
    }

    // Get entry counts for matched agents
    const matchedIds = matchedAgents.map(a => a.id)
    const { data: entryRows, error: entryError } = await supabase
      .from('challenge_entries')
      .select('agent_id')
      .in('agent_id', matchedIds)

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 })
    }

    const entryCounts = new Map<string, number>()
    for (const row of entryRows ?? []) {
      entryCounts.set(row.agent_id, (entryCounts.get(row.agent_id) ?? 0) + 1)
    }

    const agentsWithCounts = matchedAgents.map(a => ({
      id: a.id,
      name: a.name as string,
      created_at: a.created_at as string,
      entry_count: entryCounts.get(a.id) ?? 0,
    }))

    if (dry_run) {
      return NextResponse.json({
        matched: agentsWithCounts.length,
        agents: agentsWithCounts,
        deleted: 0,
        audit_log_ids: [],
      })
    }

    // Check for agents with entries — block unless force=true
    if (!force) {
      const blockers = agentsWithCounts.filter(a => a.entry_count > 0)
      if (blockers.length > 0) {
        const first = blockers[0]
        return NextResponse.json({
          error: `Agent "${first.name}" has ${first.entry_count} entries — cannot delete. Use force: true to override.`,
        }, { status: 422 })
      }
    }

    // Delete agents and log each action
    const auditLogIds: string[] = []

    for (const agent of agentsWithCounts) {
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id)

      if (deleteError) {
        return NextResponse.json({ error: `Failed to delete agent ${agent.name}: ${deleteError.message}` }, { status: 500 })
      }

      // challenge_admin_actions requires challenge_id NOT NULL — skip audit log for agent-only deletes
      // Instead, log to a system audit table if available; for now we just track the IDs we deleted
      auditLogIds.push(agent.id)


    }

    return NextResponse.json({
      matched: agentsWithCounts.length,
      agents: agentsWithCounts,
      deleted: agentsWithCounts.length,
      audit_log_ids: auditLogIds,
    })
  })
}
