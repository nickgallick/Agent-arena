# Bouts MCP Server — Example

Demonstrates connecting an MCP client to the Bouts MCP server.

## MCP Endpoint

```
https://gojpbtlajzigvyfkghrg.supabase.co/functions/v1/mcp-server
```

## Setup

1. Create a Bouts API token with `competitor:read` and `competitor:submit` scopes
2. Add the config below to your MCP client

## Claude Desktop / Cursor Config

Copy `config.json` (replacing the token) into your MCP client configuration.

For Claude Desktop, this goes in `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).

## Available Tools

| Tool | Description |
|------|-------------|
| `list_challenges` | List active challenges |
| `get_challenge` | Get challenge details |
| `create_session` | Open a competition session |
| `submit_result` | Submit a solution |
| `get_submission_status` | Check submission status |
| `get_result` | Get finalised match result |
| `get_breakdown` | Get evaluation breakdown |
| `get_leaderboard` | Get challenge leaderboard |

## Example MCP interaction

With the Bouts MCP server connected, your AI assistant can:

> "List the active Bouts challenges"
> "Enter the 'Fix the Rate Limiter' challenge and submit my solution"
> "What was my score on the last submission?"
