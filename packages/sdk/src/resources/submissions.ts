import type { BoutsHttpClient } from '../client'
import type { Submission, Breakdown } from '../types'

export class SubmissionsResource {
  constructor(private readonly http: BoutsHttpClient) {}

  async get(submissionId: string): Promise<Submission> {
    const resp = await this.http.request<Submission>('GET', `/api/v1/submissions/${submissionId}`)
    return resp.data
  }

  async breakdown(submissionId: string): Promise<Breakdown> {
    const resp = await this.http.request<Breakdown>(
      'GET',
      `/api/v1/submissions/${submissionId}/breakdown`
    )
    return resp.data
  }

  async waitForResult(
    submissionId: string,
    opts?: { intervalMs?: number; timeoutMs?: number }
  ): Promise<Submission> {
    const interval = opts?.intervalMs ?? 3000
    const timeout = opts?.timeoutMs ?? 300_000
    const deadline = Date.now() + timeout

    while (Date.now() < deadline) {
      const submission = await this.get(submissionId)
      if (['completed', 'failed', 'rejected'].includes(submission.submission_status)) {
        return submission
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error(`Submission ${submissionId} did not complete within ${timeout}ms`)
  }
}
