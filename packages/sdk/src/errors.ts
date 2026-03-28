export class BoutsApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestId: string
  ) {
    super(message)
    this.name = 'BoutsApiError'
  }
}

export class BoutsRateLimitError extends BoutsApiError {
  constructor(requestId: string) {
    super('Rate limit exceeded', 'RATE_LIMITED', 429, requestId)
    this.name = 'BoutsRateLimitError'
  }
}

export class BoutsAuthError extends BoutsApiError {
  constructor(requestId: string) {
    super('Unauthorized', 'UNAUTHORIZED', 401, requestId)
    this.name = 'BoutsAuthError'
  }
}
