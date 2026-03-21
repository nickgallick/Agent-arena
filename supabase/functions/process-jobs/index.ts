import { getSupabaseClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req: Request) => {
  try {
    const supabase = getSupabaseClient()
    const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`

    // Pick one job using FOR UPDATE SKIP LOCKED
    const { data: job, error } = await supabase.rpc('pick_job', { worker_id: workerId })

    if (error || !job?.id) {
      return new Response(JSON.stringify({ status: 'no_jobs' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      switch (job.type) {
        case 'judge_challenge': {
          // Create individual judge_entry jobs for each entry
          const { data: entries } = await supabase
            .from('challenge_entries')
            .select('id')
            .eq('challenge_id', job.payload.challenge_id)
            .eq('status', 'submitted')

          if (entries) {
            const jobs = entries.flatMap((entry: any) =>
              ['alpha', 'beta', 'gamma'].map(judgeType => ({
                type: 'judge_entry',
                priority: 3,
                payload: {
                  entry_id: entry.id,
                  judge_type: judgeType,
                  challenge_id: job.payload.challenge_id,
                },
              }))
            )
            if (jobs.length > 0) {
              await supabase.from('job_queue').insert(jobs)
            }
          }
          break
        }

        case 'judge_entry': {
          // Delegate to the judge-entry function
          const baseUrl = Deno.env.get('SUPABASE_URL')
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          await fetch(`${baseUrl}/functions/v1/judge-entry`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify(job.payload),
          })
          break
        }

        case 'calculate_ratings': {
          const baseUrl = Deno.env.get('SUPABASE_URL')
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          await fetch(`${baseUrl}/functions/v1/calculate-ratings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify(job.payload),
          })
          break
        }

        case 'daily_challenge': {
          // Pick random unused prompt
          const { data: prompt } = await supabase
            .from('challenge_prompts')
            .select('*')
            .eq('is_used', false)
            .limit(1)
            .single()

          if (prompt) {
            const now = new Date()
            const startsAt = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
            const endsAt = new Date(now.getTime() + 25 * 60 * 60 * 1000) // +25 hours

            await supabase.from('challenges').insert({
              prompt_id: prompt.id,
              title: prompt.title,
              description: prompt.description,
              prompt: prompt.prompt,
              category: prompt.category,
              format: prompt.format,
              time_limit_minutes: prompt.time_limit_minutes,
              status: 'upcoming',
              challenge_type: 'daily',
              max_coins: prompt.max_coins,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
            })

            await supabase
              .from('challenge_prompts')
              .update({ is_used: true })
              .eq('id', prompt.id)
          }
          break
        }

        case 'close_challenge': {
          // Find and close expired active challenges
          const { data: expired } = await supabase
            .from('challenges')
            .select('id')
            .eq('status', 'active')
            .lte('ends_at', new Date().toISOString())

          if (expired) {
            for (const challenge of expired) {
              await supabase
                .from('challenges')
                .update({ status: 'judging' })
                .eq('id', challenge.id)

              await supabase.from('job_queue').insert({
                type: 'judge_challenge',
                priority: 2,
                payload: { challenge_id: challenge.id },
              })
            }
          }
          break
        }

        case 'health_check': {
          // Mark offline agents
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          await supabase
            .from('agents')
            .update({ is_online: false })
            .eq('is_online', true)
            .lt('last_ping_at', fiveMinAgo)
          break
        }

        case 'generate_result_card': {
          // Delegate to generate-result-card function
          const baseUrl = Deno.env.get('SUPABASE_URL')
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          await fetch(`${baseUrl}/functions/v1/generate-result-card`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify(job.payload),
          })
          break
        }
      }

      await supabase.rpc('complete_job', { job_id: job.id, success: true })
    } catch (err) {
      await supabase.rpc('complete_job', {
        job_id: job.id,
        success: false,
        error_message: (err as Error).message,
      })
    }

    return new Response(JSON.stringify({ status: 'processed', job_id: job.id }), {
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
