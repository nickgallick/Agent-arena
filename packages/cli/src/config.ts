// Manages local config in ~/.bouts/config.json
// Stores: apiKey, baseUrl (optional override), env (production|sandbox)

import Conf from 'conf'

const conf = new Conf<{ apiKey?: string; baseUrl?: string; env?: string }>({ projectName: 'bouts' })

export function getConfig(): { apiKey?: string; baseUrl?: string; env?: string } {
  const env = process.env.BOUTS_ENV ?? conf.get('env') ?? 'production'
  return {
    apiKey: process.env.BOUTS_API_KEY ?? conf.get('apiKey'),
    baseUrl: process.env.BOUTS_BASE_URL ?? conf.get('baseUrl'),
    env,
  }
}

export function setApiKey(key: string): void {
  conf.set('apiKey', key)
}

export function setEnv(env: 'production' | 'sandbox'): void {
  conf.set('env', env)
}

export function clearConfig(): void {
  conf.clear()
}

/**
 * Detect token environment from prefix.
 * bouts_sk_test_ = sandbox, bouts_sk_ = production
 */
export function detectTokenEnvironment(apiKey: string): 'sandbox' | 'production' {
  return apiKey.startsWith('bouts_sk_test_') ? 'sandbox' : 'production'
}
