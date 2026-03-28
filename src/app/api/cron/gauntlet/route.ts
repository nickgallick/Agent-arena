/**
 * Gauntlet Cron — Scheduled Challenge Generation
 *
 * Runs on a schedule to ensure the challenge pipeline is always stocked.
 * Flow: generate N challenges into draft → queue for calibration → calibrated ones enter reserve → promoted to upcoming
 *
 * Schedule: every 6 hours (configured in vercel.json)
 * 
 * Target: maintain a minimum buffer of calibrated challenges in reserve
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agent-arena-roan.vercel.app'
const CRON_SECRET = process.env.CRON_SECRET

// Minimum calibrated challenges to keep in reserve
const RESERVE_BUFFER_TARGET = 5

// Challenge generation config
const CHALLENGE_CATEGORIES = ['debugging', 'algorithm', 'systems', 'fullstack', 'security']
const CHALLENGE_FORMATS = ['sprint', 'agentic']
const GENERATION_MODEL = 'anthropic/claude-sonnet-4-6'

interface GeneratedChallenge {
  title: string
  prompt: string
  description: string
  category: string
  format: string
  difficulty: string
  time_limit_minutes: number
  has_objective_tests: boolean
  difficulty_profile: Record<string, number>
}

async function generateChallenge(category: string, format: string): Promise<GeneratedChallenge | null> {
  if (!OPENROUTER_API_KEY) return null

  const difficultyLevel = Math.random() < 0.3 ? 'hard' : Math.random() < 0.6 ? 'medium' : 'hard'

  const systemPrompt = `You generate coding challenges for an AI agent competition platform. 
Challenges must have clear success criteria and discriminate between weak and strong agents.
Return ONLY valid JSON — no markdown, no explanation.`

  const userPrompt = `Generate a ${difficultyLevel} ${category} challenge in ${format} format.

Requirements:
- Must have 2-4 specific bugs or requirements that naive agents will miss
- Must include concrete, testable success criteria  
- Must be solvable by a frontier AI (Claude/GPT-4) but challenging
- Avoid trivially easy tasks (sorting, basic CRUD, hello world)
- ${format === 'agentic' ? 'Multi-step task requiring tool use and planning' : '30-minute sprint with clear deliverable'}

Return JSON:
{
  "title": "Short descriptive title",
  "description": "One sentence what this challenge tests",
  "prompt": "Full challenge prompt (200-400 words). Include specific requirements, constraints, and what counts as correct.",
  "category": "${category}",
  "format": "${format}",
  "difficulty": "${difficultyLevel}",
  "time_limit_minutes": ${format === 'agentic' ? 60 : 30},
  "has_objective_tests": true,
  "difficulty_profile": {
    "technical_depth": <1-10>,
    "hidden_invariants": <1-10>,
    "ambiguity": <1-10>
  }
}`

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': APP_URL,
        'X-Title': 'Bouts Gauntlet',
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.8,  // higher variance for diverse challenge generation
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as GeneratedChallenge
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Check current reserve buffer
  const { count: reserveCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'reserve')
    .eq('calibration_status', 'passed')

  const currentBuffer = reserveCount ?? 0

  if (currentBuffer >= RESERVE_BUFFER_TARGET) {
    console.log(`[gauntlet] Reserve buffer sufficient: ${currentBuffer}/${RESERVE_BUFFER_TARGET} — skipping generation`)
    return NextResponse.json({
      message: 'Reserve buffer sufficient — no generation needed',
      reserve_count: currentBuffer,
      target: RESERVE_BUFFER_TARGET,
    })
  }

  const needed = RESERVE_BUFFER_TARGET - currentBuffer
  // Generate more than needed to account for calibration failures
  const toGenerate = Math.min(needed * 2, 8)

  console.log(`[gauntlet] Reserve buffer low: ${currentBuffer}/${RESERVE_BUFFER_TARGET} — generating ${toGenerate} challenges`)

  const generated: string[] = []
  const failed: string[] = []
  const queued: string[] = []

  for (let i = 0; i < toGenerate; i++) {
    const category = CHALLENGE_CATEGORIES[i % CHALLENGE_CATEGORIES.length]
    const format = CHALLENGE_FORMATS[i % CHALLENGE_FORMATS.length]

    try {
      const challenge = await generateChallenge(category, format)
      if (!challenge) {
        failed.push(`generation_${i}`)
        continue
      }

      // Insert into DB as draft
      const { data: inserted, error } = await supabase
        .from('challenges')
        .insert({
          title: challenge.title,
          description: challenge.description,
          prompt: challenge.prompt,
          category: challenge.category,
          format: challenge.format,
          difficulty: challenge.difficulty,
          time_limit_minutes: challenge.time_limit_minutes,
          has_objective_tests: challenge.has_objective_tests,
          difficulty_profile: challenge.difficulty_profile,
          status: 'upcoming',
          calibration_status: 'pending',
          source: 'gauntlet',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error || !inserted) {
        console.error(`[gauntlet] insert failed for challenge ${i}:`, error?.message)
        failed.push(`insert_${i}`)
        continue
      }

      generated.push(inserted.id)

      // Queue for calibration immediately
      const calibrateRes = await fetch(`${APP_URL}/api/internal/auto-calibrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET ?? ''}`,
        },
        body: JSON.stringify({ challenge_id: inserted.id, force_real_llm: true }),
      })

      if (calibrateRes.ok) {
        queued.push(inserted.id)
      } else {
        // Still inserted — manual calibration can pick it up
        console.warn(`[gauntlet] calibration queue failed for ${inserted.id}: ${calibrateRes.status}`)
      }

      // Small delay between generations to avoid rate limits
      if (i < toGenerate - 1) await new Promise(r => setTimeout(r, 1000))

    } catch (err) {
      console.error(`[gauntlet] error generating challenge ${i}:`, err)
      failed.push(`error_${i}`)
    }
  }

  console.log(`[gauntlet] complete — generated=${generated.length} queued=${queued.length} failed=${failed.length}`)

  return NextResponse.json({
    reserve_buffer_before: currentBuffer,
    target: RESERVE_BUFFER_TARGET,
    generated: generated.length,
    calibration_queued: queued.length,
    failed: failed.length,
    challenge_ids: generated,
  })
}
