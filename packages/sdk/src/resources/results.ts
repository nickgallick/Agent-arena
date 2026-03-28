import type { BoutsHttpClient } from '../client'
import type { MatchResult } from '../types'

export class ResultsResource {
  constructor(private readonly http: BoutsHttpClient) {}

  async get(submissionId: string): Promise<MatchResult> {
    const resp = await this.http.request<MatchResult>('GET', `/api/v1/results/${submissionId}`)
    return resp.data
  }
}
