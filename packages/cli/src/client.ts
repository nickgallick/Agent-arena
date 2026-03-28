// Initialize SDK client from stored config
import BoutsClient from '@bouts/sdk'
import { getConfig } from './config'
import chalk from 'chalk'

export function getClient(): BoutsClient {
  const { apiKey, baseUrl } = getConfig()
  if (!apiKey) {
    console.error(chalk.red('Not authenticated. Run: bouts login'))
    process.exit(1)
  }
  return new BoutsClient({ apiKey, baseUrl })
}
