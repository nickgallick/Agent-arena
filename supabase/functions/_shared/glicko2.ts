// Glicko-2 calculation helpers for Edge Functions
// In the web app we use the glicko2 npm package; Edge Functions use this lightweight implementation

const TAU = 0.5 // System constant (constrains volatility change)
const EPSILON = 0.000001

interface Rating {
  rating: number
  rd: number
  volatility: number
}

interface Opponent {
  rating: number
  rd: number
  score: number // 1 = win, 0.5 = draw, 0 = loss
}

function g(rd: number): number {
  return 1 / Math.sqrt(1 + 3 * rd * rd / (Math.PI * Math.PI))
}

function E(rating: number, oppRating: number, oppRd: number): number {
  return 1 / (1 + Math.exp(-g(oppRd) * (rating - oppRating)))
}

export function calculateNewRating(
  player: Rating,
  opponents: Opponent[]
): Rating {
  if (opponents.length === 0) {
    return {
      rating: player.rating,
      rd: Math.min(Math.sqrt(player.rd * player.rd + player.volatility * player.volatility), 350),
      volatility: player.volatility,
    }
  }

  // Step 1: Convert to Glicko-2 scale
  const mu = (player.rating - 1500) / 173.7178
  const phi = player.rd / 173.7178

  const opps = opponents.map(o => ({
    mu: (o.rating - 1500) / 173.7178,
    phi: o.rd / 173.7178,
    score: o.score,
  }))

  // Step 2: Compute variance
  let vInv = 0
  for (const opp of opps) {
    const gPhi = g(opp.phi)
    const e = E(mu, opp.mu, opp.phi)
    vInv += gPhi * gPhi * e * (1 - e)
  }
  const v = 1 / vInv

  // Step 3: Compute delta
  let delta = 0
  for (const opp of opps) {
    const gPhi = g(opp.phi)
    const e = E(mu, opp.mu, opp.phi)
    delta += gPhi * (opp.score - e)
  }
  delta *= v

  // Step 4: Compute new volatility (Illinois algorithm)
  const a = Math.log(player.volatility * player.volatility)
  const phiSq = phi * phi
  const deltaSq = delta * delta

  function f(x: number): number {
    const ex = Math.exp(x)
    const d = phiSq + v + ex
    return (ex * (deltaSq - phiSq - v - ex)) / (2 * d * d) - (x - a) / (TAU * TAU)
  }

  let A = a
  let B: number
  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v)
  } else {
    let k = 1
    while (f(a - k * TAU) < 0) k++
    B = a - k * TAU
  }

  let fA = f(A)
  let fB = f(B)
  while (Math.abs(B - A) > EPSILON) {
    const C = A + (A - B) * fA / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
  }

  const newVol = Math.exp(A / 2)

  // Step 5: Update rating deviation
  const phiStar = Math.sqrt(phiSq + newVol * newVol)

  // Step 6: Update rating and RD
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  let newMu = mu
  for (const opp of opps) {
    newMu += newPhi * newPhi * g(opp.phi) * (opp.score - E(mu, opp.mu, opp.phi))
  }

  return {
    rating: newMu * 173.7178 + 1500,
    rd: newPhi * 173.7178,
    volatility: newVol,
  }
}

// Convert placement-based results to pairwise outcomes
export function placementToOutcomes(
  agentIndex: number,
  totalAgents: number,
  scores: number[]
): Opponent[] {
  const outcomes: Opponent[] = []
  const myScore = scores[agentIndex]

  for (let i = 0; i < totalAgents; i++) {
    if (i === agentIndex) continue
    let outcome: number
    if (myScore > scores[i]) outcome = 1
    else if (myScore < scores[i]) outcome = 0
    else outcome = 0.5
    
    outcomes.push({
      rating: 1500, // Will be replaced with actual rating
      rd: 350,      // Will be replaced with actual RD
      score: outcome,
    })
  }

  return outcomes
}
