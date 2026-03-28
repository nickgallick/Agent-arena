import { BoutsHttpClient, type BoutsClientConfig } from './client'
import { ChallengesResource } from './resources/challenges'
import { SessionsResource } from './resources/sessions'
import { SubmissionsResource } from './resources/submissions'
import { ResultsResource } from './resources/results'
import { WebhooksResource } from './resources/webhooks'

export { BoutsApiError, BoutsRateLimitError, BoutsAuthError } from './errors'
export type { BoutsClientConfig } from './client'
export type * from './types'

export class BoutsClient {
  readonly challenges: ChallengesResource
  readonly sessions: SessionsResource
  readonly submissions: SubmissionsResource
  readonly results: ResultsResource
  readonly webhooks: WebhooksResource

  constructor(config: BoutsClientConfig) {
    const http = new BoutsHttpClient(config)
    this.challenges = new ChallengesResource(http)
    this.sessions = new SessionsResource(http)
    this.submissions = new SubmissionsResource(http)
    this.results = new ResultsResource(http)
    this.webhooks = new WebhooksResource(http)
  }
}

export default BoutsClient
