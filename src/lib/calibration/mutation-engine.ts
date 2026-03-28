/**
 * Challenge Mutation Engine
 * 
 * Generates fresh challenge variants from existing challenges.
 * Triggered when: solve rate too high, contamination suspected, CDI collapse.
 * 
 * Three mutation types:
 * - semantic:    Change requirements/context while preserving structure
 * - structural:  Change code structure/architecture while preserving domain
 * - adversarial: Add deceptive elements, false leads, hidden invariants
 */

import type { MutationType } from './types'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface MutationInput {
  challenge_id: string
  title: string
  prompt: string
  category: string
  format: string
  challenge_type?: string | null
  difficulty_profile?: Record<string, number> | null
  mutation_type: MutationType
  mutation_generation?: number
}

export interface MutationOutput {
  parent_challenge_id: string
  mutation_type: MutationType
  mutation_generation: number
  title: string
  prompt: string
  description: string
  category: string
  format: string
  challenge_type: string | null
  difficulty_profile: Record<string, number>
  lineage: {
    parent: string
    generation: number
    mutation_chain: MutationType[]
    mutation_notes: string
  }
  mutation_notes: string
}

const MUTATION_SYSTEM_PROMPTS: Record<MutationType, string> = {
  semantic: `You are a challenge designer. Your job is to create a variation of an existing coding challenge by changing the domain, context, or surface framing while preserving the same core technical structure and difficulty level.

Rules:
- Keep the same underlying algorithmic structure
- Change the problem domain (e.g., filesystem bugs → network bugs)
- Change variable names, system context, and narrative
- Preserve hidden invariants and deceptive elements
- The mutation should not be recognizable as the original to someone who solved it`,

  structural: `You are a challenge designer. Your job is to create a variation of an existing coding challenge by restructuring the code architecture while keeping the same problem domain.

Rules:
- Keep the same domain and context
- Change the code structure (e.g., class-based → functional, sync → async, single file → multi-file)
- Change how the bug manifests technically while keeping the same conceptual problem
- Introduce new complexity through architectural changes
- Preserve the same difficulty level and discrimination power`,

  adversarial: `You are an expert challenge designer specializing in adversarial evaluation. Create a harder variant of an existing challenge by adding deceptive elements that expose shallow problem-solving.

Rules:
- Add one or more false leads (plausible-looking solutions that fail hidden invariants)
- Add one misleading diagnostic artifact (a log/error that points the wrong direction)
- Keep the true solution path intact but harder to find
- The challenge should punish premature convergence
- Elite agents should still succeed; standard agents should fail more often
- Do not change the core technical domain`,
}

async function callMutationLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    console.error('[mutation-engine] OPENROUTER_API_KEY not set')
    return null
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agent-arena-roan.vercel.app',
        'X-Title': 'Bouts Mutation Engine',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      console.error(`[mutation-engine] LLM returned ${res.status}`)
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch (err) {
    console.error('[mutation-engine] error:', err)
    return null
  }
}

export async function generateMutation(input: MutationInput): Promise<MutationOutput | null> {
  const systemPrompt = MUTATION_SYSTEM_PROMPTS[input.mutation_type]
  const generation = (input.mutation_generation ?? 0) + 1

  const userPrompt = `Original challenge:

Title: ${input.title}
Category: ${input.category}
Format: ${input.format}
Prompt:
${input.prompt}

Mutation type: ${input.mutation_type}
This will be generation ${generation} in the mutation chain.

Generate a mutated version. Return ONLY a JSON object with these fields:
{
  "title": "<new title>",
  "description": "<2-3 sentence description for the challenges listing>",
  "prompt": "<full challenge prompt — complete and self-contained>",
  "difficulty_profile": {
    "reasoning_depth": <1-10>,
    "tool_dependence": <1-10>,
    "ambiguity": <1-10>,
    "deception": <1-10>,
    "time_pressure": <1-10>,
    "error_recovery": <1-10>,
    "non_local_dependency": <1-10>,
    "evaluation_strictness": <1-10>
  },
  "mutation_notes": "<brief explanation of what changed and why>"
}`

  const response = await callMutationLLM(systemPrompt, userPrompt)
  if (!response) return null

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])

    return {
      parent_challenge_id: input.challenge_id,
      mutation_type: input.mutation_type,
      mutation_generation: generation,
      title: parsed.title ?? `${input.title} (Variant ${generation})`,
      prompt: parsed.prompt ?? input.prompt,
      description: parsed.description ?? '',
      category: input.category,
      format: input.format,
      challenge_type: input.challenge_type ?? null,
      difficulty_profile: parsed.difficulty_profile ?? input.difficulty_profile ?? {},
      lineage: {
        parent: input.challenge_id,
        generation,
        mutation_chain: [input.mutation_type],
        mutation_notes: parsed.mutation_notes ?? '',
      },
      mutation_notes: parsed.mutation_notes ?? '',
    }
  } catch (err) {
    console.error('[mutation-engine] JSON parse error:', err)
    return null
  }
}
