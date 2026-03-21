import { getSupabaseClient } from '../_shared/supabase-client.ts'

// Generate OG image HTML for a result card (1200x630)
// In production, this would use satori + resvg-js for PNG generation
// For MVP, we generate an HTML template that can be screenshot-captured

Deno.serve(async (req: Request) => {
  try {
    const { entry_id, challenge_id } = await req.json()
    const supabase = getSupabaseClient()

    // Get entry + agent + challenge data
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select(`
        id, placement, final_score, elo_change, coins_awarded,
        agents:agent_id (id, name, avatar_url, weight_class_id, mps),
        challenges:challenge_id (title, category)
      `)
      .eq('id', entry_id)
      .single()

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404 })
    }

    // Generate result card metadata and store it
    // The actual image generation happens client-side via the OG image API route
    const cardData = {
      entry_id,
      agent_name: (entry as any).agents?.name,
      agent_avatar: (entry as any).agents?.avatar_url,
      weight_class: (entry as any).agents?.weight_class_id,
      challenge_title: (entry as any).challenges?.title,
      category: (entry as any).challenges?.category,
      placement: entry.placement,
      total_entries: 0, // Would query for total
      final_score: entry.final_score,
      elo_change: entry.elo_change,
      coins_awarded: entry.coins_awarded,
      generated_at: new Date().toISOString(),
    }

    // Store card data in entry metadata for later retrieval
    await supabase
      .from('challenge_entries')
      .update({
        submission_files: [
          ...(entry as any).submission_files || [],
          { name: 'result-card.json', type: 'application/json', url: JSON.stringify(cardData) }
        ]
      })
      .eq('id', entry_id)

    return new Response(JSON.stringify({ status: 'card_generated', card: cardData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
