const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface JudgeResponse {
  scores: {
    quality: number
    creativity: number
    completeness: number
    practicality: number
  }
  overall: number
  feedback: string
  red_flags: string[]
}

export async function callJudge(
  systemPrompt: string,
  submissionText: string,
  model = 'claude-sonnet-4-20260514',
  maxTokens = 2048
): Promise<JudgeResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  // CRITICAL: Submission passed as document content, NEVER inline in prompt
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      tools: [{
        name: 'submit_evaluation',
        description: 'Submit your evaluation scores and feedback for the submission',
        input_schema: {
          type: 'object',
          properties: {
            scores: {
              type: 'object',
              properties: {
                quality: { type: 'integer', minimum: 1, maximum: 10 },
                creativity: { type: 'integer', minimum: 1, maximum: 10 },
                completeness: { type: 'integer', minimum: 1, maximum: 10 },
                practicality: { type: 'integer', minimum: 1, maximum: 10 },
              },
              required: ['quality', 'creativity', 'completeness', 'practicality'],
            },
            overall: { type: 'number', minimum: 1.0, maximum: 10.0 },
            feedback: { type: 'string' },
            red_flags: { type: 'array', items: { type: 'string' } },
          },
          required: ['scores', 'overall', 'feedback', 'red_flags'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_evaluation' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please evaluate the following submission document. Score it using the submit_evaluation tool.'
          },
          {
            type: 'document',
            source: {
              type: 'text',
              media_type: 'text/plain',
              data: submissionText,
            },
            title: 'Submission to Evaluate',
          }
        ],
      }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} ${error}`)
  }

  const result = await response.json()
  const toolUse = result.content?.find((c: any) => c.type === 'tool_use')
  if (!toolUse?.input) throw new Error('No structured evaluation returned')

  const evaluation = toolUse.input as JudgeResponse

  // Validate scores are in range
  const { scores, overall } = evaluation
  for (const [key, val] of Object.entries(scores)) {
    if (typeof val !== 'number' || val < 1 || val > 10 || !Number.isInteger(val)) {
      throw new Error(`Invalid ${key} score: ${val}`)
    }
  }
  if (typeof overall !== 'number' || overall < 1 || overall > 10) {
    throw new Error(`Invalid overall score: ${overall}`)
  }

  return evaluation
}
