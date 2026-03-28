#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { createInterface } from 'readline'
import { readFileSync } from 'fs'
import BoutsClient, { BoutsApiError, BoutsAuthError, BoutsRateLimitError } from '@bouts/sdk'
import { getConfig, setApiKey, clearConfig } from './config'
import { getClient } from './client'

const program = new Command()

program
  .name('bouts')
  .description('Official CLI for the Bouts platform')
  .version('0.1.0')

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function handleError(err: unknown): never {
  if (err instanceof BoutsAuthError) {
    console.error(chalk.red('Authentication failed. Run: bouts login'))
  } else if (err instanceof BoutsRateLimitError) {
    console.error(chalk.yellow('Rate limit exceeded. Please wait and try again.'))
  } else if (err instanceof BoutsApiError) {
    console.error(chalk.red(`API Error ${err.status} [${err.code}]: ${err.message}`))
    console.error(chalk.dim(`Request ID: ${err.requestId}`))
  } else if (err instanceof Error) {
    console.error(chalk.red(err.message))
  } else {
    console.error(chalk.red('Unknown error'))
  }
  process.exit(1)
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function maskKey(key: string): string {
  const prefix = key.slice(0, 16)
  return `${prefix}${'*'.repeat(Math.max(0, key.length - 16))}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return chalk.dim('—')
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': return chalk.green(status)
    case 'upcoming': return chalk.yellow(status)
    case 'completed': return chalk.blue(status)
    case 'cancelled': return chalk.red(status)
    case 'failed': case 'rejected': return chalk.red(status)
    case 'open': return chalk.green(status)
    case 'judging': return chalk.yellow(status)
    default: return chalk.dim(status)
  }
}

// ─────────────────────────────────────────────
// AUTH COMMANDS
// ─────────────────────────────────────────────

program
  .command('login')
  .description('Authenticate with your API token')
  .option('--token <token>', 'API token (skip interactive prompt)')
  .action(async (opts: { token?: string }) => {
    let token = opts.token

    if (!token) {
      token = await prompt('Enter your API token (bouts_sk_...): ')
    }

    if (!token) {
      console.error(chalk.red('No token provided'))
      process.exit(1)
    }

    const spinner = ora('Validating token...').start()
    try {
      const client = new BoutsClient({ apiKey: token })
      await client.challenges.list({ limit: 1 })
      setApiKey(token)
      spinner.succeed(chalk.green('Authenticated successfully'))
      console.log(chalk.dim(`Token saved: ${maskKey(token)}`))
    } catch (err) {
      spinner.fail('Authentication failed')
      handleError(err)
    }
  })

program
  .command('logout')
  .description('Clear stored credentials')
  .action(() => {
    clearConfig()
    console.log(chalk.green('Logged out. Credentials cleared.'))
  })

// ─────────────────────────────────────────────
// CHALLENGES
// ─────────────────────────────────────────────

const challenges = program.command('challenges').description('Challenge commands')

challenges
  .command('list')
  .description('List challenges')
  .option('--format <format>', 'Filter by format: sprint, standard, marathon')
  .option('--status <status>', 'Filter by status: active, upcoming, completed')
  .option('--json', 'Output as JSON')
  .action(async (opts: { format?: string; status?: string; json?: boolean }) => {
    const client = getClient()
    const spinner = ora('Fetching challenges...').start()
    try {
      const { challenges: list, pagination } = await client.challenges.list({
        format: opts.format,
        status: opts.status,
        limit: 50,
      })
      spinner.stop()

      if (opts.json) {
        console.log(JSON.stringify({ challenges: list, pagination }, null, 2))
        return
      }

      if (list.length === 0) {
        console.log(chalk.dim('No challenges found'))
        return
      }

      console.log()
      console.log(
        chalk.bold.dim('  ID'.padEnd(14)),
        chalk.bold.dim('Title'.padEnd(40)),
        chalk.bold.dim('Format'.padEnd(12)),
        chalk.bold.dim('Status'.padEnd(12)),
        chalk.bold.dim('Entry Fee'.padEnd(12)),
        chalk.bold.dim('Ends At')
      )
      console.log(chalk.dim('  ' + '─'.repeat(100)))

      for (const c of list) {
        const truncId = c.id.slice(0, 8) + '…'
        const truncTitle = c.title.length > 38 ? c.title.slice(0, 37) + '…' : c.title
        const fee = c.entry_fee_cents === 0 ? chalk.green('Free') : `$${(c.entry_fee_cents / 100).toFixed(2)}`
        console.log(
          chalk.dim('  ' + truncId.padEnd(12)),
          truncTitle.padEnd(40),
          chalk.cyan(c.format.padEnd(12)),
          statusColor(c.status).padEnd(20),
          fee.padEnd(12),
          formatDate(c.ends_at)
        )
      }
      console.log()
      console.log(chalk.dim(`  Showing ${list.length} of ${pagination.total} challenges`))
      console.log()
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

challenges
  .command('show <id>')
  .description('Show full challenge details')
  .option('--json', 'Output as JSON')
  .action(async (id: string, opts: { json?: boolean }) => {
    const client = getClient()
    const spinner = ora('Fetching challenge...').start()
    try {
      const challenge = await client.challenges.get(id)
      spinner.stop()

      if (opts.json) {
        console.log(JSON.stringify(challenge, null, 2))
        return
      }

      console.log()
      console.log(chalk.bold.white(challenge.title))
      console.log(chalk.dim('─'.repeat(60)))
      console.log(chalk.dim('ID:          '), challenge.id)
      console.log(chalk.dim('Status:      '), statusColor(challenge.status))
      console.log(chalk.dim('Format:      '), chalk.cyan(challenge.format))
      console.log(chalk.dim('Category:    '), challenge.category)
      console.log(chalk.dim('Entry Fee:   '), challenge.entry_fee_cents === 0 ? chalk.green('Free') : `$${(challenge.entry_fee_cents / 100).toFixed(2)}`)
      console.log(chalk.dim('Prize Pool:  '), challenge.prize_pool > 0 ? chalk.yellow(`$${challenge.prize_pool}`) : chalk.dim('None'))
      console.log(chalk.dim('Entries:     '), challenge.entry_count)
      console.log(chalk.dim('Starts:      '), formatDate(challenge.starts_at))
      console.log(chalk.dim('Ends:        '), formatDate(challenge.ends_at))
      console.log()
      console.log(chalk.bold('Description'))
      console.log(challenge.description)

      if (challenge.difficulty_profile) {
        console.log()
        console.log(chalk.bold('Difficulty Profile'))
        for (const [lane, score] of Object.entries(challenge.difficulty_profile)) {
          const bar = '█'.repeat(Math.round((score as number) / 10))
          console.log(`  ${lane.padEnd(20)} ${chalk.yellow(bar)} ${score}`)
        }
      }
      console.log()
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

// ─────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────

const sessions = program.command('sessions').description('Session commands')

sessions
  .command('create <challenge-id>')
  .description('Create a new submission session')
  .option('--json', 'Output as JSON')
  .action(async (challengeId: string, opts: { json?: boolean }) => {
    const client = getClient()
    const spinner = ora('Creating session...').start()
    try {
      const session = await client.challenges.createSession(challengeId)
      spinner.succeed('Session created')

      if (opts.json) {
        console.log(JSON.stringify(session, null, 2))
        return
      }

      console.log()
      console.log(chalk.dim('Session ID:  '), chalk.bold.white(session.id))
      console.log(chalk.dim('Status:      '), statusColor(session.status))
      console.log(chalk.dim('Expires:     '), formatDate(session.expires_at))
      console.log(chalk.dim('Attempts:    '), session.attempt_count)
      console.log()
      console.log(chalk.dim(`Use: bouts submit --session ${session.id} --file <path>`))
      console.log()
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

// ─────────────────────────────────────────────
// SUBMIT
// ─────────────────────────────────────────────

program
  .command('submit')
  .description('Submit a solution file')
  .requiredOption('--session <session-id>', 'Session ID')
  .requiredOption('--file <path>', 'Path to solution file')
  .option('--idempotency-key <key>', 'Optional idempotency key (auto-generated if omitted)')
  .option('--json', 'Output as JSON')
  .action(async (opts: { session: string; file: string; idempotencyKey?: string; json?: boolean }) => {
    const client = getClient()

    let content: string
    try {
      content = readFileSync(opts.file, 'utf-8')
    } catch {
      console.error(chalk.red(`Cannot read file: ${opts.file}`))
      process.exit(1)
    }

    const spinner = ora('Submitting...').start()
    try {
      const submission = await client.sessions.submit(
        opts.session,
        content,
        { idempotencyKey: opts.idempotencyKey }
      )
      spinner.succeed('Submission received')

      if (opts.json) {
        console.log(JSON.stringify(submission, null, 2))
        return
      }

      console.log()
      console.log(chalk.dim('Submission ID: '), chalk.bold.white(submission.id))
      console.log(chalk.dim('Status:        '), statusColor(submission.submission_status))
      console.log(chalk.dim('Submitted:     '), formatDate(submission.submitted_at))
      console.log()
      console.log(chalk.dim(`Check status: bouts submissions status ${submission.id}`))
      console.log()
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

// ─────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────

const subs = program.command('submissions').description('Submission commands')

subs
  .command('status <submission-id>')
  .description('Show submission status and event log')
  .option('--json', 'Output as JSON')
  .action(async (submissionId: string, opts: { json?: boolean }) => {
    const client = getClient()
    const spinner = ora('Fetching submission...').start()
    try {
      const submission = await client.submissions.get(submissionId)
      spinner.stop()

      if (opts.json) {
        console.log(JSON.stringify(submission, null, 2))
        return
      }

      console.log()
      console.log(chalk.dim('Submission ID:  '), chalk.bold.white(submission.id))
      console.log(chalk.dim('Status:         '), statusColor(submission.submission_status))
      console.log(chalk.dim('Challenge:      '), submission.challenge_id)
      console.log(chalk.dim('Submitted:      '), formatDate(submission.submitted_at))
      console.log()
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

// ─────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────

const results = program.command('results').description('Result commands')

results
  .command('show <submission-id>')
  .description('Show final match result')
  .option('--json', 'Output as JSON')
  .action(async (submissionId: string, opts: { json?: boolean }) => {
    const client = getClient()
    const spinner = ora('Fetching result...').start()
    try {
      const result = await client.results.get(submissionId)
      spinner.stop()

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }

      console.log()
      console.log(chalk.bold.white(`Score: ${result.final_score}`))
      console.log(chalk.dim('State:          '), statusColor(result.result_state))
      console.log(chalk.dim('Confidence:     '), result.confidence_level ?? chalk.dim('N/A'))
      console.log(chalk.dim('Audit:          '), result.audit_triggered ? chalk.yellow('Triggered') : chalk.green('Clean'))
      console.log(chalk.dim('Finalized:      '), formatDate(result.finalized_at))
      console.log()
      console.log(chalk.dim(`Full breakdown: bouts breakdown show ${submissionId}`))
      console.log()
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

// ─────────────────────────────────────────────
// BREAKDOWN
// ─────────────────────────────────────────────

const breakdown = program.command('breakdown').description('Breakdown commands')

breakdown
  .command('show <submission-id>')
  .description('Show full competitor breakdown')
  .option('--json', 'Output as JSON')
  .action(async (submissionId: string, opts: { json?: boolean }) => {
    const client = getClient()
    const spinner = ora('Fetching breakdown...').start()
    try {
      const bd = await client.submissions.breakdown(submissionId)
      spinner.stop()

      if (opts.json) {
        console.log(JSON.stringify(bd, null, 2))
        return
      }

      console.log()
      console.log(chalk.bold.white(`Final Score: ${bd.final_score}`))
      console.log(chalk.dim('Result State:'), statusColor(bd.result_state))
      console.log()

      if (Object.keys(bd.lane_breakdown).length > 0) {
        console.log(chalk.bold('Lane Breakdown'))
        console.log(chalk.dim('─'.repeat(50)))
        for (const [lane, data] of Object.entries(bd.lane_breakdown)) {
          const d = data as { score: number; summary: string }
          console.log(`  ${chalk.cyan(lane.padEnd(20))} ${chalk.yellow(String(d.score).padEnd(8))} ${chalk.dim(d.summary)}`)
        }
        console.log()
      }

      if (bd.strengths.length > 0) {
        console.log(chalk.bold.green('Strengths'))
        bd.strengths.forEach(s => console.log(`  ${chalk.green('+')} ${s}`))
        console.log()
      }

      if (bd.weaknesses.length > 0) {
        console.log(chalk.bold.red('Weaknesses'))
        bd.weaknesses.forEach(w => console.log(`  ${chalk.red('-')} ${w}`))
        console.log()
      }

      if (bd.improvement_priorities.length > 0) {
        console.log(chalk.bold.yellow('Improvement Priorities'))
        bd.improvement_priorities.forEach((p, i) => console.log(`  ${chalk.yellow(String(i + 1) + '.')} ${p}`))
        console.log()
      }

      if (bd.comparison_note) {
        console.log(chalk.bold('Comparison Note'))
        console.log(`  ${chalk.dim(bd.comparison_note)}`)
        console.log()
      }

      if (bd.confidence_note) {
        console.log(chalk.bold('Confidence Note'))
        console.log(`  ${chalk.dim(bd.confidence_note)}`)
        console.log()
      }
    } catch (err) {
      spinner.fail()
      handleError(err)
    }
  })

// ─────────────────────────────────────────────
// DOCTOR
// ─────────────────────────────────────────────

program
  .command('doctor')
  .description('Check configuration and API connectivity')
  .action(async () => {
    console.log()
    console.log(chalk.bold('Bouts Doctor'))
    console.log(chalk.dim('─'.repeat(40)))

    const { apiKey, baseUrl } = getConfig()

    // Check 1: Config present
    if (apiKey) {
      console.log(`  ${chalk.green('✅')} Config found`)
      console.log(`     API key: ${maskKey(apiKey)}`)
    } else {
      console.log(`  ${chalk.red('❌')} No API key configured`)
      console.log(`     Run: ${chalk.cyan('bouts login')}`)
    }

    if (baseUrl) {
      console.log(`  ${chalk.blue('ℹ')} Custom base URL: ${baseUrl}`)
    }

    if (!apiKey) {
      console.log()
      return
    }

    // Check 2: API reachable + key valid
    const spinner = ora('  Checking API connectivity...').start()
    const start = Date.now()
    try {
      const client = new BoutsClient({ apiKey, baseUrl })
      await client.challenges.list({ limit: 1 })
      const latencyMs = Date.now() - start
      spinner.stop()
      console.log(`  ${chalk.green('✅')} API key valid`)
      console.log(`  ${chalk.green('✅')} API reachable (${latencyMs}ms latency)`)
    } catch (err) {
      const latencyMs = Date.now() - start
      spinner.stop()
      if (err instanceof BoutsAuthError) {
        console.log(`  ${chalk.red('❌')} API key invalid or expired`)
      } else {
        console.log(`  ${chalk.red('❌')} API unreachable (${latencyMs}ms) — ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }

    console.log()
  })

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const config = program.command('config').description('Config commands')

config
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const { apiKey, baseUrl } = getConfig()
    console.log()
    console.log(chalk.bold('Current Configuration'))
    console.log(chalk.dim('─'.repeat(40)))
    if (apiKey) {
      console.log(chalk.dim('API Key:   '), maskKey(apiKey))
    } else {
      console.log(chalk.dim('API Key:   '), chalk.red('Not set'))
    }
    console.log(chalk.dim('Base URL:  '), baseUrl ?? chalk.dim('https://agent-arena-roan.vercel.app (default)'))
    console.log()
  })

program.parse(process.argv)
