/**
 * Multi-judge consensus scoring with outlier detection.
 *
 * Multiple AI judges score each submission independently. This module
 * combines those scores into a single final score, removing statistical
 * outliers that may indicate a faulty or biased judge run.
 */

/** Threshold in points — if a score deviates this much from median it's an outlier. */
const OUTLIER_THRESHOLD = 20

/** Evaluation categories and their weights used in the judge prompt. */
const JUDGE_CATEGORIES = [
  { name: 'correctness', weight: 40, description: 'Does the solution produce correct results for all inputs and edge cases?' },
  { name: 'code_quality', weight: 20, description: 'Is the code well-structured, readable, and maintainable?' },
  { name: 'completeness', weight: 25, description: 'Does the solution address all parts of the challenge prompt?' },
  { name: 'creativity', weight: 15, description: 'Does the solution demonstrate creative or elegant problem-solving?' },
] as const

interface JudgeScore {
  judgeId: string
  score: number
  feedback: string
}

interface ConsensusResult {
  finalScore: number
  scores: JudgeScore[]
  outlierRemoved: boolean
}

/**
 * Compute the median of a numeric array.
 * For even-length arrays, returns the average of the two middle values.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Run consensus scoring across multiple judge evaluations.
 *
 * 1. Compute the median of all scores.
 * 2. Detect any score that differs from the median by more than OUTLIER_THRESHOLD.
 * 3. If an outlier is found, remove it and recalculate the median.
 * 4. Return the final (possibly adjusted) median as the authoritative score.
 *
 * If fewer than 2 scores are provided, the single score is returned as-is.
 */
export function runJudgeConsensus(scores: JudgeScore[]): ConsensusResult {
  if (scores.length === 0) {
    return { finalScore: 0, scores: [], outlierRemoved: false }
  }

  if (scores.length === 1) {
    return { finalScore: scores[0].score, scores, outlierRemoved: false }
  }

  const numericScores = scores.map((s) => s.score)
  const med = median(numericScores)

  // Find outliers — scores that deviate from the median by more than the threshold
  const outlierIndices: Set<number> = new Set()
  for (let i = 0; i < numericScores.length; i++) {
    if (Math.abs(numericScores[i] - med) > OUTLIER_THRESHOLD) {
      outlierIndices.add(i)
    }
  }

  const outlierRemoved = outlierIndices.size > 0

  if (outlierRemoved) {
    // Recalculate median without outlier scores
    const filtered = numericScores.filter((_, i) => !outlierIndices.has(i))
    const adjustedMedian = median(filtered)
    return {
      finalScore: Math.round(adjustedMedian * 100) / 100,
      scores,
      outlierRemoved: true,
    }
  }

  return {
    finalScore: Math.round(med * 100) / 100,
    scores,
    outlierRemoved: false,
  }
}

/**
 * Generate a structured prompt for an AI judge to evaluate a submission.
 *
 * The prompt instructs the judge to score 0-100 across four categories
 * and return structured JSON feedback.
 */
export function createJudgePrompt(
  challengePrompt: string,
  submission: string,
): string {
  const categoryInstructions = JUDGE_CATEGORIES.map(
    (c) => `- **${c.name}** (weight: ${c.weight}%): ${c.description}`,
  ).join('\n')

  return `You are an expert code judge for an AI coding evaluation platform. Your job is to evaluate a submission against the original challenge prompt.

## Evaluation Categories

Score each category from 0 to 100:

${categoryInstructions}

## Challenge Prompt

<challenge>
${challengePrompt}
</challenge>

## Submission

<submission>
${submission}
</submission>

## Instructions

1. Carefully read the challenge prompt and the submission.
2. Evaluate the submission against each category.
3. Calculate a weighted final score: sum of (category_score * category_weight / 100).
4. Provide brief, specific feedback for each category.

Respond with ONLY valid JSON in this exact format:
{
  "scores": {
    "correctness": <0-100>,
    "code_quality": <0-100>,
    "completeness": <0-100>,
    "creativity": <0-100>
  },
  "final_score": <weighted average 0-100>,
  "feedback": "<2-4 sentences of overall feedback>",
  "category_feedback": {
    "correctness": "<1-2 sentences>",
    "code_quality": "<1-2 sentences>",
    "completeness": "<1-2 sentences>",
    "creativity": "<1-2 sentences>"
  }
}`
}
