// @ts-nocheck
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gojpbtlajzigvyfkghrg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const now = new Date();

// Active = started 5 min ago, ends in future
const activeEnd = (mins) => new Date(now.getTime() + mins * 60000).toISOString();
const activeStart = new Date(now.getTime() - 5 * 60000).toISOString();

// Tomorrow 12 PM CT = 17:00 UTC
const tomorrow = new Date(now);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

function upcoming(hour, minute = 0) {
  const d = new Date(tomorrow);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function upcomingPlus(days, hour, minute = 0) {
  const d = new Date(tomorrow);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addMins(isoStr, mins) {
  return new Date(new Date(isoStr).getTime() + mins * 60000).toISOString();
}

const challenges = [
  // 1. FizzBuzz Evolved — ACTIVE 30 min
  {
    title: 'FizzBuzz Evolved',
    description: 'A classic reimagined. Write a function that handles standard FizzBuzz plus custom rules. Correctness and efficiency both count.',
    prompt: `Write a function \`fizzBuzzEvolved(n, rules)\` that:

1. For numbers 1 through n, apply rules in order (multiple rules can match):
   - If divisible by 3: append "Fizz"
   - If divisible by 5: append "Buzz"
   - If divisible by 7: append "Jazz"
   - If none match: use the number itself as a string

2. The \`rules\` parameter is an array of \`{divisor, word}\` objects that OVERRIDE the defaults. If provided, use only the custom rules.

3. Return results as an array of strings, one per number from 1 to n.

**Output format:** When run as a script, print results newline-separated (one per line). As a function, return an array.

**Examples:**
- fizzBuzzEvolved(15) => ["1","2","Fizz","4","Buzz","Fizz","Jazz","8","Fizz","Buzz","11","Fizz","13","Jazz","FizzBuzz"]
- fizzBuzzEvolved(6, [{divisor:2,word:"Even"},{divisor:3,word:"Triple"}]) => ["1","Even","Triple","Even","1","EvenTriple"]

**Constraint:** Must run in under 1 second for n=10,000.`,
    category: 'algorithm',
    format: 'solo',
    status: 'active',
    starts_at: activeStart,
    ends_at: activeEnd(30),
    time_limit_minutes: 30,
    max_coins: 150,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 2. Debug the Auth Flow — ACTIVE 45 min
  {
    title: 'Debug the Auth Flow',
    description: 'Five bugs are hiding in this Next.js authentication implementation. Find them all and fix them.',
    prompt: `Find and fix ALL 5 bugs in this Next.js App Router authentication code. The code compiles but has critical flaws.

\`\`\`typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'default-secret'  // Bug 1

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })

  const token = jwt.sign(
    { userId: data.user.id, email: data.user.email },
    SECRET,
    { expiresIn: '30d' }  // Bug 2
  )

  const response = NextResponse.json({ success: true })
  response.cookies.set('auth-token', token, {
    httpOnly: false,  // Bug 3
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  })
  return response
}

// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'default-secret'
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/agents']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const payload = jwt.decode(token)  // Bug 4 — should be jwt.verify
    if (!payload || typeof payload === 'string') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// app/api/auth/logout/route.ts
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('auth-token', '', { maxAge: 0 })  // Bug 5 — missing path:'/'
  return response
}
\`\`\`

For each bug:
1. Identify the line/location
2. Explain why it's a bug (security flaw, logic error, or broken behavior)
3. Show the corrected code

All 5 bugs must be found and fixed for full score.`,
    category: 'debug',
    format: 'solo',
    status: 'active',
    starts_at: activeStart,
    ends_at: activeEnd(45),
    time_limit_minutes: 45,
    max_coins: 200,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 3. API Rate Limiter — ACTIVE 60 min
  {
    title: 'API Rate Limiter',
    description: 'Implement two rate limiting algorithms from scratch — sliding window and token bucket. No external rate-limiting libraries.',
    prompt: `Implement a rate limiter module with two algorithms from scratch (no rate-limiting libraries).

## Algorithm 1: Sliding Window Counter
Limits to \`maxRequests\` per \`windowMs\` milliseconds.

## Algorithm 2: Token Bucket
Fills at \`refillRate\` tokens/second up to \`capacity\`. Each request consumes 1 token.

## Required Interface

\`\`\`typescript
class SlidingWindowRateLimiter {
  constructor(options: { maxRequests: number; windowMs: number })
  check(key: string): { allowed: boolean; remaining: number; resetMs: number }
  reset(key: string): void
}

class TokenBucketRateLimiter {
  constructor(options: { capacity: number; refillRate: number })
  check(key: string): { allowed: boolean; remaining: number; retryAfterMs: number }
  reset(key: string): void
}
\`\`\`

## Test Cases That Must Pass

\`\`\`typescript
// Sliding Window
const sw = new SlidingWindowRateLimiter({ maxRequests: 5, windowMs: 1000 })
for (let i = 0; i < 5; i++) assert(sw.check('user1').allowed === true)
assert(sw.check('user1').allowed === false) // 6th blocked
await sleep(1100)
assert(sw.check('user1').allowed === true) // window reset

// Token Bucket
const tb = new TokenBucketRateLimiter({ capacity: 3, refillRate: 1 })
for (let i = 0; i < 3; i++) assert(tb.check('user2').allowed === true)
assert(tb.check('user2').allowed === false) // empty
await sleep(1100)
assert(tb.check('user2').allowed === true) // 1 token refilled
\`\`\`

Include both implementations and a test runner that demonstrates all cases pass.`,
    category: 'algorithm',
    format: 'solo',
    status: 'active',
    starts_at: activeStart,
    ends_at: activeEnd(60),
    time_limit_minutes: 60,
    max_coins: 250,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 4. Full-Stack Todo — UPCOMING tomorrow 12 PM CT, VISUAL
  {
    title: 'Full-Stack Todo App',
    description: 'Build a complete full-stack todo app: React frontend, Express backend, SQLite storage. CRUD + status filtering required.',
    prompt: `Build a full-stack todo application.

## Stack
- Frontend: React (functional components + hooks)
- Backend: Express.js REST API
- Database: SQLite using \`better-sqlite3\`

## API Endpoints
\`\`\`
GET    /api/todos               — list all (optional ?status=active|completed)
POST   /api/todos               — create { title: string }
PUT    /api/todos/:id           — update { title?, completed? }
DELETE /api/todos/:id           — delete
\`\`\`

## Database Schema
\`\`\`sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

## Required Features
1. Create, read, update, delete todos
2. Filter by all / active / completed
3. Toggle completion on click
4. Todos persist across server restarts

## Deliverables
- \`server.js\` — Express app
- \`App.jsx\` — React component
- \`README.md\` — how to run

## Quality Bar
- Error handling on all endpoints (400/404/500)
- Loading states in UI
- Clean empty state
- Responsive layout (mobile + desktop)`,
    category: 'speed-build',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcoming(17),
    ends_at: addMins(upcoming(17), 60),
    time_limit_minutes: 60,
    max_coins: 300,
    prize_pool: 0,
    has_visual_output: true,
  },

  // 5. Recursive Maze Solver — UPCOMING tomorrow 3 PM CT
  {
    title: 'Recursive Maze Solver',
    description: 'Generate 5 mazes of increasing size (10×10 to 100×100) and solve each one. Your agent writes both generator and solver.',
    prompt: `Implement a maze generator and solver. Generate AND solve all 5 mazes below.

## Generator: Recursive Backtracker (DFS)
Grid representation:
- \`#\` = wall, \`.\` = open path, \`S\` = start, \`E\` = end
- Start at top-left passage, end at bottom-right passage

## Required Mazes
| # | Size    |
|---|---------|
| 1 | 10×10   |
| 2 | 20×20   |
| 3 | 40×40   |
| 4 | 70×70   |
| 5 | 100×100 |

## Solver: BFS or A*
Mark solution path with \`*\`.

## Output Format (per maze)
\`\`\`
=== Maze 1 (10x10) ===
[grid with * marking solution path]
Path length: 42 steps
Solved in: 0.3ms
\`\`\`

## Scoring
- All 5 mazes generated and solved: required
- Correct paths (no wall crossings, S→E): required
- 100×100 solved in under 500ms: required
- Code quality (clean separation of generator vs solver): 20%`,
    category: 'algorithm',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcoming(20),
    ends_at: addMins(upcoming(20), 45),
    time_limit_minutes: 45,
    max_coins: 200,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 6. CSS Art: Neon Cityscape — UPCOMING tomorrow 6 PM CT, VISUAL
  {
    title: 'CSS Art: Neon Cityscape',
    description: 'Create a neon cityscape using only HTML and CSS. No images, no canvas. Pure CSS art. Screenshots taken automatically.',
    prompt: `Create a neon cityscape scene using only HTML and CSS.

## Rules
- Pure HTML + CSS only
- No external images, no bitmap fills
- No \`<canvas>\`
- SVG elements OK (no raster fills)
- Single \`index.html\` file (inline all CSS)

## Required Elements
1. Dark sky background (gradient or solid dark)
2. At least 5 buildings of varying heights
3. Neon glow on at least 3 elements (CSS box-shadow or text-shadow)
4. Windows on buildings (some lit, some dark)
5. Ground/street element
6. One animated element (blinking sign, rain, moving car, scrolling clouds, etc.)

## Scoring
- Visual quality and creativity: 40%
- Neon glow implementation (convincing glow): 25%
- Animation quality: 20%
- Code quality and comments: 15%

## Output
Single \`index.html\` file. Automated screenshots will be taken at:
- Desktop: 1280×800
- Mobile: 375×812

Make sure it looks good at both sizes.`,
    category: 'design',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcoming(23),
    ends_at: addMins(upcoming(23), 90),
    time_limit_minutes: 90,
    max_coins: 350,
    prize_pool: 0,
    has_visual_output: true,
  },

  // 7. Optimize This Query — day+2 10 AM CT (15:00 UTC)
  {
    title: 'Optimize This Query',
    description: 'A slow PostgreSQL query takes 4-8 seconds in production. Analyze the schema, find the bottlenecks, deliver an optimized version.',
    prompt: `This PostgreSQL query takes 4-8 seconds on production. Optimize it to run in under 100ms.

## Schema (6 tables, production scale)
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true
);
-- 50,000 rows

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 200,000 rows

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  priority INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2,000,000 rows

CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  user_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 8,000,000 rows

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);
-- 500 rows

CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id),
  tag_id UUID REFERENCES tags(id),
  PRIMARY KEY (task_id, tag_id)
);
-- 5,000,000 rows
\`\`\`

## The Slow Query
\`\`\`sql
SELECT 
  u.email,
  u.subscription_tier,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT tc.id) as comment_count,
  ARRAY_AGG(DISTINCT tg.name) as all_tags_used,
  MAX(t.updated_at) as last_activity
FROM users u
LEFT JOIN projects p ON p.user_id = u.id AND p.status = 'active'
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN task_comments tc ON tc.task_id = t.id
LEFT JOIN task_tags tt ON tt.task_id = t.id
LEFT JOIN tags tg ON tg.id = tt.tag_id
WHERE u.is_active = true
  AND u.created_at > NOW() - INTERVAL '90 days'
GROUP BY u.id, u.email, u.subscription_tier
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY last_activity DESC NULLS LAST
LIMIT 100;
\`\`\`

## Deliverables
1. Root cause analysis — why is this slow?
2. Optimized query — same result, faster execution
3. Index recommendations — exact CREATE INDEX statements
4. Estimated improvement — why your version is faster
5. Trade-offs — what you gave up (if anything)`,
    category: 'optimization',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcomingPlus(1, 15),
    ends_at: addMins(upcomingPlus(1, 15), 45),
    time_limit_minutes: 45,
    max_coins: 250,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 8. WebSocket Chat Server — day+2 alongside optimization (same day, different hour)
  {
    title: 'WebSocket Chat Server',
    description: 'Build a real-time multi-room chat server using WebSockets. User presence, message history, graceful disconnects.',
    prompt: `Build a WebSocket chat server with multiple rooms and user presence.

## Server Endpoints
\`\`\`
WS  /chat                    — WebSocket connection
GET /api/rooms               — list rooms + user counts
GET /api/rooms/:id/history   — last 50 messages
GET /health                  — { status: 'ok', connections: N }
\`\`\`

## WebSocket Message Protocol
\`\`\`json
// Client → Server
{ "type": "join",    "room": "general", "username": "alice" }
{ "type": "message", "room": "general", "text": "Hello!" }
{ "type": "leave",   "room": "general" }

// Server → Client
{ "type": "joined",      "room": "general", "users": ["alice","bob"] }
{ "type": "message",     "room": "general", "username": "alice", "text": "Hello!", "timestamp": 1711094400000 }
{ "type": "user_joined", "room": "general", "username": "alice" }
{ "type": "user_left",   "room": "general", "username": "alice" }
{ "type": "error",       "message": "Room not found" }
\`\`\`

## Required Features
1. Multiple rooms (users can be in multiple simultaneously)
2. In-memory message history (last 100 messages per room)
3. Broadcast join/leave events to room members
4. Handle abrupt disconnects (no graceful leave message)
5. 100 concurrent connections without crashing

## Deliverables
- \`server.js\` — WebSocket + HTTP server
- \`index.html\` — browser client demo (proves it works)
- \`README.md\` — how to run`,
    category: 'speed-build',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcomingPlus(1, 18),
    ends_at: addMins(upcomingPlus(1, 18), 75),
    time_limit_minutes: 75,
    max_coins: 300,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 9. Test Suite Generator — day+3
  {
    title: 'Test Suite: Find the Bugs',
    description: 'Write a comprehensive test suite for an 8-endpoint Express API. Three bugs are hidden in the code — your tests must catch all of them.',
    prompt: `Write a complete Jest + Supertest test suite for this Express API. The code has 3 intentional bugs — your tests must catch all of them.

## The API to Test
\`\`\`javascript
// api.js
const express = require('express')
const app = express()
app.use(express.json())

const users = new Map()
let nextId = 1

// POST /users — create user
app.post('/users', (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name and email required' })
  // BUG 1: Inverted logic — ALLOWS duplicate emails, REJECTS unique ones
  if (![...users.values()].find(u => u.email === email)) {
    const user = { id: nextId++, name, email, balance: 0, createdAt: new Date() }
    users.set(user.id, user)
    return res.status(201).json(user)
  }
  return res.status(409).json({ error: 'Email already exists' })
})

app.get('/users/:id', (req, res) => {
  const user = users.get(Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

app.get('/users', (req, res) => res.json([...users.values()]))

app.put('/users/:id', (req, res) => {
  const user = users.get(Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'Not found' })
  const { name, email } = req.body
  if (name) user.name = name
  if (email) user.email = email
  res.json(user)
})

app.delete('/users/:id', (req, res) => {
  const existed = users.delete(Number(req.params.id))
  if (!existed) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
})

app.post('/users/:id/deposit', (req, res) => {
  const user = users.get(Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'Not found' })
  const { amount } = req.body
  if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })
  user.balance += amount
  res.json({ balance: user.balance })
})

app.post('/users/:id/withdraw', (req, res) => {
  const user = users.get(Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'Not found' })
  const { amount } = req.body
  if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })
  // BUG 2: No insufficient funds check — balance can go negative
  user.balance -= amount
  res.json({ balance: user.balance })
})

app.post('/transfer', (req, res) => {
  const { fromId, toId, amount } = req.body
  const from = users.get(Number(fromId))
  const to = users.get(Number(toId))
  if (!from || !to) return res.status(404).json({ error: 'User not found' })
  if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })
  if (from.balance < amount) return res.status(400).json({ error: 'Insufficient funds' })
  from.balance -= amount
  // BUG 3: Self-transfer allowed — same user as from and to doubles their money
  to.balance += amount
  res.json({ from: { id: from.id, balance: from.balance }, to: { id: to.id, balance: to.balance } })
})

module.exports = app
\`\`\`

## Requirements
- Use Jest + Supertest
- Test all 8 endpoints (happy path + error cases)
- Each bug must have a test that FAILS against the buggy code and PASSES against a fixed version
- At least 30 test cases total
- Add a comment above each bug-catching test: \`// BUG: <description>\``,
    category: 'testing',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcomingPlus(2, 17),
    ends_at: addMins(upcomingPlus(2, 17), 60),
    time_limit_minutes: 60,
    max_coins: 250,
    prize_pool: 0,
    has_visual_output: false,
  },

  // 10. Real-Time Dashboard — day+4, VISUAL, 120 min
  {
    title: 'Real-Time Analytics Dashboard',
    description: 'Build a live analytics dashboard that handles a mock WebSocket data feed at 100 events/sec. Any chart library. Must stay smooth under load.',
    prompt: `Build a real-time analytics dashboard connected to a high-frequency WebSocket data feed.

## Mock Data Feed (build this yourself)
Local WebSocket server at \`ws://localhost:4000/feed\` emitting 100 events/sec:
\`\`\`json
{
  "timestamp": 1711094400000,
  "metric": "requests_per_second" | "error_rate" | "p99_latency" | "active_users",
  "value": 142.7,
  "region": "us-east" | "eu-west" | "ap-south"
}
\`\`\`

## Required Dashboard Panels
1. **Line chart** — requests_per_second over last 60 seconds (all 3 regions, different colors)
2. **Status card** — current error_rate with color coding (green <1%, yellow 1-5%, red ≥5%)
3. **Bar chart** — p99_latency by region (last 5-second average)
4. **Counter** — total active_users (rolling 5-second sum)
5. **Connection bar** — WebSocket status, events/sec received, timestamp of last update

## Technical Requirements
- React frontend
- Any chart library (Recharts, Chart.js, D3, Victory, etc.)
- Must handle 100 events/sec smoothly (batch updates, don't re-render on every event)
- Auto-reconnect on WebSocket disconnect
- No UI freezing or dropped frames

## Deliverables
- \`feed-server.js\` — WebSocket mock server (generates 100 events/sec)
- \`App.jsx\` — dashboard component
- \`index.html\` — entry point
- \`README.md\` — how to run both server and client

Screenshots will be taken at 1280×800 and 375×812 after 5 seconds of live data.`,
    category: 'speed-build',
    format: 'solo',
    status: 'upcoming',
    starts_at: upcomingPlus(3, 17),
    ends_at: addMins(upcomingPlus(3, 17), 120),
    time_limit_minutes: 120,
    max_coins: 500,
    prize_pool: 0,
    has_visual_output: true,
  },
];

(async () => {
  const { data, error } = await sb.from('challenges').insert(challenges).select('id, title, status, starts_at, ends_at, has_visual_output');
  if (error) {
    console.error('Insert error:', JSON.stringify(error));
    process.exit(1);
  }
  console.log('Created ' + data.length + ' challenges:');
  data.forEach(c => {
    const visual = c.has_visual_output ? ' [VISUAL]' : '';
    console.log('  [' + c.status + ']' + visual + ' ' + c.title);
    console.log('    ' + c.starts_at.substring(0,16) + ' → ' + c.ends_at.substring(0,16));
  });
})();
