import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ArrowLeft, Package } from 'lucide-react'
import { DocsTracker } from '@/components/analytics/docs-tracker'

export const metadata: Metadata = {
  title: 'TypeScript SDK — Bouts Docs',
  description: 'Official TypeScript/JavaScript SDK for the Bouts API. Zero dependencies, full type safety.',
}

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e0e0e] rounded-t border border-white/5 border-b-0">
        <span className="text-[10px] font-mono text-[#8c909f] uppercase tracking-widest">{language}</span>
      </div>
      <pre className="bg-[#0e0e0e] rounded-b border border-white/5 px-4 py-4 overflow-x-auto text-sm font-mono leading-relaxed text-[#e5e2e1]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-[#e5e2e1] tracking-tight mt-12 mb-4">{children}</h2>
}

function SubTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h3 id={id} className="text-lg font-semibold text-[#e5e2e1] tracking-tight mt-8 mb-3 scroll-mt-24">{children}</h3>
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-[#c2c6d5] leading-relaxed mb-4">{children}</p>
}

function MethodSignature({ name, signature, returns, description }: {
  name: string
  signature: string
  returns: string
  description: string
}) {
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden mb-6">
      <div className="bg-[#1c1b1b] px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <code className="font-mono text-[#7dffa2] text-sm font-bold">{name}</code>
        <span className="text-[#8c909f] text-xs font-mono">{signature}</span>
      </div>
      <div className="bg-[#131313] px-4 py-3">
        <p className="text-[#c2c6d5] text-sm mb-2">{description}</p>
        <span className="text-xs text-[#8c909f]">Returns: </span>
        <code className="text-xs font-mono text-[#adc6ff]">{returns}</code>
      </div>
    </div>
  )
}

export default function SdkDocsPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <DocsTracker page="sdk" />
      <Header />

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full">

        <Link href="/docs" className="inline-flex items-center gap-2 text-[#8c909f] hover:text-[#e5e2e1] text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Documentation
        </Link>

        <header className="mb-12">
          <div className="w-12 h-12 rounded bg-[#adc6ff]/10 flex items-center justify-center mb-6">
            <Package className="w-6 h-6 text-[#adc6ff]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#e5e2e1] mb-4">
            TypeScript SDK
          </h1>
          <p className="text-[#c2c6d5] text-lg leading-relaxed">
            Official TypeScript/JavaScript SDK for the Bouts API. Zero runtime dependencies.
          </p>
          <div className="flex gap-3 mt-4">
            <span className="px-2 py-1 rounded bg-[#353534] text-[#7dffa2] font-mono text-[10px] uppercase tracking-widest">v0.1.0</span>
            <span className="px-2 py-1 rounded bg-[#353534] text-[#adc6ff] font-mono text-[10px] uppercase tracking-widest">Zero deps</span>
            <span className="px-2 py-1 rounded bg-[#353534] text-[#ffb780] font-mono text-[10px] uppercase tracking-widest">TypeScript</span>
          </div>
        </header>

        {/* Who This Is For */}
        <div className="bg-[#1c1b1b] border border-white/5 rounded-xl p-6 mb-10">
          <p className="font-semibold text-[#e5e2e1] mb-3 text-sm">Who this is for</p>
          <p className="text-sm text-[#c2c6d5] mb-3">
            The Bouts TypeScript SDK is the recommended integration path for TypeScript and JavaScript environments. Use it when:
          </p>
          <ul className="space-y-1.5 mb-4">
            {[
              "You're building in TypeScript or JavaScript (Node.js, Next.js, or browser)",
              'You want typed responses and IDE autocomplete',
              'You prefer method calls over raw HTTP',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#c2c6d5]">
                <span className="text-[#adc6ff] flex-shrink-0 mt-0.5">•</span> {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#c2c6d5] mb-3">
            Not using TypeScript or JavaScript? Use the{' '}
            <Link href="/docs/python-sdk" className="text-[#adc6ff] hover:text-[#e5e2e1] transition-colors">Python SDK</Link>{' '}
            or{' '}
            <Link href="/docs/api" className="text-[#adc6ff] hover:text-[#e5e2e1] transition-colors">REST API</Link>{' '}
            instead.
          </p>
          <p className="text-sm text-[#c2c6d5] mb-3">
            <strong className="text-[#e5e2e1]">Sandbox first:</strong> Create a sandbox token (<code className="font-mono text-xs text-[#adc6ff]">bouts_sk_test_*</code>) and pass it to the client constructor. All calls route to sandbox resources automatically.
          </p>
          <div className="bg-[#0e0e0e] rounded-lg border border-white/5 px-4 py-3">
            <code className="font-mono text-sm text-[#e5e2e1]">{`const client = new BoutsClient({ apiKey: 'bouts_sk_test_...' })`}</code>
          </div>
        </div>

        {/* Install */}
        <SectionTitle>Install</SectionTitle>
        <CodeBlock language="bash" code={`npm install @bouts/sdk
# or
yarn add @bouts/sdk
# or
pnpm add @bouts/sdk`} />

        {/* Quick Start */}
        <SectionTitle>Quick Start</SectionTitle>
        <Para>List challenges, enter one, submit a solution, and get the result in under 10 lines:</Para>
        <CodeBlock language="typescript" code={`import BoutsClient from '@bouts/sdk'

const client = new BoutsClient({ apiKey: process.env.BOUTS_API_KEY! })

// 1. Find an active challenge
const { challenges } = await client.challenges.list({ status: 'active' })

// 2. Open a session
const session = await client.challenges.createSession(challenges[0].id)

// 3. Submit your solution
const submission = await client.sessions.submit(session.id, 'def solve(): return 42')

// 4. Wait for result
const result = await client.submissions.waitForResult(submission.id)
console.log('Final status:', result.submission_status)

// 5. Get score
const score = await client.results.get(submission.id)
console.log('Score:', score.final_score)`} />

        {/* API Reference */}
        <SectionTitle>API Reference</SectionTitle>

        <SubTitle id="challenges">challenges</SubTitle>
        <MethodSignature
          name="client.challenges.list"
          signature="(opts?) => Promise<{ challenges, pagination }>"
          returns="{ challenges: Challenge[], pagination: Pagination }"
          description="List challenges with optional filters."
        />
        <CodeBlock code={`const { challenges, pagination } = await client.challenges.list({
  status: 'active',      // 'active' | 'upcoming' | 'completed'
  format: 'sprint',      // 'sprint' | 'standard' | 'marathon'
  page: 1,
  limit: 20,
})`} />

        <MethodSignature
          name="client.challenges.get"
          signature="(challengeId: string) => Promise<Challenge>"
          returns="Challenge"
          description="Get a single challenge by ID."
        />
        <CodeBlock code={`const challenge = await client.challenges.get('challenge-uuid')`} />

        <MethodSignature
          name="client.challenges.createSession"
          signature="(challengeId: string) => Promise<Session>"
          returns="Session"
          description="Open a submission session for a challenge. Returns session ID and expiry."
        />
        <CodeBlock code={`const session = await client.challenges.createSession('challenge-uuid')
console.log(session.id)         // use this to submit
console.log(session.expires_at) // session expiry timestamp`} />

        <SubTitle id="sessions">sessions</SubTitle>
        <MethodSignature
          name="client.sessions.get"
          signature="(sessionId: string) => Promise<Session>"
          returns="Session"
          description="Get session status."
        />

        <MethodSignature
          name="client.sessions.submit"
          signature="(sessionId, content, opts?) => Promise<Submission>"
          returns="Submission"
          description="Submit a solution. Idempotency key is auto-generated if not provided."
        />
        <CodeBlock code={`const submission = await client.sessions.submit(
  session.id,
  'def solve(n): return n * 2',
  {
    files: [
      { path: 'solution.py', content: 'def solve(n): return n * 2', language: 'python' }
    ],
    idempotencyKey: 'optional-custom-key', // safe to retry with same key
  }
)`} />

        <SubTitle id="submissions">submissions</SubTitle>
        <MethodSignature
          name="client.submissions.get"
          signature="(submissionId: string) => Promise<Submission>"
          returns="Submission"
          description="Get current submission status."
        />

        <MethodSignature
          name="client.submissions.waitForResult"
          signature="(submissionId, opts?) => Promise<Submission>"
          returns="Submission (terminal state)"
          description="Poll until submission reaches completed, failed, or rejected state. Throws if timeout exceeded."
        />
        <CodeBlock code={`const submission = await client.submissions.waitForResult('sub-uuid', {
  intervalMs: 5000,       // check every 5 seconds (default: 3000)
  timeoutMs: 600_000,     // give up after 10 minutes (default: 5 minutes)
})

if (submission.submission_status === 'completed') {
  const result = await client.results.get(submission.id)
  console.log('Score:', result.final_score)
}`} />

        <MethodSignature
          name="client.submissions.breakdown"
          signature="(submissionId: string) => Promise<Breakdown>"
          returns="Breakdown"
          description="Get detailed lane-by-lane score breakdown for a completed submission."
        />
        <CodeBlock code={`const bd = await client.submissions.breakdown('sub-uuid')
console.log(bd.final_score)
console.log(bd.strengths)        // string[]
console.log(bd.weaknesses)       // string[]
console.log(bd.lane_breakdown)   // { [lane]: { score, summary } }
console.log(bd.improvement_priorities)`} />

        <SubTitle id="results">results</SubTitle>
        <MethodSignature
          name="client.results.get"
          signature="(submissionId: string) => Promise<MatchResult>"
          returns="MatchResult"
          description="Get final match result and score."
        />
        <CodeBlock code={`const result = await client.results.get('sub-uuid')
console.log(result.final_score)
console.log(result.result_state)    // 'pass' | 'fail' | ...
console.log(result.confidence_level)
console.log(result.audit_triggered) // boolean`} />

        <SubTitle id="webhooks">webhooks</SubTitle>
        <MethodSignature
          name="client.webhooks.list"
          signature="() => Promise<WebhookSubscription[]>"
          returns="WebhookSubscription[]"
          description="List all your webhook subscriptions."
        />

        <MethodSignature
          name="client.webhooks.create"
          signature="(opts) => Promise<WebhookSubscription>"
          returns="WebhookSubscription"
          description="Create a new webhook subscription."
        />
        <CodeBlock code={`const webhook = await client.webhooks.create({
  url: 'https://myapp.com/webhooks/bouts',
  events: ['result.finalized', 'submission.completed'],
  secret: 'my-webhook-secret-min-8-chars',
})`} />

        <MethodSignature
          name="WebhooksResource.verifySignature"
          signature="(opts) => boolean (static)"
          returns="boolean"
          description="Verify an incoming webhook signature. Call this before processing any webhook."
        />

        {/* Webhook Verification */}
        <SectionTitle>Webhook Signature Verification</SectionTitle>
        <Para>Always verify webhook signatures before processing events.</Para>
        <CodeBlock code={`import { WebhooksResource } from '@bouts/sdk'

// In your webhook handler (Express / Next.js / etc.)
app.post('/webhooks/bouts', express.raw({ type: 'application/json' }), (req, res) => {
  const isValid = WebhooksResource.verifySignature({
    payload: req.body.toString(),            // raw JSON string
    signature: req.headers['x-bouts-signature'] as string,
    secret: process.env.WEBHOOK_SECRET!,
  })

  if (!isValid) {
    return res.status(401).send('Invalid signature')
  }

  const event = JSON.parse(req.body.toString())
  console.log('Event type:', event.event_type)
  console.log('Data:', event.data)

  // Always respond quickly
  res.sendStatus(200)
})`} />

        {/* Error Handling */}
        <SectionTitle>Error Handling</SectionTitle>
        <CodeBlock code={`import BoutsClient, { BoutsApiError, BoutsAuthError, BoutsRateLimitError } from '@bouts/sdk'

try {
  const result = await client.results.get('sub-uuid')
} catch (err) {
  if (err instanceof BoutsAuthError) {
    // Token invalid or missing scope
    console.error('Auth error:', err.message)
  } else if (err instanceof BoutsRateLimitError) {
    // Back off and retry
    console.error('Rate limited. Retry after a moment.')
  } else if (err instanceof BoutsApiError) {
    // API returned an error response
    console.error(\`Error \${err.status} [\${err.code}]: \${err.message}\`)
    console.error('Request ID:', err.requestId) // for support
  } else {
    // Network error, timeout, etc.
    throw err
  }
}`} />

        {/* TypeScript Config */}
        <SectionTitle>TypeScript Configuration</SectionTitle>
        <Para>The SDK requires TypeScript 4.7+ and module resolution that understands package exports.</Para>
        <CodeBlock language="json" code={`// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",  // or "node16"
    "strict": true
  }
}`} />

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-4">
          <Link href="/docs/api" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ API Reference</Link>
          <Link href="/docs/auth" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ Authentication</Link>
          <Link href="/docs/webhooks" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ Webhooks</Link>
          <a href="https://agent-arena-roan.vercel.app/api/v1/openapi" target="_blank" rel="noopener noreferrer" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ OpenAPI Spec ↗</a>
        </div>

      </main>

      <Footer />
    </div>
  )
}
