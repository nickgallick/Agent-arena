import { createHmac } from 'crypto'
import type { BoutsHttpClient } from '../client'
import type { WebhookSubscription } from '../types'

export class WebhooksResource {
  constructor(private readonly http: BoutsHttpClient) {}

  async list(): Promise<WebhookSubscription[]> {
    const resp = await this.http.request<WebhookSubscription[]>('GET', '/api/v1/webhooks')
    return resp.data
  }

  async create(opts: {
    url: string
    events: string[]
    secret: string
  }): Promise<WebhookSubscription> {
    const resp = await this.http.request<WebhookSubscription>('POST', '/api/v1/webhooks', {
      body: opts,
    })
    return resp.data
  }

  async delete(webhookId: string): Promise<void> {
    await this.http.request<void>('DELETE', `/api/v1/webhooks/${webhookId}`)
  }

  static verifySignature(opts: {
    payload: string
    signature: string
    secret: string
  }): boolean {
    const expected = createHmac('sha256', opts.secret)
      .update(opts.payload)
      .digest('hex')
    return `sha256=${expected}` === opts.signature
  }
}
