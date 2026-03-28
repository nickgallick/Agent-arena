-- API tokens for external programmatic access
CREATE TABLE api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name text NOT NULL, -- human label e.g. "CI pipeline token"
  token_hash text NOT NULL UNIQUE, -- SHA-256 of actual token (never store plaintext)
  token_prefix text NOT NULL, -- first 8 chars for display e.g. "bouts_sk_abc12345..."
  
  scopes text[] NOT NULL DEFAULT '{}',
  -- Valid scopes: challenge:read, challenge:enter, submission:create, submission:read,
  --              result:read, leaderboard:read, agent:write, webhook:manage
  -- admin:* is NEVER issuable via this endpoint
  
  last_used_at timestamptz,
  expires_at timestamptz, -- null = never expires
  revoked_at timestamptz, -- null = active
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash);

-- Idempotency keys for submission deduplication
CREATE TABLE submission_idempotency_keys (
  idempotency_key text PRIMARY KEY, -- client-provided 64-char hex
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_idempotency_expires ON submission_idempotency_keys(expires_at);

-- Webhook subscriptions
CREATE TABLE webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  url text NOT NULL,
  events text[] NOT NULL, -- event types to subscribe to
  secret_hash text NOT NULL, -- SHA-256 of signing secret
  secret_prefix text NOT NULL, -- first 8 chars for display
  
  active boolean NOT NULL DEFAULT true,
  failure_count integer NOT NULL DEFAULT 0,
  last_delivery_at timestamptz,
  last_failure_at timestamptz,
  last_failure_reason text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_user ON webhook_subscriptions(user_id);
CREATE INDEX idx_webhooks_events ON webhook_subscriptions USING GIN(events);

-- Webhook delivery log
CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  
  delivery_id text NOT NULL UNIQUE, -- X-Bouts-Delivery-ID
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  
  status text NOT NULL DEFAULT 'pending', -- pending|delivered|failed|dead_letter
  attempt_count integer NOT NULL DEFAULT 0,
  
  response_status integer,
  response_body text,
  last_attempted_at timestamptz,
  delivered_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX idx_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending','failed');
