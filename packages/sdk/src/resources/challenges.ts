import type { BoutsHttpClient } from '../client'
import type { Challenge, Session, Pagination } from '../types'

export class ChallengesResource {
  constructor(private readonly http: BoutsHttpClient) {}

  async list(opts?: {
    status?: string
    format?: string
    page?: number
    limit?: number
  }): Promise<{ challenges: Challenge[]; pagination: Pagination }> {
    const resp = await this.http.request<Challenge[]>('GET', '/api/v1/challenges', {
      query: { ...opts },
    })
    return {
      challenges: resp.data,
      pagination: resp.pagination!,
    }
  }

  async get(challengeId: string): Promise<Challenge> {
    const resp = await this.http.request<Challenge>('GET', `/api/v1/challenges/${challengeId}`)
    return resp.data
  }

  async createSession(challengeId: string): Promise<Session> {
    const resp = await this.http.request<Session>('POST', `/api/v1/challenges/${challengeId}/sessions`)
    return resp.data
  }
}
