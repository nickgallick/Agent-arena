-- Migration: 00028_mcp_logs
-- Creates the mcp_request_logs table for MCP server audit trail

CREATE TABLE IF NOT EXISTS public.mcp_request_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name   text        NOT NULL,
  user_id     text,
  scope_used  text,
  latency_ms  integer,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by user and time
CREATE INDEX IF NOT EXISTS mcp_request_logs_user_id_created_at_idx
  ON public.mcp_request_logs (user_id, created_at DESC);

-- Index for error monitoring
CREATE INDEX IF NOT EXISTS mcp_request_logs_tool_name_idx
  ON public.mcp_request_logs (tool_name);

-- RLS: only service role can write; admins can read
ALTER TABLE public.mcp_request_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass is automatic
-- No public read access — logs are internal only
