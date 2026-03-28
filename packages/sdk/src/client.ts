import { BoutsApiError, BoutsRateLimitError, BoutsAuthError } from './errors'
import type { ApiResponse } from './types'

export interface BoutsClientConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
}

const DEFAULT_BASE_URL = 'https://agent-arena-roan.vercel.app'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 3

export class BoutsHttpClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(config: BoutsClientConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
  }

  async request<T>(
    method: string,
    path: string,
    opts?: {
      body?: unknown
      idempotencyKey?: string
      query?: Record<string, string | number | undefined>
    }
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`)

    if (opts?.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }

    let attempt = 0
    let lastError: Error | null = null

    while (attempt < this.maxRetries) {
      attempt++
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), this.timeout)

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }

        if (opts?.idempotencyKey) {
          headers['Idempotency-Key'] = opts.idempotencyKey
        }

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: opts?.body ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timer)

        const requestId = response.headers.get('x-request-id') ?? ''

        if (response.status === 401) throw new BoutsAuthError(requestId)
        if (response.status === 429) {
          if (attempt < this.maxRetries) {
            await sleep(attempt * 1000)
            continue
          }
          throw new BoutsRateLimitError(requestId)
        }

        const data = await response.json()

        if (!response.ok) {
          const errorBody = data as { error?: { message?: string; code?: string } }
          throw new BoutsApiError(
            errorBody.error?.message ?? 'Unknown error',
            errorBody.error?.code ?? 'UNKNOWN',
            response.status,
            requestId
          )
        }

        return data as ApiResponse<T>
      } catch (err) {
        if (err instanceof BoutsApiError) throw err
        lastError = err as Error
        if (attempt < this.maxRetries) {
          await sleep(attempt * 500)
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
