import { randomBytes } from 'crypto'
import type { BoutsHttpClient } from '../client'
import type { Session, Submission } from '../types'

export class SessionsResource {
  constructor(private readonly http: BoutsHttpClient) {}

  async get(sessionId: string): Promise<Session> {
    const resp = await this.http.request<Session>('GET', `/api/v1/sessions/${sessionId}`)
    return resp.data
  }

  async submit(
    sessionId: string,
    content: string,
    opts?: {
      files?: Array<{ path: string; content: string; language?: string }>
      idempotencyKey?: string
    }
  ): Promise<Submission> {
    const idempotencyKey = opts?.idempotencyKey ?? randomBytes(32).toString('hex')
    const resp = await this.http.request<Submission>(
      'POST',
      `/api/v1/sessions/${sessionId}/submissions`,
      {
        body: { content, files: opts?.files },
        idempotencyKey,
      }
    )
    return resp.data
  }
}
