-- ============================================================
-- Forge Round 2 Fixes — All 7 blocks + deviations
-- ============================================================

-- ============================================================
-- BLOCK 1: pick_job() — make job_type optional (DEFAULT NULL)
-- Caller in process-jobs passes only worker_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.pick_job(worker_id TEXT, job_types TEXT[] DEFAULT NULL)
RETURNS public.job_queue
LANGUAGE plpgsql
AS $$
DECLARE
  picked public.job_queue;
BEGIN
  UPDATE public.job_queue
  SET
    status = 'processing',
    locked_by = worker_id,
    locked_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM public.job_queue
    WHERE status = 'pending'
      AND attempts < max_attempts
      AND (job_types IS NULL OR type = ANY(job_types))
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO picked;
  RETURN picked;
END;
$$;

-- ============================================================
-- FIX: complete_job() — param name mismatch (error_msg vs error_message)
-- Caller passes error_message, function has error_msg
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_job(job_id UUID, success BOOLEAN, error_message TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.job_queue
  SET
    status = CASE
      WHEN success THEN 'completed'
      WHEN attempts >= max_attempts THEN 'dead'
      ELSE 'failed'
    END,
    completed_at = CASE WHEN success THEN NOW() ELSE NULL END,
    error = error_message,
    locked_by = NULL,
    locked_at = NULL,
    updated_at = NOW()
  WHERE id = job_id;
END;
$$;

-- ============================================================
-- BLOCK 3 + 4: update_agent_elo() — accept p_total_entries instead of p_is_win + advisory lock
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_agent_elo(
  p_agent_id UUID,
  p_weight_class_id TEXT,
  p_new_rating REAL,
  p_new_rd REAL,
  p_new_volatility REAL,
  p_placement INTEGER,
  p_total_entries INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  is_win BOOLEAN;
BEGIN
  -- BLOCK 4: Advisory lock for concurrent ELO safety
  PERFORM pg_advisory_xact_lock(hashtext(p_agent_id::text || p_weight_class_id::text));

  is_win := p_placement = 1;

  INSERT INTO public.agent_ratings (
    agent_id, weight_class_id, rating, rating_deviation, volatility,
    wins, losses, challenges_entered, best_placement, current_streak, last_rated_at
  )
  VALUES (
    p_agent_id, p_weight_class_id, p_new_rating, p_new_rd, p_new_volatility,
    CASE WHEN is_win THEN 1 ELSE 0 END,
    CASE WHEN NOT is_win THEN 1 ELSE 0 END,
    1, p_placement,
    CASE WHEN is_win THEN 1 ELSE -1 END,
    NOW()
  )
  ON CONFLICT (agent_id, weight_class_id) DO UPDATE SET
    rating = p_new_rating,
    rating_deviation = p_new_rd,
    volatility = p_new_volatility,
    wins = agent_ratings.wins + CASE WHEN is_win THEN 1 ELSE 0 END,
    losses = agent_ratings.losses + CASE WHEN NOT is_win THEN 1 ELSE 0 END,
    challenges_entered = agent_ratings.challenges_entered + 1,
    best_placement = LEAST(COALESCE(agent_ratings.best_placement, p_placement), p_placement),
    current_streak = CASE
      WHEN is_win AND agent_ratings.current_streak >= 0 THEN agent_ratings.current_streak + 1
      WHEN is_win THEN 1
      WHEN NOT is_win AND agent_ratings.current_streak <= 0 THEN agent_ratings.current_streak - 1
      ELSE -1
    END,
    last_rated_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================
-- BLOCK 5: arena_wallets table (wallets table is transaction log, not balance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.arena_wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance         BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.arena_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.arena_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.arena_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- BLOCK 2 + 5: credit_wallet() — match caller params + update arena_wallets
-- Caller passes: p_user_id, p_amount, p_type, p_reference_id, p_description
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Ensure wallet exists
  INSERT INTO public.arena_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and update wallet
  SELECT id INTO v_wallet_id
  FROM public.arena_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  UPDATE public.arena_wallets
  SET balance = balance + p_amount,
      lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
      updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Record transaction in wallets log table
  INSERT INTO public.wallets (user_id, amount, reason, reference_id, reference_type)
  VALUES (p_user_id, p_amount, p_type, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- ============================================================
-- BLOCK 6: challenge_prompts table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_prompts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category            TEXT NOT NULL CHECK (category IN ('speed_build', 'deep_research', 'problem_solving')),
  difficulty          TEXT,
  title               TEXT NOT NULL,
  prompt              TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  format              TEXT DEFAULT 'sprint',
  time_limit_minutes  INT DEFAULT 30,
  max_coins           INTEGER NOT NULL DEFAULT 100,
  used_count          INT DEFAULT 0,
  is_used             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.challenge_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenge prompts are viewable by admins"
  ON public.challenge_prompts FOR SELECT
  USING (true);

-- Seed 50 prompts across Speed Build, Deep Research, Problem Solving
INSERT INTO public.challenge_prompts (category, difficulty, title, prompt, description, format, time_limit_minutes, max_coins) VALUES
-- Speed Build (17 prompts)
('speed_build', 'easy', 'REST API in 30 Minutes', 'Build a fully functional REST API with authentication, CRUD for a "tasks" resource, input validation, and proper error responses. Must include at least 5 endpoints.', 'Speed-build a production-ready REST API from scratch.', 'sprint', 30, 100),
('speed_build', 'easy', 'CLI Todo App', 'Build a command-line todo application with add, remove, complete, list, and filter capabilities. Must persist data to disk and handle edge cases gracefully.', 'Build a polished CLI todo manager.', 'sprint', 30, 100),
('speed_build', 'medium', 'Real-time Chat Server', 'Build a WebSocket-based chat server supporting multiple rooms, user nicknames, message history (last 50), and a simple HTML client. Must handle disconnections gracefully.', 'Build a multi-room chat system with WebSockets.', 'sprint', 30, 150),
('speed_build', 'medium', 'URL Shortener Service', 'Build a URL shortener with custom slugs, click tracking, expiration dates, and a simple dashboard showing top links. Include rate limiting.', 'Create a URL shortener with analytics.', 'sprint', 30, 150),
('speed_build', 'medium', 'Markdown Blog Engine', 'Build a static blog engine that reads .md files from a directory, generates HTML pages with syntax highlighting, pagination, tags, and an RSS feed.', 'Ship a markdown-powered blog generator.', 'sprint', 30, 150),
('speed_build', 'hard', 'Job Queue System', 'Build a reliable job queue with priority levels, retry with exponential backoff, dead letter queue, job status tracking, and a monitoring dashboard.', 'Implement a robust background job processor.', 'sprint', 30, 200),
('speed_build', 'easy', 'Password Generator CLI', 'Build a CLI password generator with configurable length, character sets, entropy display, bulk generation, and clipboard copy support.', 'Build a flexible password generation tool.', 'sprint', 30, 100),
('speed_build', 'medium', 'File Sync Tool', 'Build a file synchronization tool that watches a directory for changes and syncs to a target directory, handling conflicts, deletions, and showing a diff summary.', 'Create a local file sync utility.', 'sprint', 30, 150),
('speed_build', 'hard', 'Rate Limiter Library', 'Build a rate limiting library supporting fixed window, sliding window, and token bucket algorithms. Must be thread-safe and include a Redis-compatible backend adapter.', 'Implement production-grade rate limiting.', 'sprint', 30, 200),
('speed_build', 'easy', 'JSON Schema Validator', 'Build a JSON Schema validator supporting type checking, required fields, min/max constraints, pattern matching, and nested object validation with clear error messages.', 'Create a JSON schema validation engine.', 'sprint', 30, 100),
('speed_build', 'medium', 'Git Hooks Manager', 'Build a tool that manages Git hooks across a team: install, configure pre-commit/pre-push hooks, lint staged files, and provide a simple config file format.', 'Build a git hooks management system.', 'sprint', 30, 150),
('speed_build', 'hard', 'Search Engine Index', 'Build an inverted index search engine supporting boolean queries (AND/OR/NOT), fuzzy matching, relevance scoring, and result highlighting. Index at least 1000 documents.', 'Create a text search engine from scratch.', 'sprint', 30, 200),
('speed_build', 'medium', 'OAuth Mock Server', 'Build a mock OAuth 2.0 server for testing that supports authorization code flow, token refresh, PKCE, and configurable user profiles. Must pass standard OAuth test suites.', 'Implement a test-ready OAuth server.', 'sprint', 30, 150),
('speed_build', 'easy', 'Expense Tracker API', 'Build an expense tracking API with categories, recurring expenses, monthly summaries, CSV export, and budget alerts when spending exceeds thresholds.', 'Build an expense management backend.', 'sprint', 30, 100),
('speed_build', 'hard', 'Database Migration Tool', 'Build a database migration tool supporting up/down migrations, transaction wrapping, dry-run mode, migration status tracking, and rollback to any version.', 'Create a zero-dependency DB migration system.', 'sprint', 30, 200),
('speed_build', 'medium', 'Webhook Relay Service', 'Build a webhook relay that receives webhooks, validates signatures, queues for delivery with retry, and provides a dashboard showing delivery status and logs.', 'Build a reliable webhook delivery system.', 'sprint', 30, 150),
('speed_build', 'easy', 'Environment Manager', 'Build a CLI tool that manages .env files across environments (dev/staging/prod), supports variable interpolation, secret masking, and diff between environments.', 'Create an env file management tool.', 'sprint', 30, 100),
-- Deep Research (17 prompts)
('deep_research', 'medium', 'AI Agent Security Landscape', 'Research and document the current threat landscape for autonomous AI agents. Cover prompt injection, data exfiltration, privilege escalation, and tool abuse. Provide mitigation strategies with code examples.', 'Map the security threats facing AI agents today.', 'standard', 60, 200),
('deep_research', 'hard', 'Quantum Error Correction Survey', 'Survey the current state of quantum error correction. Evaluate surface codes, topological qubits, and recent breakthroughs. Assess feasibility of fault-tolerant quantum computing within 10 years.', 'Deep dive into quantum error correction progress.', 'standard', 60, 250),
('deep_research', 'medium', 'WebAssembly Runtime Comparison', 'Compare the top 5 WebAssembly runtimes (Wasmtime, Wasmer, WasmEdge, etc.) across performance, security sandbox quality, language support, and production readiness. Include benchmarks.', 'Evaluate the WASM runtime ecosystem.', 'standard', 60, 200),
('deep_research', 'hard', 'Distributed Consensus Deep Dive', 'Compare Raft, Paxos, and newer consensus protocols (Tendermint, HotStuff). Analyze safety guarantees, liveness, performance under partition, and real-world adoption. Include formal correctness arguments.', 'Analyze distributed consensus algorithms.', 'standard', 60, 250),
('deep_research', 'medium', 'Edge Computing Architecture Patterns', 'Document architectural patterns for edge computing: data synchronization, conflict resolution, offline-first design, and deployment strategies. Include decision framework for edge vs cloud.', 'Map edge computing architecture best practices.', 'standard', 60, 200),
('deep_research', 'easy', 'TypeScript Type System Tricks', 'Document advanced TypeScript type system techniques: template literal types, conditional types, mapped types, and type-level programming. Include practical examples and performance implications.', 'Explore advanced TypeScript type gymnastics.', 'standard', 60, 150),
('deep_research', 'hard', 'Zero-Knowledge Proofs for Web3', 'Research practical ZK-proof systems (SNARKs, STARKs, Bulletproofs). Compare proving time, verification time, proof size, and trust assumptions. Evaluate which are production-ready for web applications.', 'Evaluate ZK-proof systems for practical use.', 'standard', 60, 250),
('deep_research', 'medium', 'Database Scaling Strategies', 'Compare horizontal scaling approaches: sharding strategies, read replicas, CQRS, event sourcing. Analyze trade-offs for different workload patterns with real-world case studies.', 'Deep dive into database scaling patterns.', 'standard', 60, 200),
('deep_research', 'easy', 'Modern CSS Layout Techniques', 'Research and compare CSS Grid, Flexbox, Container Queries, and Subgrid for complex layouts. Include performance analysis, browser support matrix, and migration strategies from legacy layouts.', 'Survey modern CSS layout capabilities.', 'standard', 60, 150),
('deep_research', 'hard', 'LLM Fine-tuning Techniques', 'Compare LLM fine-tuning approaches: LoRA, QLoRA, full fine-tuning, RLHF, DPO. Evaluate cost, quality, catastrophic forgetting risk, and when each is appropriate. Include practical implementation guide.', 'Analyze LLM fine-tuning strategies.', 'standard', 60, 250),
('deep_research', 'medium', 'API Versioning Strategies', 'Research API versioning approaches (URL path, header, query param, content negotiation). Analyze backward compatibility, client migration burden, documentation complexity, and real-world adoption.', 'Compare API versioning strategies in depth.', 'standard', 60, 200),
('deep_research', 'medium', 'Observability Stack Comparison', 'Compare modern observability stacks: OpenTelemetry vs proprietary, Grafana vs Datadog vs Honeycomb. Evaluate cost at scale, query performance, alert quality, and developer experience.', 'Evaluate observability tools and architectures.', 'standard', 60, 200),
('deep_research', 'easy', 'Authentication Protocol Evolution', 'Trace the evolution from sessions to JWTs to passkeys. Analyze security properties, UX trade-offs, implementation complexity, and when each approach is optimal. Include migration playbooks.', 'Survey authentication protocol progression.', 'standard', 60, 150),
('deep_research', 'hard', 'Memory-Safe Systems Languages', 'Compare Rust, Zig, and Carbon for systems programming. Analyze safety guarantees, compilation model, ecosystem maturity, learning curve, and suitable domains. Include benchmark suite.', 'Evaluate next-gen systems programming languages.', 'standard', 60, 250),
('deep_research', 'medium', 'Supply Chain Security in OSS', 'Research software supply chain attacks in open source. Document attack vectors (typosquatting, dependency confusion, maintainer compromise), detection tools, and organizational defense strategies.', 'Map open source supply chain threats.', 'standard', 60, 200),
('deep_research', 'medium', 'Serverless Cold Start Optimization', 'Research serverless cold start causes and mitigation across AWS Lambda, Cloudflare Workers, Vercel Edge. Compare provisioned concurrency, bundling strategies, and runtime selection impact.', 'Optimize serverless cold start performance.', 'standard', 60, 200),
('deep_research', 'easy', 'State Management in 2026', 'Compare React state management: useState, useReducer, Zustand, Jotai, Redux Toolkit, TanStack Query. Evaluate for different app scales, developer experience, and bundle size impact.', 'Survey the React state management landscape.', 'standard', 60, 150),
-- Problem Solving (16 prompts)
('problem_solving', 'medium', 'Design a Rate-Limited API Gateway', 'Design and implement an API gateway that handles rate limiting (per-user and global), request routing, authentication, circuit breaking, and request/response transformation. Must handle 10K req/s.', 'Architect a high-performance API gateway.', 'standard', 45, 200),
('problem_solving', 'hard', 'Build a Conflict-Free Replicated Data Type', 'Implement a CRDT library supporting G-Counter, PN-Counter, LWW-Register, and OR-Set. Must handle concurrent updates, network partitions, and eventual convergence. Include formal correctness proof.', 'Implement CRDTs from first principles.', 'standard', 45, 250),
('problem_solving', 'medium', 'Optimize a Slow Query Pipeline', 'Given a dataset of 10M records and 5 slow SQL queries, optimize them to run under 100ms each. Document your analysis process, explain index choices, and show before/after EXPLAIN plans.', 'Fix performance in a sluggish database.', 'standard', 45, 200),
('problem_solving', 'easy', 'Build a Circuit Breaker', 'Implement a circuit breaker pattern with configurable thresholds, half-open state, fallback handlers, and observability hooks. Must be thread-safe and support both sync and async operations.', 'Implement the circuit breaker resilience pattern.', 'sprint', 30, 150),
('problem_solving', 'hard', 'Design a Distributed Lock Service', 'Design and implement a distributed lock service supporting lock acquisition, TTL, fencing tokens, deadlock detection, and graceful failover. Must handle split-brain scenarios correctly.', 'Build a production-grade distributed lock.', 'standard', 45, 250),
('problem_solving', 'medium', 'Implement a Task Scheduler', 'Build a task scheduler supporting cron expressions, one-time tasks, task dependencies (DAG), parallel execution with concurrency limits, and task result caching.', 'Create a flexible task scheduling engine.', 'standard', 45, 200),
('problem_solving', 'easy', 'Build a Caching Layer', 'Implement a caching system with LRU eviction, TTL support, cache warming, write-through and write-behind strategies, and cache invalidation patterns. Include hit/miss metrics.', 'Design a multi-strategy caching system.', 'sprint', 30, 150),
('problem_solving', 'hard', 'Design an Event Sourcing System', 'Implement event sourcing with event store, projections, snapshots, and replay capability. Handle schema evolution, event versioning, and eventual consistency. Must support at-least-once delivery.', 'Build event sourcing infrastructure.', 'standard', 45, 250),
('problem_solving', 'medium', 'Fix a Memory Leak', 'Given a Node.js application with multiple memory leaks (event listener accumulation, closure leaks, buffer mismanagement), identify and fix all leaks. Document your debugging methodology.', 'Hunt down and fix Node.js memory leaks.', 'sprint', 30, 200),
('problem_solving', 'medium', 'Build a Permission System', 'Design and implement a fine-grained permission system supporting RBAC, resource-level permissions, permission inheritance, and efficient permission checking. Must handle 100K+ users.', 'Architect a scalable authorization system.', 'standard', 45, 200),
('problem_solving', 'easy', 'Implement a Connection Pool', 'Build a database connection pool supporting min/max connections, health checks, connection timeout, idle connection reaping, and request queuing when pool is exhausted.', 'Create a robust connection pool manager.', 'sprint', 30, 150),
('problem_solving', 'hard', 'Design a Multi-tenant Data Isolation System', 'Implement multi-tenant data isolation supporting shared database (row-level), schema-per-tenant, and database-per-tenant strategies. Include tenant routing, migration tooling, and performance comparison.', 'Build flexible multi-tenancy infrastructure.', 'standard', 45, 250),
('problem_solving', 'medium', 'Build a Feature Flag Engine', 'Implement a feature flag system supporting boolean flags, percentage rollouts, user targeting, A/B testing, and flag dependencies. Must evaluate flags in <1ms and support 1M+ daily evaluations.', 'Create a production feature flag system.', 'standard', 45, 200),
('problem_solving', 'easy', 'Implement Retry with Backoff', 'Build a retry library supporting exponential backoff, jitter, max retries, circuit breaker integration, retry budgets, and per-error-type retry policies. Must work with both Promises and callbacks.', 'Design a comprehensive retry strategy library.', 'sprint', 30, 150),
('problem_solving', 'hard', 'Design a Real-time Collaboration Engine', 'Implement real-time collaborative editing using Operational Transformation or CRDT. Must handle concurrent edits, cursor positions, undo/redo, and offline editing with sync.', 'Build a Google Docs-style collaboration engine.', 'standard', 45, 250),
('problem_solving', 'medium', 'Build a Log Aggregation Pipeline', 'Design and implement a log aggregation system that collects logs from multiple services, applies structured parsing, supports querying with filters, and provides alerting on error patterns.', 'Create a log collection and analysis pipeline.', 'standard', 45, 200);

-- ============================================================
-- BLOCK 7: challenge_entries.status enum — update CHECK constraint
-- ============================================================
ALTER TABLE public.challenge_entries DROP CONSTRAINT IF EXISTS challenge_entries_status_check;
ALTER TABLE public.challenge_entries ADD CONSTRAINT challenge_entries_status_check
  CHECK (status IN ('entered', 'assigned', 'in_progress', 'submitted', 'judged', 'failed'));

-- Migrate any existing data with old status values
UPDATE public.challenge_entries SET status = 'entered' WHERE status = 'registered';
UPDATE public.challenge_entries SET status = 'judged' WHERE status = 'scored';
UPDATE public.challenge_entries SET status = 'failed' WHERE status = 'disqualified';
-- 'judging' is not in new enum; map to 'in_progress' (closest active status)
UPDATE public.challenge_entries SET status = 'in_progress' WHERE status = 'judging';

-- ============================================================
-- DEVIATION: profiles — add github_username, onboarding_complete, notification_prefs
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"daily_reminder": true, "results_ready": true, "weekly_digest": true}'::jsonb;

-- Add unique constraint on github_username (partial — nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_github_username ON public.profiles(github_username) WHERE github_username IS NOT NULL;

-- ============================================================
-- DEVIATION: agents.api_key_hash — UNIQUE NOT NULL
-- ============================================================
-- First set any NULLs to a placeholder (shouldn't exist in practice)
UPDATE public.agents SET api_key_hash = 'placeholder_' || id::text WHERE api_key_hash IS NULL;
ALTER TABLE public.agents ALTER COLUMN api_key_hash SET NOT NULL;
-- Unique index already exists as idx_agents_api_key from initial schema if not, create:
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_api_key_hash ON public.agents(api_key_hash);

-- ============================================================
-- DEVIATION: challenges — add judging_completed_at
-- ============================================================
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS judging_completed_at TIMESTAMPTZ;

-- ============================================================
-- DEVIATION: Composite leaderboard index
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agent_ratings_leaderboard ON public.agent_ratings(weight_class_id, rating DESC);

-- ============================================================
-- DEVIATION: challenges.prompt_id reference to challenge_prompts
-- ============================================================
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.challenge_prompts(id);

-- ============================================================
-- FIX: agents.last_seen_at → last_ping_at (code uses last_ping_at)
-- ============================================================
ALTER TABLE public.agents RENAME COLUMN last_seen_at TO last_ping_at;
