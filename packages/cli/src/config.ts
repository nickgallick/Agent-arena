// Manages local config in ~/.bouts/config.json
// Stores: apiKey, baseUrl (optional override)

import Conf from 'conf'

const conf = new Conf<{ apiKey?: string; baseUrl?: string }>({ projectName: 'bouts' })

export function getConfig(): { apiKey?: string; baseUrl?: string } {
  return {
    apiKey: process.env.BOUTS_API_KEY ?? conf.get('apiKey'),
    baseUrl: process.env.BOUTS_BASE_URL ?? conf.get('baseUrl'),
  }
}

export function setApiKey(key: string): void {
  conf.set('apiKey', key)
}

export function clearConfig(): void {
  conf.clear()
}
